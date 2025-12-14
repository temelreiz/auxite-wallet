/**
 * Recurring Buy (DCA) API
 * GET: Planları listele
 * POST: Yeni plan oluştur
 * DELETE: Plan sil
 * PATCH: Plan güncelle (pause/resume)
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import crypto from 'crypto';

interface RecurringBuy {
  id: string;
  walletAddress: string;
  token: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  paymentSource: 'usd_balance' | 'usdt_balance' | 'eth_balance' | 'btc_balance' | 'xrp_balance' | 'sol_balance';
  dayOfWeek?: number;
  dayOfMonth?: number;
  hour: number;
  autoStake?: boolean;
  stakeDuration?: 3 | 6 | 12;
  createdAt: string;
  stats: {
    totalPurchased: number;
    totalSpent: number;
    averagePrice: number;
    executionCount: number;
    nextExecutionAt?: string;
  };
}

function generateId(): string {
  return 'dca_' + Date.now() + '_' + crypto.randomBytes(6).toString('hex');
}

function calculateNextExecution(plan: RecurringBuy): string {
  const now = new Date();
  const next = new Date();
  next.setHours(plan.hour, 0, 0, 0);

  switch (plan.frequency) {
    case 'daily':
      if (next <= now) next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + ((7 + (plan.dayOfWeek || 1) - next.getDay()) % 7 || 7));
      if (next <= now) next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + ((7 + (plan.dayOfWeek || 1) - next.getDay()) % 7 || 7));
      if (next <= now) next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setDate(plan.dayOfMonth || 1);
      if (next <= now) next.setMonth(next.getMonth() + 1);
      break;
  }

  return next.toISOString();
}

// GET - Planları listele
export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet adresi gerekli' }, { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    const status = searchParams.get('status');

    const key = 'recurring-buy:' + walletAddress.toLowerCase();
    const plansData = await redis.get(key);
    let plans: RecurringBuy[] = plansData
      ? (typeof plansData === 'string' ? JSON.parse(plansData) : plansData)
      : [];

    // Status filtresi
    if (status && status !== 'all') {
      plans = plans.filter(p => p.status === status);
    }

    // Sıralama (en yeni önce)
    plans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      plans,
      total: plans.length,
      active: plans.filter(p => p.status === 'active').length,
    });

  } catch (error) {
    console.error('Get recurring-buy error:', error);
    return NextResponse.json({ error: 'Planlar alınamadı' }, { status: 500 });
  }
}

// POST - Yeni plan oluştur
export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet adresi gerekli' }, { status: 401 });
    }

    const body = await request.json();
    const { token, amount, frequency, paymentSource, dayOfWeek, dayOfMonth, hour, autoStake, stakeDuration } = body;

    // Validasyon
    if (!token || !amount || !frequency || !paymentSource) {
      return NextResponse.json({ error: 'Token, miktar, sıklık ve ödeme kaynağı gerekli' }, { status: 400 });
    }

    if (amount < 10) {
      return NextResponse.json({ error: 'Minimum miktar 10 USD' }, { status: 400 });
    }

    const validTokens = ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'];
    if (!validTokens.includes(token.toUpperCase())) {
      return NextResponse.json({ error: 'Geçersiz token' }, { status: 400 });
    }

    // Mevcut planları al
    const key = 'recurring-buy:' + walletAddress.toLowerCase();
    const plansData = await redis.get(key);
    const plans: RecurringBuy[] = plansData
      ? (typeof plansData === 'string' ? JSON.parse(plansData) : plansData)
      : [];

    // Maksimum 10 aktif plan kontrolü
    const activeCount = plans.filter(p => p.status === 'active').length;
    if (activeCount >= 10) {
      return NextResponse.json({ error: 'Maksimum 10 aktif plan oluşturabilirsiniz' }, { status: 400 });
    }

    // Yeni plan oluştur
    const newPlan: RecurringBuy = {
      id: generateId(),
      walletAddress: walletAddress.toLowerCase(),
      token: token.toUpperCase(),
      amount,
      frequency,
      status: 'active',
      paymentSource,
      dayOfWeek: frequency === 'weekly' || frequency === 'biweekly' ? (dayOfWeek || 1) : undefined,
      dayOfMonth: frequency === 'monthly' ? (dayOfMonth || 1) : undefined,
      hour: hour || 9,
      autoStake: autoStake || false,
      stakeDuration: autoStake ? (stakeDuration || 6) : undefined,
      createdAt: new Date().toISOString(),
      stats: {
        totalPurchased: 0,
        totalSpent: 0,
        averagePrice: 0,
        executionCount: 0,
        nextExecutionAt: '',
      },
    };

    newPlan.stats.nextExecutionAt = calculateNextExecution(newPlan);

    plans.push(newPlan);
    await redis.set(key, JSON.stringify(plans));

    // Aktif wallet listesine ekle
    const activeWalletsData = await redis.get("dca:active-wallets");
    const activeWallets: string[] = activeWalletsData ? (typeof activeWalletsData === "string" ? JSON.parse(activeWalletsData) : activeWalletsData) : [];
    if (!activeWallets.includes(walletAddress.toLowerCase())) {
      activeWallets.push(walletAddress.toLowerCase());
      await redis.set("dca:active-wallets", JSON.stringify(activeWallets));
    }

    return NextResponse.json({
      success: true,
      message: 'Otomatik alım planı oluşturuldu',
      plan: newPlan,
    });

  } catch (error) {
    console.error('Create recurring-buy error:', error);
    return NextResponse.json({ error: 'Plan oluşturulamadı' }, { status: 500 });
  }
}

// DELETE - Plan sil
export async function DELETE(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet adresi gerekli' }, { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    const planId = searchParams.get('id');

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID gerekli' }, { status: 400 });
    }

    const key = 'recurring-buy:' + walletAddress.toLowerCase();
    const plansData = await redis.get(key);
    let plans: RecurringBuy[] = plansData
      ? (typeof plansData === 'string' ? JSON.parse(plansData) : plansData)
      : [];

    const index = plans.findIndex(p => p.id === planId);
    if (index === -1) {
      return NextResponse.json({ error: 'Plan bulunamadı' }, { status: 404 });
    }

    // Global listeden çıkar

    plans.splice(index, 1);
    await redis.set(key, JSON.stringify(plans));

    return NextResponse.json({
      success: true,
      message: 'Plan silindi',
    });

  } catch (error) {
    console.error('Delete recurring-buy error:', error);
    return NextResponse.json({ error: 'Plan silinemedi' }, { status: 500 });
  }
}

// PATCH - Plan güncelle (pause/resume)
export async function PATCH(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet adresi gerekli' }, { status: 401 });
    }

    const body = await request.json();
    const { planId, action } = body;

    if (!planId || !action) {
      return NextResponse.json({ error: 'Plan ID ve action gerekli' }, { status: 400 });
    }

    const key = 'recurring-buy:' + walletAddress.toLowerCase();
    const plansData = await redis.get(key);
    let plans: RecurringBuy[] = plansData
      ? (typeof plansData === 'string' ? JSON.parse(plansData) : plansData)
      : [];

    const index = plans.findIndex(p => p.id === planId);
    if (index === -1) {
      return NextResponse.json({ error: 'Plan bulunamadı' }, { status: 404 });
    }

    switch (action) {
      case 'pause':
        plans[index].status = 'paused';
        break;
      case 'resume':
        plans[index].status = 'active';
        plans[index].stats.nextExecutionAt = calculateNextExecution(plans[index]);
        break;
      case 'cancel':
        plans[index].status = 'cancelled';
        break;
      default:
        return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 });
    }

    await redis.set(key, JSON.stringify(plans));

    return NextResponse.json({
      success: true,
      message: 'Plan güncellendi',
      plan: plans[index],
    });

  } catch (error) {
    console.error('Update recurring-buy error:', error);
    return NextResponse.json({ error: 'Plan güncellenemedi' }, { status: 500 });
  }
}
