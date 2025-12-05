/**
 * Recurring Buy API
 * GET: Planları listele
 * POST: Yeni plan oluştur
 * PATCH: Plan güncelle (pause/resume/cancel)
 * DELETE: Plan sil
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import {
  createRecurringBuy,
  calculateNextExecution,
  MIN_AMOUNT,
  MAX_AMOUNT,
  type RecurringBuy,
  type CreateRecurringBuyParams,
} from '@/lib/recurring-buy';

// GET: Planları listele
export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet adresi gerekli' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const plansData = await redis.get(`recurring:${walletAddress}`);
    let plans: RecurringBuy[] = plansData 
      ? (typeof plansData === 'string' ? JSON.parse(plansData) : plansData)
      : [];

    // Status filtresi
    if (status && status !== 'all') {
      plans = plans.filter(p => p.status === status);
    }

    // Tarihe göre sırala
    plans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Toplam istatistikler
    const activePlans = plans.filter(p => p.status === 'active');
    const totalMonthlySpend = activePlans.reduce((sum, p) => {
      const multiplier = {
        daily: 30,
        weekly: 4,
        biweekly: 2,
        monthly: 1,
      };
      return sum + (p.amount * multiplier[p.frequency]);
    }, 0);

    return NextResponse.json({
      plans,
      stats: {
        total: plans.length,
        active: activePlans.length,
        totalMonthlySpend,
        totalInvested: plans.reduce((sum, p) => sum + p.stats.totalSpent, 0),
      },
    });

  } catch (error) {
    console.error('Recurring GET error:', error);
    return NextResponse.json({ error: 'Planlar alınamadı' }, { status: 500 });
  }
}

// POST: Yeni plan oluştur
export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet adresi gerekli' }, { status: 401 });
    }

    const body = await request.json();
    const { token, amount, frequency, paymentSource, dayOfWeek, dayOfMonth, hour, endDate, maxExecutions, minPrice, maxPrice } = body;

    // Validasyon
    if (!token || !amount || !frequency || !paymentSource) {
      return NextResponse.json({ error: 'Eksik parametreler' }, { status: 400 });
    }

    if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      return NextResponse.json({ 
        error: `Miktar $${MIN_AMOUNT} - $${MAX_AMOUNT} arasında olmalı` 
      }, { status: 400 });
    }

    // Mevcut planları al
    const plansData = await redis.get(`recurring:${walletAddress}`);
    const plans: RecurringBuy[] = plansData 
      ? (typeof plansData === 'string' ? JSON.parse(plansData) : plansData)
      : [];

    // Maksimum 10 aktif plan kontrolü
    const activeCount = plans.filter(p => p.status === 'active').length;
    if (activeCount >= 10) {
      return NextResponse.json({ 
        error: 'Maksimum 10 aktif plan oluşturabilirsiniz' 
      }, { status: 400 });
    }

    // Aynı token/frequency için mevcut plan var mı?
    const duplicate = plans.find(p => 
      p.status === 'active' &&
      p.token === token.toUpperCase() &&
      p.frequency === frequency
    );

    if (duplicate) {
      return NextResponse.json({ 
        error: 'Bu token için aynı sıklıkta zaten bir planınız var' 
      }, { status: 400 });
    }

    // Yeni plan oluştur
    const newPlan = createRecurringBuy({
      walletAddress,
      token,
      amount,
      frequency,
      paymentSource,
      dayOfWeek,
      dayOfMonth,
      hour,
      endDate,
      maxExecutions,
      minPrice,
      maxPrice,
    });

    plans.push(newPlan);
    await redis.set(`recurring:${walletAddress}`, JSON.stringify(plans));

    return NextResponse.json({
      success: true,
      message: 'Otomatik alım planı oluşturuldu',
      plan: newPlan,
    });

  } catch (error) {
    console.error('Recurring POST error:', error);
    return NextResponse.json({ error: 'Plan oluşturulamadı' }, { status: 500 });
  }
}

// PATCH: Plan güncelle
export async function PATCH(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet adresi gerekli' }, { status: 401 });
    }

    const body = await request.json();
    const { planId, action, ...updates } = body;

    if (!planId || !action) {
      return NextResponse.json({ error: 'planId ve action gerekli' }, { status: 400 });
    }

    const plansData = await redis.get(`recurring:${walletAddress}`);
    const plans: RecurringBuy[] = plansData 
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
        if (plans[index].status !== 'paused') {
          return NextResponse.json({ error: 'Sadece duraklatılmış planlar devam ettirilebilir' }, { status: 400 });
        }
        plans[index].status = 'active';
        plans[index].stats.nextExecutionAt = calculateNextExecution(
          plans[index].frequency,
          plans[index].hour,
          plans[index].dayOfWeek,
          plans[index].dayOfMonth
        ).toISOString();
        break;

      case 'cancel':
        plans[index].status = 'cancelled';
        break;

      case 'update':
        // Miktar, fiyat limitleri güncellenebilir
        if (updates.amount) plans[index].amount = updates.amount;
        if (updates.minPrice !== undefined) plans[index].minPrice = updates.minPrice;
        if (updates.maxPrice !== undefined) plans[index].maxPrice = updates.maxPrice;
        break;

      default:
        return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 });
    }

    plans[index].updatedAt = new Date().toISOString();
    await redis.set(`recurring:${walletAddress}`, JSON.stringify(plans));

    return NextResponse.json({
      success: true,
      message: 'Plan güncellendi',
      plan: plans[index],
    });

  } catch (error) {
    console.error('Recurring PATCH error:', error);
    return NextResponse.json({ error: 'Plan güncellenemedi' }, { status: 500 });
  }
}

// DELETE: Plan sil
export async function DELETE(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet adresi gerekli' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('id');

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID gerekli' }, { status: 400 });
    }

    const plansData = await redis.get(`recurring:${walletAddress}`);
    let plans: RecurringBuy[] = plansData 
      ? (typeof plansData === 'string' ? JSON.parse(plansData) : plansData)
      : [];

    const index = plans.findIndex(p => p.id === planId);
    if (index === -1) {
      return NextResponse.json({ error: 'Plan bulunamadı' }, { status: 404 });
    }

    plans.splice(index, 1);
    await redis.set(`recurring:${walletAddress}`, JSON.stringify(plans));

    return NextResponse.json({
      success: true,
      message: 'Plan silindi',
    });

  } catch (error) {
    console.error('Recurring DELETE error:', error);
    return NextResponse.json({ error: 'Plan silinemedi' }, { status: 500 });
  }
}
