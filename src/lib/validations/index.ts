// src/lib/validations/index.ts
// Input validation şemaları - TÜM API route'larda kullanılmalı

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════
// BASE SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

// Ethereum adresi
export const ethereumAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Geçersiz Ethereum adresi');

// Solana adresi
export const solanaAddressSchema = z
  .string()
  .min(32)
  .max(44)
  .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, 'Geçersiz Solana adresi');

// Bitcoin adresi
export const bitcoinAddressSchema = z
  .string()
  .regex(/^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/, 'Geçersiz Bitcoin adresi');

// XRP adresi
export const xrpAddressSchema = z
  .string()
  .regex(/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/, 'Geçersiz XRP adresi');

// User ID
export const userIdSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Geçersiz kullanıcı ID');

// Token türleri
export const tokenTypeSchema = z.enum(['AUXG', 'AUXS', 'AUXPT', 'AUXPD', 'AUXM']);

// Crypto türleri
export const cryptoTypeSchema = z.enum(['ETH', 'BTC', 'SOL', 'XRP', 'USDT']);

// Miktar (pozitif, max 8 decimal)
export const amountSchema = z
  .number()
  .positive('Miktar pozitif olmalı')
  .max(1000000000, 'Miktar çok büyük')
  .refine(
    (val) => Number(val.toFixed(8)) === val,
    'Maksimum 8 ondalık basamak'
  );

// TOTP kodu
export const totpCodeSchema = z
  .string()
  .length(6, 'TOTP kodu 6 haneli olmalı')
  .regex(/^\d+$/, 'TOTP kodu sadece rakam içermeli');

// ═══════════════════════════════════════════════════════════════════════════
// TRANSACTION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

export const withdrawRequestSchema = z.object({
  userId: userIdSchema,
  token: tokenTypeSchema.or(cryptoTypeSchema),
  amount: amountSchema,
  address: z.string().min(20).max(100),
  totpCode: totpCodeSchema.optional(),
  memo: z.string().max(100).optional(),
});

export const depositConfirmSchema = z.object({
  userId: userIdSchema,
  txHash: z.string().min(10).max(100),
  token: tokenTypeSchema.or(cryptoTypeSchema),
  amount: amountSchema,
});

export const tradeRequestSchema = z.object({
  userId: userIdSchema,
  fromToken: tokenTypeSchema.or(cryptoTypeSchema),
  toToken: tokenTypeSchema.or(cryptoTypeSchema),
  amount: amountSchema,
  slippage: z.number().min(0).max(50).default(1),
});

export const transferRequestSchema = z.object({
  userId: userIdSchema,
  toUserId: userIdSchema,
  token: tokenTypeSchema,
  amount: amountSchema,
  totpCode: totpCodeSchema.optional(),
  note: z.string().max(200).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
// USER SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

export const registerSchema = z.object({
  email: z.string().email('Geçersiz email'),
  password: z
    .string()
    .min(8, 'Şifre en az 8 karakter')
    .max(100)
    .regex(/[A-Z]/, 'En az bir büyük harf')
    .regex(/[a-z]/, 'En az bir küçük harf')
    .regex(/[0-9]/, 'En az bir rakam'),
  referralCode: z.string().max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: totpCodeSchema.optional(),
});

export const enable2FASchema = z.object({
  userId: userIdSchema,
  code: totpCodeSchema,
});

export const disable2FASchema = z.object({
  userId: userIdSchema,
  code: totpCodeSchema,
  password: z.string().min(1),
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

export const adminLoginSchema = z.object({
  password: z.string().min(1),
  totpCode: totpCodeSchema.optional(),
});

export const adminActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'suspend', 'unsuspend']),
  targetUserId: userIdSchema,
  reason: z.string().max(500).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * API route'da validation için helper
 * @example
 * const result = validateRequest(withdrawRequestSchema, body);
 * if (!result.success) {
 *   return NextResponse.json({ error: result.error }, { status: 400 });
 * }
 * const data = result.data;
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    return { success: false, error: errors };
  }
  
  return { success: true, data: result.data };
}

/**
 * Adres türüne göre doğrulama
 */
export function validateCryptoAddress(
  address: string,
  crypto: 'ETH' | 'BTC' | 'SOL' | 'XRP'
): boolean {
  const schemas = {
    ETH: ethereumAddressSchema,
    BTC: bitcoinAddressSchema,
    SOL: solanaAddressSchema,
    XRP: xrpAddressSchema,
  };
  
  return schemas[crypto].safeParse(address).success;
}

// Type exports
export type WithdrawRequest = z.infer<typeof withdrawRequestSchema>;
export type TradeRequest = z.infer<typeof tradeRequestSchema>;
export type TransferRequest = z.infer<typeof transferRequestSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
