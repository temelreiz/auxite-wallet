/**
 * TOTP (Time-based One-Time Password) Utility Functions
 * Google Authenticator / Authy uyumlu 2FA
 */

import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import crypto from 'crypto';

// TOTP ayarları
authenticator.options = {
  digits: 6,
  step: 30, // 30 saniye
  window: 1, // 1 adım tolerans (30 saniye önceki/sonraki kod da geçerli)
};

/**
 * Yeni TOTP secret oluştur
 */
export function generateSecret(): string {
  return authenticator.generateSecret(20); // 20 byte = 32 karakter base32
}

/**
 * TOTP kodunu doğrula
 */
export function verifyToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

/**
 * Mevcut TOTP kodunu hesapla (test için)
 */
export function generateToken(secret: string): string {
  return authenticator.generate(secret);
}

/**
 * QR kod için otpauth URL oluştur
 */
export function generateOtpAuthUrl(
  secret: string, 
  email: string, 
  issuer: string = 'Auxite Wallet'
): string {
  return authenticator.keyuri(email, issuer, secret);
}

/**
 * QR kod data URL oluştur (base64 image)
 */
export async function generateQRCode(otpauthUrl: string): Promise<string> {
  try {
    return await QRCode.toDataURL(otpauthUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw new Error('QR kod oluşturulamadı');
  }
}

/**
 * Backup codes oluştur (8 adet, 8 haneli)
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // 8 haneli rastgele kod
    const code = crypto.randomInt(10000000, 99999999).toString();
    codes.push(code);
  }
  return codes;
}

/**
 * Backup code'u hash'le (güvenli depolama için)
 */
export function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Backup code doğrula
 */
export function verifyBackupCode(inputCode: string, hashedCodes: string[]): number {
  const inputHash = hashBackupCode(inputCode);
  const index = hashedCodes.findIndex(hash => hash === inputHash);
  return index; // -1 if not found, otherwise index
}

/**
 * Secret'ı şifrele (opsiyonel ekstra güvenlik)
 */
export function encryptSecret(secret: string, encryptionKey: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Secret'ı çöz
 */
export function decryptSecret(encryptedData: string, encryptionKey: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * 2FA durumunu kontrol et
 */
export interface TwoFactorStatus {
  enabled: boolean;
  enabledAt?: string;
  backupCodesRemaining?: number;
}

/**
 * 2FA setup data
 */
export interface TwoFactorSetupData {
  secret: string;
  qrCodeDataUrl: string;
  otpauthUrl: string;
  backupCodes: string[];
}

/**
 * Tam 2FA setup işlemi
 */
export async function setupTwoFactor(
  email: string,
  issuer: string = 'Auxite Wallet'
): Promise<TwoFactorSetupData> {
  const secret = generateSecret();
  const otpauthUrl = generateOtpAuthUrl(secret, email, issuer);
  const qrCodeDataUrl = await generateQRCode(otpauthUrl);
  const backupCodes = generateBackupCodes(8);
  
  return {
    secret,
    qrCodeDataUrl,
    otpauthUrl,
    backupCodes,
  };
}
