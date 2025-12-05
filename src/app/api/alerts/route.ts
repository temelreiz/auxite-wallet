/**
 * Price Alert API
 * GET: Uyarıları listele
 * POST: Yeni uyarı oluştur
 * DELETE: Uyarı sil
 * PATCH: Uyarı güncelle
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import {
  createAlert,
  checkExpiration,
  type PriceAlert,
  type CreateAlertParams,
} from '@/lib/price-alert';

// GET: Uyarıları listele
export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet adresi gerekli' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // active, triggered, all
    const token = searchParams.get('token');

    // Kullanıcının alertlerini al
    const alertsData = await redis.get(`alerts:${walletAddress}`);
    let alerts: PriceAlert[] = alertsData 
      ? (typeof alertsData === 'string' ? JSON.parse(alertsData) : alertsData)
      : [];

    // Süre kontrolü yap
    alerts = alerts.map(checkExpiration);
    await redis.set(`alerts:${walletAddress}`, JSON.stringify(alerts));

    // Filtrele
    if (status && status !== 'all') {
      alerts = alerts.filter(a => a.status === status);
    }
    if (token) {
      alerts = alerts.filter(a => a.token === token.toUpperCase());
    }

    // Tarihe göre sırala (en yeni önce)
    alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      alerts,
      total: alerts.length,
      active: alerts.filter(a => a.status === 'active').length,
    });

  } catch (error) {
    console.error('Get alerts error:', error);
    return NextResponse.json({ error: 'Uyarılar alınamadı' }, { status: 500 });
  }
}

// POST: Yeni uyarı oluştur
export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet adresi gerekli' }, { status: 401 });
    }

    const body = await request.json();
    const { token, targetPrice, direction, expiresInDays, repeat } = body;

    // Validasyon
    if (!token || !targetPrice || !direction) {
      return NextResponse.json({ error: 'Token, hedef fiyat ve yön gerekli' }, { status: 400 });
    }

    if (direction !== 'above' && direction !== 'below') {
      return NextResponse.json({ error: 'Geçersiz yön (above/below)' }, { status: 400 });
    }

    if (targetPrice <= 0) {
      return NextResponse.json({ error: 'Hedef fiyat pozitif olmalı' }, { status: 400 });
    }

    // Mevcut alertleri al
    const alertsData = await redis.get(`alerts:${walletAddress}`);
    const alerts: PriceAlert[] = alertsData 
      ? (typeof alertsData === 'string' ? JSON.parse(alertsData) : alertsData)
      : [];

    // Maksimum 20 aktif alert kontrolü
    const activeCount = alerts.filter(a => a.status === 'active').length;
    if (activeCount >= 20) {
      return NextResponse.json({ 
        error: 'Maksimum 20 aktif uyarı oluşturabilirsiniz' 
      }, { status: 400 });
    }

    // Aynı token/yön/fiyat için mevcut alert var mı?
    const duplicate = alerts.find(a => 
      a.status === 'active' &&
      a.token === token.toUpperCase() &&
      a.direction === direction &&
      Math.abs(a.targetPrice - targetPrice) < 0.01
    );

    if (duplicate) {
      return NextResponse.json({ 
        error: 'Bu fiyat için zaten bir uyarınız var' 
      }, { status: 400 });
    }

    // Yeni alert oluştur
    const newAlert = createAlert({
      walletAddress,
      token,
      targetPrice,
      direction,
      expiresInDays: expiresInDays || 30,
      repeat: repeat || false,
    });

    alerts.push(newAlert);
    await redis.set(`alerts:${walletAddress}`, JSON.stringify(alerts));

    return NextResponse.json({
      success: true,
      message: 'Fiyat uyarısı oluşturuldu',
      alert: newAlert,
    });

  } catch (error) {
    console.error('Create alert error:', error);
    return NextResponse.json({ error: 'Uyarı oluşturulamadı' }, { status: 500 });
  }
}

// DELETE: Uyarı sil
export async function DELETE(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet adresi gerekli' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('id');

    if (!alertId) {
      return NextResponse.json({ error: 'Alert ID gerekli' }, { status: 400 });
    }

    const alertsData = await redis.get(`alerts:${walletAddress}`);
    let alerts: PriceAlert[] = alertsData 
      ? (typeof alertsData === 'string' ? JSON.parse(alertsData) : alertsData)
      : [];

    const index = alerts.findIndex(a => a.id === alertId);
    if (index === -1) {
      return NextResponse.json({ error: 'Uyarı bulunamadı' }, { status: 404 });
    }

    alerts.splice(index, 1);
    await redis.set(`alerts:${walletAddress}`, JSON.stringify(alerts));

    return NextResponse.json({
      success: true,
      message: 'Uyarı silindi',
    });

  } catch (error) {
    console.error('Delete alert error:', error);
    return NextResponse.json({ error: 'Uyarı silinemedi' }, { status: 500 });
  }
}

// PATCH: Uyarı güncelle (iptal et veya yeniden aktifle)
export async function PATCH(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet adresi gerekli' }, { status: 401 });
    }

    const body = await request.json();
    const { alertId, action, targetPrice, repeat } = body;

    if (!alertId || !action) {
      return NextResponse.json({ error: 'Alert ID ve action gerekli' }, { status: 400 });
    }

    const alertsData = await redis.get(`alerts:${walletAddress}`);
    let alerts: PriceAlert[] = alertsData 
      ? (typeof alertsData === 'string' ? JSON.parse(alertsData) : alertsData)
      : [];

    const index = alerts.findIndex(a => a.id === alertId);
    if (index === -1) {
      return NextResponse.json({ error: 'Uyarı bulunamadı' }, { status: 404 });
    }

    switch (action) {
      case 'cancel':
        alerts[index].status = 'cancelled';
        break;
      case 'reactivate':
        if (alerts[index].status !== 'active') {
          alerts[index].status = 'active';
          alerts[index].triggeredAt = undefined;
          alerts[index].notificationSent = false;
        }
        break;
      case 'update':
        if (targetPrice) alerts[index].targetPrice = targetPrice;
        if (repeat !== undefined) alerts[index].repeat = repeat;
        break;
      default:
        return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 });
    }

    await redis.set(`alerts:${walletAddress}`, JSON.stringify(alerts));

    return NextResponse.json({
      success: true,
      message: 'Uyarı güncellendi',
      alert: alerts[index],
    });

  } catch (error) {
    console.error('Update alert error:', error);
    return NextResponse.json({ error: 'Uyarı güncellenemedi' }, { status: 500 });
  }
}
