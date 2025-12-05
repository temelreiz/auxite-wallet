/**
 * Device Fingerprinting Utility
 * Cihaz tanıma ve parmak izi oluşturma
 */

import crypto from 'crypto';
import { UAParser } from 'ua-parser-js';

/**
 * Device bilgisi interface
 */
export interface DeviceInfo {
  id: string;
  fingerprint: string;
  name: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  ip: string;
  location?: {
    city?: string;
    country?: string;
    countryCode?: string;
  };
  trusted: boolean;
  firstSeen: string;
  lastSeen: string;
}

/**
 * Session bilgisi interface
 */
export interface SessionInfo {
  id: string;
  deviceId: string;
  walletAddress: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
  lastActivity: string;
  isActive: boolean;
}

/**
 * User-Agent'tan cihaz bilgisi çıkar
 */
export function parseUserAgent(userAgent: string): {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  deviceName: string;
} {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  
  const browser = result.browser.name || 'Unknown';
  const browserVersion = result.browser.version || '';
  const os = result.os.name || 'Unknown';
  const osVersion = result.os.version || '';
  
  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'unknown';
  if (result.device.type === 'mobile') {
    deviceType = 'mobile';
  } else if (result.device.type === 'tablet') {
    deviceType = 'tablet';
  } else if (!result.device.type) {
    deviceType = 'desktop';
  }
  
  // Cihaz adı oluştur
  const deviceName = `${browser} on ${os}`;
  
  return {
    browser,
    browserVersion,
    os,
    osVersion,
    deviceType,
    deviceName,
  };
}

/**
 * Cihaz parmak izi oluştur (server-side)
 */
export function generateDeviceFingerprint(
  userAgent: string,
  ip: string,
  acceptLanguage?: string,
  acceptEncoding?: string
): string {
  const data = [
    userAgent,
    ip.split('.').slice(0, 3).join('.'), // Son oktet hariç IP (privacy)
    acceptLanguage || '',
    acceptEncoding || '',
  ].join('|');
  
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

/**
 * Benzersiz device ID oluştur
 */
export function generateDeviceId(): string {
  return `dev_${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * Session ID oluştur
 */
export function generateSessionId(): string {
  return `sess_${crypto.randomBytes(24).toString('hex')}`;
}

/**
 * Session token oluştur (JWT alternatifi)
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

/**
 * Yeni device oluştur
 */
export function createDevice(
  userAgent: string,
  ip: string,
  location?: { city?: string; country?: string; countryCode?: string }
): DeviceInfo {
  const parsed = parseUserAgent(userAgent);
  const fingerprint = generateDeviceFingerprint(userAgent, ip);
  const now = new Date().toISOString();
  
  return {
    id: generateDeviceId(),
    fingerprint,
    name: parsed.deviceName,
    browser: parsed.browser,
    browserVersion: parsed.browserVersion,
    os: parsed.os,
    osVersion: parsed.osVersion,
    deviceType: parsed.deviceType,
    ip,
    location,
    trusted: false,
    firstSeen: now,
    lastSeen: now,
  };
}

/**
 * Yeni session oluştur
 */
export function createSession(
  deviceId: string,
  walletAddress: string,
  ip: string,
  userAgent: string,
  expiresInHours: number = 24
): SessionInfo {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);
  
  return {
    id: generateSessionId(),
    deviceId,
    walletAddress,
    ip,
    userAgent,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    lastActivity: now.toISOString(),
    isActive: true,
  };
}

/**
 * Session süresini kontrol et
 */
export function isSessionExpired(session: SessionInfo): boolean {
  return new Date() > new Date(session.expiresAt);
}

/**
 * Session'ı güncelle (last activity)
 */
export function updateSessionActivity(session: SessionInfo): SessionInfo {
  return {
    ...session,
    lastActivity: new Date().toISOString(),
  };
}

/**
 * İki cihazın aynı olup olmadığını kontrol et
 */
export function isSameDevice(device1: DeviceInfo, device2: DeviceInfo): boolean {
  return device1.fingerprint === device2.fingerprint;
}

/**
 * Cihaz fingerprint'i mevcut cihazla eşleştir
 */
export function matchDevice(
  devices: DeviceInfo[],
  currentFingerprint: string
): DeviceInfo | null {
  return devices.find(d => d.fingerprint === currentFingerprint) || null;
}

/**
 * Güvenlik skoru hesapla (0-100)
 */
export function calculateSecurityScore(
  has2FA: boolean,
  hasBiometric: boolean,
  trustedDeviceCount: number,
  activeSessionCount: number,
  hasBackupCodes: boolean
): number {
  let score = 0;
  
  if (has2FA) score += 40;
  if (hasBiometric) score += 20;
  if (hasBackupCodes) score += 10;
  if (trustedDeviceCount > 0 && trustedDeviceCount <= 3) score += 15;
  if (activeSessionCount <= 2) score += 15;
  
  return Math.min(100, score);
}

/**
 * Şüpheli aktivite kontrolü
 */
export interface SuspiciousActivityCheck {
  isSuspicious: boolean;
  reasons: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export function checkSuspiciousActivity(
  currentDevice: DeviceInfo,
  previousDevices: DeviceInfo[],
  currentIP: string,
  previousIPs: string[]
): SuspiciousActivityCheck {
  const reasons: string[] = [];
  let riskScore = 0;
  
  // Yeni cihaz mı?
  const isNewDevice = !previousDevices.some(d => d.fingerprint === currentDevice.fingerprint);
  if (isNewDevice) {
    reasons.push('Yeni cihazdan giriş');
    riskScore += 2;
  }
  
  // Yeni IP mi?
  const isNewIP = !previousIPs.includes(currentIP);
  if (isNewIP) {
    reasons.push('Yeni IP adresinden giriş');
    riskScore += 1;
  }
  
  // Farklı ülke mi? (Basit kontrol - IP prefix)
  const currentIPPrefix = currentIP.split('.').slice(0, 2).join('.');
  const hasMatchingPrefix = previousIPs.some(ip => 
    ip.split('.').slice(0, 2).join('.') === currentIPPrefix
  );
  if (!hasMatchingPrefix && previousIPs.length > 0) {
    reasons.push('Farklı lokasyondan giriş');
    riskScore += 3;
  }
  
  // Risk seviyesi
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (riskScore >= 4) {
    riskLevel = 'high';
  } else if (riskScore >= 2) {
    riskLevel = 'medium';
  }
  
  return {
    isSuspicious: riskScore >= 2,
    reasons,
    riskLevel,
  };
}
