/**
 * Physical Delivery API
 * Fiziksel metal teslimat talepleri
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import crypto from 'crypto';

interface DeliveryAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  country: string;
  city: string;
  district: string;
  addressLine1: string;
  addressLine2?: string;
  postalCode: string;
  isDefault: boolean;
}

interface DeliveryRequest {
  id: string;
  walletAddress: string;
  token: string;
  amount: number;
  address: DeliveryAddress;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  trackingNumber?: string;
  estimatedDelivery?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  history: Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>;
}

// Minimum teslimat limitleri (gram)
const MIN_DELIVERY_AMOUNTS: Record<string, number> = {
  AUXG: 80,    // 80 gram altin
  AUXS: 5000,   // 5000 gram gumus
  AUXPT: 200,   // 200 gram platin
  AUXPD: 200,   // 200 gram paladyum
};

// Teslimat ucretleri (USD)
const DELIVERY_FEES: Record<string, number> = {
  AUXG: 50,
  AUXS: 75,
  AUXPT: 50,
  AUXPD: 50,
};

function generateId(): string {
  return 'DEL-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

// GET - Teslimat taleplerini ve adresleri listele
export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet adresi gerekli' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'requests' | 'addresses' | 'limits'

    if (type === 'addresses') {
      const addressesData = await redis.get('delivery-addresses:' + walletAddress.toLowerCase());
      const addresses: DeliveryAddress[] = addressesData
        ? (typeof addressesData === 'string' ? JSON.parse(addressesData) : addressesData)
        : [];
      return NextResponse.json({ addresses });
    }

    if (type === 'limits') {
      return NextResponse.json({
        minAmounts: MIN_DELIVERY_AMOUNTS,
        fees: DELIVERY_FEES,
      });
    }

    // Default: teslimat talepleri
    const requestsData = await redis.get('delivery-requests:' + walletAddress.toLowerCase());
    const requests: DeliveryRequest[] = requestsData
      ? (typeof requestsData === 'string' ? JSON.parse(requestsData) : requestsData)
      : [];

    requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ requests });

  } catch (error) {
    console.error('Get delivery error:', error);
    return NextResponse.json({ error: 'Veriler alinamadi' }, { status: 500 });
  }
}

// POST - Yeni teslimat talebi veya adres ekle
export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet adresi gerekli' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // Adres ekleme
    if (action === 'add_address') {
      const { label, fullName, phone, country, city, district, addressLine1, addressLine2, postalCode, isDefault } = body;

      if (!label || !fullName || !phone || !country || !city || !addressLine1 || !postalCode) {
        return NextResponse.json({ error: 'Tum zorunlu alanlar gerekli' }, { status: 400 });
      }

      const addressesData = await redis.get('delivery-addresses:' + walletAddress.toLowerCase());
      const addresses: DeliveryAddress[] = addressesData
        ? (typeof addressesData === 'string' ? JSON.parse(addressesData) : addressesData)
        : [];

      // Maksimum 5 adres
      if (addresses.length >= 5) {
        return NextResponse.json({ error: 'Maksimum 5 adres ekleyebilirsiniz' }, { status: 400 });
      }

      const newAddress: DeliveryAddress = {
        id: 'addr_' + Date.now(),
        label,
        fullName,
        phone,
        country,
        city,
        district: district || '',
        addressLine1,
        addressLine2,
        postalCode,
        isDefault: isDefault || addresses.length === 0,
      };

      // Eger yeni adres default ise, digerleri default degil
      if (newAddress.isDefault) {
        addresses.forEach(a => a.isDefault = false);
      }

      addresses.push(newAddress);
      await redis.set('delivery-addresses:' + walletAddress.toLowerCase(), JSON.stringify(addresses));

      return NextResponse.json({ success: true, message: 'Adres eklendi', address: newAddress });
    }

    // Teslimat talebi
    const { token, amount, addressId } = body;

    if (!token || !amount || !addressId) {
      return NextResponse.json({ error: 'Token, miktar ve adres gerekli' }, { status: 400 });
    }

    // Token kontrolu
    const validTokens = ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'];
    if (!validTokens.includes(token.toUpperCase())) {
      return NextResponse.json({ error: 'Gecersiz token' }, { status: 400 });
    }

    // Minimum miktar kontrolu
    const minAmount = MIN_DELIVERY_AMOUNTS[token.toUpperCase()];
    if (amount < minAmount) {
      return NextResponse.json({ 
        error: 'Minimum teslimat miktari ' + minAmount + ' gram', 
        minAmount 
      }, { status: 400 });
    }

    // Bakiye kontrolu
    const balances = await redis.hgetall('balances:' + walletAddress.toLowerCase());
    const tokenBalance = parseFloat(balances?.[token.toLowerCase()] || '0');
    
    if (tokenBalance < amount) {
      return NextResponse.json({ 
        error: 'Yetersiz bakiye. Mevcut: ' + tokenBalance.toFixed(4) + 'g', 
        available: tokenBalance 
      }, { status: 400 });
    }

    // Adres kontrolu
    const addressesData = await redis.get('delivery-addresses:' + walletAddress.toLowerCase());
    const addresses: DeliveryAddress[] = addressesData
      ? (typeof addressesData === 'string' ? JSON.parse(addressesData) : addressesData)
      : [];

    const address = addresses.find(a => a.id === addressId);
    if (!address) {
      return NextResponse.json({ error: 'Adres bulunamadi' }, { status: 404 });
    }

    // Bakiyeden dus
    const newBalance = tokenBalance - amount;
    await redis.hset('balances:' + walletAddress.toLowerCase(), { [token.toLowerCase()]: newBalance.toString() });

    // Teslimat talebi olustur
    const requestsData = await redis.get('delivery-requests:' + walletAddress.toLowerCase());
    const requests: DeliveryRequest[] = requestsData
      ? (typeof requestsData === 'string' ? JSON.parse(requestsData) : requestsData)
      : [];

    const newRequest: DeliveryRequest = {
      id: generateId(),
      walletAddress: walletAddress.toLowerCase(),
      token: token.toUpperCase(),
      amount,
      address,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [
        { status: 'pending', timestamp: new Date().toISOString(), note: 'Talep olusturuldu' }
      ],
    };

    requests.push(newRequest);
    await redis.set('delivery-requests:' + walletAddress.toLowerCase(), JSON.stringify(requests));

    // Admin icin global listeye ekle
    const allRequestsData = await redis.get('delivery-requests:all');
    const allRequests: string[] = allRequestsData
      ? (typeof allRequestsData === 'string' ? JSON.parse(allRequestsData) : allRequestsData)
      : [];
    allRequests.push(walletAddress.toLowerCase() + ':' + newRequest.id);
    await redis.set('delivery-requests:all', JSON.stringify(allRequests));

    return NextResponse.json({
      success: true,
      message: 'Teslimat talebi olusturuldu',
      request: newRequest,
      fee: DELIVERY_FEES[token.toUpperCase()],
    });

  } catch (error) {
    console.error('Create delivery error:', error);
    return NextResponse.json({ error: 'Talep olusturulamadi' }, { status: 500 });
  }
}

// DELETE - Adres sil veya talebi iptal et
export async function DELETE(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet adresi gerekli' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });
    }

    if (type === 'address') {
      const addressesData = await redis.get('delivery-addresses:' + walletAddress.toLowerCase());
      let addresses: DeliveryAddress[] = addressesData
        ? (typeof addressesData === 'string' ? JSON.parse(addressesData) : addressesData)
        : [];

      const index = addresses.findIndex(a => a.id === id);
      if (index === -1) {
        return NextResponse.json({ error: 'Adres bulunamadi' }, { status: 404 });
      }

      addresses.splice(index, 1);
      await redis.set('delivery-addresses:' + walletAddress.toLowerCase(), JSON.stringify(addresses));

      return NextResponse.json({ success: true, message: 'Adres silindi' });
    }

    // Teslimat talebi iptali
    const requestsData = await redis.get('delivery-requests:' + walletAddress.toLowerCase());
    let requests: DeliveryRequest[] = requestsData
      ? (typeof requestsData === 'string' ? JSON.parse(requestsData) : requestsData)
      : [];

    const index = requests.findIndex(r => r.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Talep bulunamadi' }, { status: 404 });
    }

    const request = requests[index];
    
    // Sadece pending durumda iptal edilebilir
    if (request.status !== 'pending') {
      return NextResponse.json({ error: 'Bu talep iptal edilemez' }, { status: 400 });
    }

    // Bakiyeyi geri ver
    const balances = await redis.hgetall('balances:' + walletAddress.toLowerCase());
    const currentBalance = parseFloat(balances?.[request.token.toLowerCase()] || '0');
    const newBalance = currentBalance + request.amount;
    await redis.hset('balances:' + walletAddress.toLowerCase(), { [request.token.toLowerCase()]: newBalance.toString() });

    // Status guncelle
    requests[index].status = 'cancelled';
    requests[index].updatedAt = new Date().toISOString();
    requests[index].history.push({
      status: 'cancelled',
      timestamp: new Date().toISOString(),
      note: 'Kullanici tarafindan iptal edildi'
    });

    await redis.set('delivery-requests:' + walletAddress.toLowerCase(), JSON.stringify(requests));

    return NextResponse.json({ success: true, message: 'Talep iptal edildi' });

  } catch (error) {
    console.error('Delete delivery error:', error);
    return NextResponse.json({ error: 'Islem basarisiz' }, { status: 500 });
  }
}
