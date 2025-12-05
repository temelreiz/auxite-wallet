/**
 * Biometric (WebAuthn) API
 * Passkey / Touch ID / Face ID / Yubikey desteği
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import {
  createRegistrationOptions,
  verifyRegistration,
  createAuthenticationOptions,
  verifyAuthentication,
  type StoredAuthenticator,
} from '@/lib/security/webauthn';

// GET: Kayıtlı passkey'leri listele + biometric durumu
export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet adresi gerekli' },
        { status: 401 }
      );
    }

    // Authenticator'ları al
    const authData = await redis.get(`user:passkeys:${walletAddress}`);
    const authenticators: StoredAuthenticator[] = authData ? typeof authData === 'string' ? JSON.parse(authData) : authData as any : [];

    return NextResponse.json({
      enabled: authenticators.length > 0,
      passkeys: authenticators.map(auth => ({
        id: auth.id,
        name: auth.name,
        createdAt: auth.createdAt,
        lastUsed: auth.lastUsed,
        deviceType: auth.credentialDeviceType,
        backedUp: auth.credentialBackedUp,
      })),
      count: authenticators.length,
    });
  } catch (error) {
    console.error('Biometric status error:', error);
    return NextResponse.json(
      { error: 'Biometric durumu alınamadı' },
      { status: 500 }
    );
  }
}

// POST: İşlem tipine göre route et
export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet adresi gerekli' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'register-options':
        return handleRegisterOptions(walletAddress, body);
      case 'register-verify':
        return handleRegisterVerify(walletAddress, body);
      case 'auth-options':
        return handleAuthOptions(walletAddress);
      case 'auth-verify':
        return handleAuthVerify(walletAddress, body);
      case 'rename':
        return handleRename(walletAddress, body);
      default:
        return NextResponse.json(
          { error: 'Geçersiz action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Biometric API error:', error);
    return NextResponse.json(
      { error: 'İşlem başarısız' },
      { status: 500 }
    );
  }
}

// DELETE: Passkey sil
export async function DELETE(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet adresi gerekli' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const passkeyId = searchParams.get('id');

    if (!passkeyId) {
      return NextResponse.json(
        { error: 'Passkey ID gerekli' },
        { status: 400 }
      );
    }

    // Authenticator'ları al
    const authData = await redis.get(`user:passkeys:${walletAddress}`);
    const authenticators: StoredAuthenticator[] = authData ? typeof authData === 'string' ? JSON.parse(authData) : authData as any : [];

    // Passkey'i bul ve sil
    const index = authenticators.findIndex(a => a.id === passkeyId);
    if (index === -1) {
      return NextResponse.json(
        { error: 'Passkey bulunamadı' },
        { status: 404 }
      );
    }

    const removed = authenticators.splice(index, 1)[0];
    await redis.set(`user:passkeys:${walletAddress}`, JSON.stringify(authenticators));

    await logSecurityEvent(walletAddress, 'PASSKEY_REMOVED', {
      passkeyId: removed.id,
      passkeyName: removed.name,
    });

    return NextResponse.json({
      success: true,
      message: 'Passkey silindi',
    });
  } catch (error) {
    console.error('Passkey delete error:', error);
    return NextResponse.json(
      { error: 'Passkey silinemedi' },
      { status: 500 }
    );
  }
}

// === Handler Functions ===

async function handleRegisterOptions(walletAddress: string, body: { userName?: string }) {
  const authData = await redis.get(`user:passkeys:${walletAddress}`);
  const authenticators: StoredAuthenticator[] = authData ? typeof authData === 'string' ? JSON.parse(authData) : authData as any : [];

  const options = await createRegistrationOptions(
    walletAddress,
    body.userName || walletAddress.slice(0, 10),
    authenticators
  );

  // Challenge'ı kaydet (5 dakika geçerli)
  await redis.set(
    `user:passkey:challenge:${walletAddress}`,
    options.challenge,
    'EX',
    300
  );

  return NextResponse.json({
    success: true,
    options,
  });
}

async function handleRegisterVerify(walletAddress: string, body: { response: unknown; name?: string }) {
  // Challenge'ı al
  const challenge = await redis.get(`user:passkey:challenge:${walletAddress}`);
  
  if (!challenge) {
    return NextResponse.json(
      { error: 'Challenge süresi doldu. Lütfen tekrar deneyin.' },
      { status: 400 }
    );
  }

  const result = await verifyRegistration(
    walletAddress,
    body.response as any,
    challenge
  );

  if (!result.verified || !result.authenticator) {
    return NextResponse.json(
      { error: result.error || 'Doğrulama başarısız' },
      { status: 400 }
    );
  }

  // İsim ata
  result.authenticator.name = body.name || 'Passkey';

  // Kaydet
  const authData = await redis.get(`user:passkeys:${walletAddress}`);
  const authenticators: StoredAuthenticator[] = authData ? typeof authData === 'string' ? JSON.parse(authData) : authData as any : [];
  authenticators.push(result.authenticator);
  
  await redis.set(`user:passkeys:${walletAddress}`, JSON.stringify(authenticators));
  await redis.del(`user:passkey:challenge:${walletAddress}`);

  await logSecurityEvent(walletAddress, 'PASSKEY_REGISTERED', {
    passkeyId: result.authenticator.id,
    passkeyName: result.authenticator.name,
  });

  return NextResponse.json({
    success: true,
    message: 'Passkey başarıyla kaydedildi',
    passkey: {
      id: result.authenticator.id,
      name: result.authenticator.name,
    },
  });
}

async function handleAuthOptions(walletAddress: string) {
  const authData = await redis.get(`user:passkeys:${walletAddress}`);
  const authenticators: StoredAuthenticator[] = authData ? typeof authData === 'string' ? JSON.parse(authData) : authData as any : [];

  if (authenticators.length === 0) {
    return NextResponse.json(
      { error: 'Kayıtlı passkey bulunamadı' },
      { status: 400 }
    );
  }

  const options = await createAuthenticationOptions(walletAddress, authenticators);

  await redis.set(
    `user:passkey:challenge:${walletAddress}`,
    options.challenge,
    'EX',
    300
  );

  return NextResponse.json({
    success: true,
    options,
  });
}

async function handleAuthVerify(walletAddress: string, body: { response: unknown }) {
  const challenge = await redis.get(`user:passkey:challenge:${walletAddress}`);
  
  if (!challenge) {
    return NextResponse.json(
      { error: 'Challenge süresi doldu' },
      { status: 400 }
    );
  }

  const authData = await redis.get(`user:passkeys:${walletAddress}`);
  const authenticators: StoredAuthenticator[] = authData ? typeof authData === 'string' ? JSON.parse(authData) : authData as any : [];

  const result = await verifyAuthentication(
    walletAddress,
    body.response as any,
    authenticators,
    challenge
  );

  if (!result.verified || !result.authenticator) {
    return NextResponse.json(
      { error: result.error || 'Kimlik doğrulama başarısız' },
      { status: 400 }
    );
  }

  // Counter güncelle
  if (result.newCounter !== undefined) {
    const auth = authenticators.find(a => a.id === result.authenticator!.id);
    if (auth) {
      auth.counter = result.newCounter;
      auth.lastUsed = new Date().toISOString();
      await redis.set(`user:passkeys:${walletAddress}`, JSON.stringify(authenticators));
    }
  }

  await redis.del(`user:passkey:challenge:${walletAddress}`);

  // Verification token oluştur
  const verificationToken = crypto.randomUUID();
  await redis.set(
    `user:biometric:verified:${walletAddress}`,
    verificationToken,
    'EX',
    300
  );

  return NextResponse.json({
    success: true,
    verified: true,
    verificationToken,
    passkeyUsed: result.authenticator.name,
  });
}

async function handleRename(walletAddress: string, body: { passkeyId: string; newName: string }) {
  const { passkeyId, newName } = body;

  if (!passkeyId || !newName) {
    return NextResponse.json(
      { error: 'Passkey ID ve yeni isim gerekli' },
      { status: 400 }
    );
  }

  const authData = await redis.get(`user:passkeys:${walletAddress}`);
  const authenticators: StoredAuthenticator[] = authData ? typeof authData === 'string' ? JSON.parse(authData) : authData as any : [];

  const auth = authenticators.find(a => a.id === passkeyId);
  if (!auth) {
    return NextResponse.json(
      { error: 'Passkey bulunamadı' },
      { status: 404 }
    );
  }

  auth.name = newName.slice(0, 50); // Max 50 karakter
  await redis.set(`user:passkeys:${walletAddress}`, JSON.stringify(authenticators));

  return NextResponse.json({
    success: true,
    message: 'Passkey ismi güncellendi',
  });
}

// Security event loglama
async function logSecurityEvent(
  walletAddress: string,
  event: string,
  details: Record<string, unknown>
) {
  const logEntry = {
    event,
    walletAddress,
    details,
    timestamp: new Date().toISOString(),
  };

  await redis.lpush(
    `user:security:logs:${walletAddress}`,
    JSON.stringify(logEntry)
  );
  await redis.ltrim(`user:security:logs:${walletAddress}`, 0, 99);
}
