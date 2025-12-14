/**
 * Recurring Stake (Düzenli Biriktir) API
 * Talimat günü: Metal bakiyesi varsa stake, yoksa önce al sonra stake
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import crypto from 'crypto';

interface RecurringStake {
  id: string;
  walletAddress: string;
  token: string; // AUXG, AUXS, AUXPT, AUXPD
  amount: number; // gram cinsinden
  frequency: 'weekly' | 'biweekly' | 'monthly';
  stakeDuration: 3 | 6 | 12; // ay
  status: 'active' | 'paused' | 'cancelled';
  paymentSource: 'metal_balance' | 'usd_balance' | 'usdt_balance' | 'eth_balance' | 'btc_balance' | 'xrp_balance' | 'sol_balance';
  dayOfWeek?: number;
  dayOfMonth?: number;
  hour: number;
  createdAt: string;
  stats: {
    totalStaked: number;
    totalSpent: number;
    executionCount: number;
    nextExecutionAt?: string;
    lastExecutionAt?: string;
  };
}

function generateId(): string {
  return 'rstake_' + Date.now() + '_' + crypto.randomBytes(6).toString('hex');
}

function calculateNextExecution(plan: RecurringStake): string {
  const now = new Date();
  const next = new Date();
  next.setHours(plan.hour, 0, 0, 0);

  switch (plan.frequency) {
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

    const key = 'recurring-stake:' + walletAddress.toLowerCase();
    const plansData = await redis.get(key);
    let plans: RecurringStake[] = plansData
      ? (typeof plansData === 'string' ? JSON.parse(plansData) : plansData)
      : [];

    plans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Aktif wallet listesine ekle
    const activeWalletsData = await redis.get("stake:active-wallets");
    const activeWallets: string[] = activeWalletsData ? (typeof activeWalletsData === "string" ? JSON.parse(activeWalletsData) : activeWalletsData) : [];
    if (!activeWallets.includes(walletAddress.toLowerCase())) {
      activeWallets.push(walletAddress.toLowerCase());
      await redis.set("stake:active-wallets", JSON.stringify(activeWallets));
    }

    return NextResponse.json({
      plans,
      total: plans.length,
      active: plans.filter(p => p.status === 'active').length,
    });

  } catch (error) {
    console.error('Get recurring-stake error:', error);
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
    const { token, amount, frequency, stakeDuration, paymentSource, dayOfWeek, dayOfMonth, hour } = body;

    // Validasyon
    if (!token || !amount || !frequency || !stakeDuration || !paymentSource) {
      return NextResponse.json({ error: 'Tüm alanlar gerekli' }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'Miktar pozitif olmalı' }, { status: 400 });
    }

    const validTokens = ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'];
    if (!validTokens.includes(token.toUpperCase())) {
      return NextResponse.json({ error: 'Geçersiz token' }, { status: 400 });
    }

    const validDurations = [3, 6, 12];
    if (!validDurations.includes(stakeDuration)) {
      return NextResponse.json({ error: 'Geçersiz süre' }, { status: 400 });
    }

    // Mevcut planları al
    const key = 'recurring-stake:' + walletAddress.toLowerCase();
    const plansData = await redis.get(key);
    const plans: RecurringStake[] = plansData
      ? (typeof plansData === 'string' ? JSON.parse(plansData) : plansData)
      : [];

    // Maksimum 5 aktif plan
    const activeCount = plans.filter(p => p.status === 'active').length;
    if (activeCount >= 5) {
      return NextResponse.json({ error: 'Maksimum 5 aktif plan oluşturabilirsiniz' }, { status: 400 });
    }

    // Yeni plan
    const newPlan: RecurringStake = {
      id: generateId(),
      walletAddress: walletAddress.toLowerCase(),
      token: token.toUpperCase(),
      amount,
      frequency,
      stakeDuration,
      status: 'active',
      paymentSource,
      dayOfWeek: frequency === 'weekly' || frequency === 'biweekly' ? (dayOfWeek || 1) : undefined,
      dayOfMonth: frequency === 'monthly' ? (dayOfMonth || 1) : undefined,
      hour: hour || 9,
      createdAt: new Date().toISOString(),
      stats: {
        totalStaked: 0,
        totalSpent: 0,
        executionCount: 0,
        nextExecutionAt: '',
      },
    };

    newPlan.stats.nextExecutionAt = calculateNextExecution(newPlan);

    plans.push(newPlan);
    await redis.set(key, JSON.stringify(plans));

    // Aktif wallet listesine ekle
    const activeWalletsData = await redis.get("stake:active-wallets");
    const activeWallets: string[] = activeWalletsData ? (typeof activeWalletsData === "string" ? JSON.parse(activeWalletsData) : activeWalletsData) : [];
    if (!activeWallets.includes(walletAddress.toLowerCase())) {
      activeWallets.push(walletAddress.toLowerCase());
      await redis.set("stake:active-wallets", JSON.stringify(activeWallets));
    }

    return NextResponse.json({
      success: true,
      message: 'Düzenli biriktirme planı oluşturuldu',
      plan: newPlan,
    });

  } catch (error) {
    console.error('Create recurring-stake error:', error);
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

    const key = 'recurring-stake:' + walletAddress.toLowerCase();
    const plansData = await redis.get(key);
    let plans: RecurringStake[] = plansData
      ? (typeof plansData === 'string' ? JSON.parse(plansData) : plansData)
      : [];

    const index = plans.findIndex(p => p.id === planId);
    if (index === -1) {
      return NextResponse.json({ error: 'Plan bulunamadı' }, { status: 404 });
    }

    plans.splice(index, 1);
    await redis.set(key, JSON.stringify(plans));

    // Aktif wallet listesine ekle
    const activeWalletsData = await redis.get("stake:active-wallets");
    const activeWallets: string[] = activeWalletsData ? (typeof activeWalletsData === "string" ? JSON.parse(activeWalletsData) : activeWalletsData) : [];
    if (!activeWallets.includes(walletAddress.toLowerCase())) {
      activeWallets.push(walletAddress.toLowerCase());
      await redis.set("stake:active-wallets", JSON.stringify(activeWallets));
    }

    return NextResponse.json({
      success: true,
      message: 'Plan silindi',
    });

  } catch (error) {
    console.error('Delete recurring-stake error:', error);
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

    const key = 'recurring-stake:' + walletAddress.toLowerCase();
    const plansData = await redis.get(key);
    let plans: RecurringStake[] = plansData
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

    // Aktif wallet listesine ekle
    const activeWalletsData = await redis.get("stake:active-wallets");
    const activeWallets: string[] = activeWalletsData ? (typeof activeWalletsData === "string" ? JSON.parse(activeWalletsData) : activeWalletsData) : [];
    if (!activeWallets.includes(walletAddress.toLowerCase())) {
      activeWallets.push(walletAddress.toLowerCase());
      await redis.set("stake:active-wallets", JSON.stringify(activeWallets));
    }

    return NextResponse.json({
      success: true,
      message: 'Plan güncellendi',
      plan: plans[index],
    });

  } catch (error) {
    console.error('Update recurring-stake error:', error);
    return NextResponse.json({ error: 'Plan güncellenemedi' }, { status: 500 });
  }
}
