/**
 * User Language Helper
 * Kullanıcının tercih ettiği dili Redis'ten çeker.
 * Tüm email gönderen route'larda kullanılır.
 */

import { getRedis } from "@/lib/redis";

const SUPPORTED_LANGUAGES = ["en", "tr", "de", "fr", "ar", "ru"];

/**
 * Kullanıcının dilini Redis'ten al.
 * Arama sırası:
 *   1. user:{userId}.language
 *   2. auth:user:{email}.language
 *   3. Fallback: 'en'
 */
export async function getUserLanguage(walletAddress: string): Promise<string> {
  try {
    const redis = getRedis();
    const normalizedAddress = walletAddress.toLowerCase();

    // 1. user:address:{addr} → userId
    const userId = await redis.get(`user:address:${normalizedAddress}`) as string | null;

    if (userId) {
      // 2. user:{userId} hash'inden language oku
      const userData = await redis.hgetall(`user:${userId}`);
      if (userData?.language && SUPPORTED_LANGUAGES.includes(userData.language as string)) {
        return userData.language as string;
      }

      // 3. Fallback: auth:user:{email} hash'inden language oku
      if (userData?.email) {
        const authData = await redis.hgetall(`auth:user:${(userData.email as string).toLowerCase()}`);
        if (authData?.language && SUPPORTED_LANGUAGES.includes(authData.language as string)) {
          return authData.language as string;
        }
      }
    }

    return "en";
  } catch (e) {
    console.warn("getUserLanguage error:", e);
    return "en";
  }
}

/**
 * Kullanıcının dilini userId ile al (userId zaten biliniyorsa).
 */
export async function getUserLanguageByUserId(userId: string): Promise<string> {
  try {
    const redis = getRedis();
    const userData = await redis.hgetall(`user:${userId}`);

    if (userData?.language && SUPPORTED_LANGUAGES.includes(userData.language as string)) {
      return userData.language as string;
    }

    // Fallback: auth hash
    if (userData?.email) {
      const authData = await redis.hgetall(`auth:user:${(userData.email as string).toLowerCase()}`);
      if (authData?.language && SUPPORTED_LANGUAGES.includes(authData.language as string)) {
        return authData.language as string;
      }
    }

    return "en";
  } catch (e) {
    console.warn("getUserLanguageByUserId error:", e);
    return "en";
  }
}
