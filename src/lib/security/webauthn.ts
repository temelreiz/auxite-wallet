/**
 * WebAuthn (FIDO2) Utility Functions
 * Biometric Authentication: Touch ID, Face ID, Windows Hello, Yubikey
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';

import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorDevice,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/types';

import crypto from 'crypto';

// Config
const RP_NAME = 'Auxite Wallet';
const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost'; // Production: 'auxitewallet.com'
const ORIGIN = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000';

/**
 * Passkey/Authenticator bilgisi
 */
export interface StoredAuthenticator {
  id: string;
  credentialId: string;
  credentialPublicKey: string; // Base64
  counter: number;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  transports?: string[];
  name: string;
  createdAt: string;
  lastUsed?: string;
}

/**
 * Challenge store (geçici, Redis'e taşınacak)
 */
const challengeStore = new Map<string, string>();

/**
 * Challenge oluştur ve sakla
 */
export function createChallenge(walletAddress: string): string {
  const challenge = crypto.randomBytes(32).toString('base64url');
  challengeStore.set(walletAddress, challenge);
  return challenge;
}

/**
 * Challenge'ı al ve sil
 */
export function getAndDeleteChallenge(walletAddress: string): string | undefined {
  const challenge = challengeStore.get(walletAddress);
  if (challenge) {
    challengeStore.delete(walletAddress);
  }
  return challenge;
}

/**
 * Registration options oluştur (Passkey kayıt için)
 */
export async function createRegistrationOptions(
  walletAddress: string,
  userName: string,
  existingAuthenticators: StoredAuthenticator[] = []
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  // Mevcut authenticator'ları exclude et
  const excludeCredentials = existingAuthenticators.map(auth => ({
    id: auth.credentialId,
    type: 'public-key' as const,
    transports: auth.transports as AuthenticatorTransport[] | undefined,
  }));

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode(walletAddress),
    userName: userName || walletAddress.slice(0, 10),
    userDisplayName: userName || `Wallet ${walletAddress.slice(0, 8)}...`,
    attestationType: 'none', // Privacy için
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred', // Biometric veya PIN
      authenticatorAttachment: 'platform', // Sadece cihaz built-in (Touch ID vs)
    },
    supportedAlgorithmIDs: [-7, -257], // ES256, RS256
  });

  // Challenge'ı sakla
  challengeStore.set(walletAddress, options.challenge);

  return options;
}

/**
 * Registration response doğrula
 */
export async function verifyRegistration(
  walletAddress: string,
  response: RegistrationResponseJSON,
  expectedChallenge?: string
): Promise<{
  verified: boolean;
  authenticator?: StoredAuthenticator;
  error?: string;
}> {
  try {
    const challenge = expectedChallenge || getAndDeleteChallenge(walletAddress);
    
    if (!challenge) {
      return { verified: false, error: 'Challenge bulunamadı veya süresi doldu' };
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return { verified: false, error: 'Doğrulama başarısız' };
    }

    const { credentialID, credentialPublicKey, counter, credentialDeviceType, credentialBackedUp } = 
      verification.registrationInfo;

    const authenticator: StoredAuthenticator = {
      id: `auth_${crypto.randomBytes(8).toString('hex')}`,
      credentialId: Buffer.from(credentialID).toString('base64url'),
      credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64'),
      counter,
      credentialDeviceType,
      credentialBackedUp,
      transports: response.response.transports,
      name: 'Passkey', // Kullanıcı sonra değiştirebilir
      createdAt: new Date().toISOString(),
    };

    return { verified: true, authenticator };
  } catch (error) {
    console.error('WebAuthn registration error:', error);
    return { verified: false, error: 'Kayıt doğrulama hatası' };
  }
}

/**
 * Authentication options oluştur (Giriş için)
 */
export async function createAuthenticationOptions(
  walletAddress: string,
  authenticators: StoredAuthenticator[]
): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const allowCredentials = authenticators.map(auth => ({
    id: auth.credentialId,
    type: 'public-key' as const,
    transports: auth.transports as AuthenticatorTransport[] | undefined,
  }));

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials,
    userVerification: 'preferred',
  });

  // Challenge'ı sakla
  challengeStore.set(walletAddress, options.challenge);

  return options;
}

/**
 * Authentication response doğrula
 */
export async function verifyAuthentication(
  walletAddress: string,
  response: AuthenticationResponseJSON,
  authenticators: StoredAuthenticator[],
  expectedChallenge?: string
): Promise<{
  verified: boolean;
  authenticator?: StoredAuthenticator;
  newCounter?: number;
  error?: string;
}> {
  try {
    const challenge = expectedChallenge || getAndDeleteChallenge(walletAddress);
    
    if (!challenge) {
      return { verified: false, error: 'Challenge bulunamadı veya süresi doldu' };
    }

    // Kullanılan authenticator'ı bul
    const credentialId = response.id;
    const authenticator = authenticators.find(
      auth => auth.credentialId === credentialId
    );

    if (!authenticator) {
      return { verified: false, error: 'Authenticator bulunamadı' };
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: Buffer.from(authenticator.credentialId, 'base64url'),
        credentialPublicKey: Buffer.from(authenticator.credentialPublicKey, 'base64'),
        counter: authenticator.counter,
        transports: authenticator.transports as AuthenticatorTransport[] | undefined,
      },
    });

    if (!verification.verified) {
      return { verified: false, error: 'Doğrulama başarısız' };
    }

    return {
      verified: true,
      authenticator,
      newCounter: verification.authenticationInfo.newCounter,
    };
  } catch (error) {
    console.error('WebAuthn authentication error:', error);
    return { verified: false, error: 'Kimlik doğrulama hatası' };
  }
}

/**
 * Biometric desteği var mı kontrol et (client-side için)
 */
export const checkBiometricSupport = `
  async function checkBiometricSupport() {
    if (!window.PublicKeyCredential) {
      return { supported: false, reason: 'WebAuthn desteklenmiyor' };
    }
    
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        return { supported: false, reason: 'Platform authenticator bulunamadı' };
      }
      
      return { supported: true };
    } catch (error) {
      return { supported: false, reason: 'Kontrol hatası' };
    }
  }
`;

/**
 * Authenticator tipini belirle
 */
export function getAuthenticatorType(
  credentialDeviceType: string,
  transports?: string[]
): string {
  if (transports?.includes('internal')) {
    if (credentialDeviceType === 'singleDevice') {
      return 'Platform Authenticator (Touch ID / Face ID)';
    }
    return 'Synced Passkey';
  }
  
  if (transports?.includes('usb') || transports?.includes('nfc')) {
    return 'Security Key (Yubikey vb.)';
  }
  
  return 'Passkey';
}
