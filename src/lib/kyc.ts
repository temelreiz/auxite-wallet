/**
 * KYC (Know Your Customer) Integration
 * Kimlik doğrulama sistemi
 */

import crypto from 'crypto';

// ============================================
// TYPES
// ============================================

export type KYCLevel = 'none' | 'basic' | 'verified' | 'enhanced';

export type KYCStatus = 
  | 'not_started'
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'expired';

export type DocumentType = 
  | 'passport'
  | 'national_id'
  | 'drivers_license'
  | 'residence_permit';

export interface KYCData {
  walletAddress: string;
  level: KYCLevel;
  status: KYCStatus;
  
  // Personal Info
  personalInfo?: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality: string;
    phone?: string;
    email?: string;
  };
  
  // Address
  address?: {
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  
  // Documents
  documents?: {
    type: DocumentType;
    documentNumber?: string;
    expiryDate?: string;
    frontImageId?: string;
    backImageId?: string;
    selfieImageId?: string;
    uploadedAt: string;
    verifiedAt?: string;
  };
  
  // Verification
  verification?: {
    submittedAt: string;
    reviewedAt?: string;
    reviewedBy?: string;
    rejectionReason?: string;
    expiresAt?: string;
  };
  
  // Limits
  limits: {
    dailyWithdraw: number;
    monthlyWithdraw: number;
    singleTransaction: number;
  };
  
  createdAt: string;
  updatedAt: string;
}

export interface KYCSubmission {
  type: 'basic' | 'identity' | 'address' | 'enhanced';
  data: Record<string, unknown>;
}

// ============================================
// LIMITS BY LEVEL
// ============================================

export const KYC_LIMITS: Record<KYCLevel, { dailyWithdraw: number; monthlyWithdraw: number; singleTransaction: number }> = {
  none: {
    dailyWithdraw: 100,
    monthlyWithdraw: 500,
    singleTransaction: 50,
  },
  basic: {
    dailyWithdraw: 1000,
    monthlyWithdraw: 5000,
    singleTransaction: 500,
  },
  verified: {
    dailyWithdraw: 10000,
    monthlyWithdraw: 50000,
    singleTransaction: 5000,
  },
  enhanced: {
    dailyWithdraw: 100000,
    monthlyWithdraw: 500000,
    singleTransaction: 50000,
  },
};

// ============================================
// DEFAULT DATA
// ============================================

export function createDefaultKYCData(walletAddress: string): KYCData {
  return {
    walletAddress,
    level: 'none',
    status: 'not_started',
    limits: KYC_LIMITS.none,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * KYC başvurusu oluştur
 */
export function generateKYCApplicationId(): string {
  return `kyc_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Seviyeye göre gereksinimleri al
 */
export function getLevelRequirements(level: KYCLevel): string[] {
  switch (level) {
    case 'basic':
      return ['email', 'phone'];
    case 'verified':
      return ['email', 'phone', 'personal_info', 'identity_document', 'selfie'];
    case 'enhanced':
      return ['email', 'phone', 'personal_info', 'identity_document', 'selfie', 'address_proof', 'source_of_funds'];
    default:
      return [];
  }
}

/**
 * Tamamlanma yüzdesini hesapla
 */
export function calculateCompletionPercentage(data: KYCData, targetLevel: KYCLevel): number {
  const requirements = getLevelRequirements(targetLevel);
  if (requirements.length === 0) return 100;

  let completed = 0;

  if (requirements.includes('email') && data.personalInfo?.email) completed++;
  if (requirements.includes('phone') && data.personalInfo?.phone) completed++;
  if (requirements.includes('personal_info') && data.personalInfo?.firstName) completed++;
  if (requirements.includes('identity_document') && data.documents?.frontImageId) completed++;
  if (requirements.includes('selfie') && data.documents?.selfieImageId) completed++;
  if (requirements.includes('address_proof') && data.address?.street) completed++;

  return Math.round((completed / requirements.length) * 100);
}

/**
 * Doküman tipi için label
 */
export function getDocumentTypeLabel(type: DocumentType, lang: 'tr' | 'en'): string {
  const labels: Record<DocumentType, Record<string, string>> = {
    passport: { tr: 'Pasaport', en: 'Passport' },
    national_id: { tr: 'Kimlik Kartı', en: 'National ID' },
    drivers_license: { tr: 'Ehliyet', en: "Driver's License" },
    residence_permit: { tr: 'İkamet İzni', en: 'Residence Permit' },
  };
  return labels[type]?.[lang] || type;
}

/**
 * Durum için label
 */
export function getStatusLabel(status: KYCStatus, lang: 'tr' | 'en'): string {
  const labels: Record<KYCStatus, Record<string, string>> = {
    not_started: { tr: 'Başlanmadı', en: 'Not Started' },
    pending: { tr: 'Bekliyor', en: 'Pending' },
    under_review: { tr: 'İnceleniyor', en: 'Under Review' },
    approved: { tr: 'Onaylandı', en: 'Approved' },
    rejected: { tr: 'Reddedildi', en: 'Rejected' },
    expired: { tr: 'Süresi Doldu', en: 'Expired' },
  };
  return labels[status]?.[lang] || status;
}

/**
 * Seviye için label ve açıklama
 */
export function getLevelInfo(level: KYCLevel, lang: 'tr' | 'en'): { label: string; description: string } {
  const info: Record<KYCLevel, Record<string, { label: string; description: string }>> = {
    none: {
      tr: { label: 'Doğrulanmamış', description: 'Kimlik doğrulaması yapılmamış' },
      en: { label: 'Unverified', description: 'Identity not verified' },
    },
    basic: {
      tr: { label: 'Temel', description: 'Email ve telefon doğrulandı' },
      en: { label: 'Basic', description: 'Email and phone verified' },
    },
    verified: {
      tr: { label: 'Doğrulanmış', description: 'Kimlik belgesi onaylandı' },
      en: { label: 'Verified', description: 'Identity document approved' },
    },
    enhanced: {
      tr: { label: 'Tam Doğrulama', description: 'Tüm belgeler onaylandı' },
      en: { label: 'Enhanced', description: 'All documents approved' },
    },
  };
  return info[level]?.[lang] || { label: level, description: '' };
}

/**
 * Yaş kontrolü (18+)
 */
export function isAdult(dateOfBirth: string): boolean {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  const age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    return age - 1 >= 18;
  }
  return age >= 18;
}

/**
 * Doküman süresi dolmuş mu?
 */
export function isDocumentExpired(expiryDate: string): boolean {
  return new Date(expiryDate) < new Date();
}
