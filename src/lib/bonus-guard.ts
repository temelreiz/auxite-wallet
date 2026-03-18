// src/lib/bonus-guard.ts
// Bonus Asset Guard — Liquidity Credit System v2
// Rules:
// 1. Bonus assets CANNOT be withdrawn (respecting progressive unlock %)
// 2. Bonus assets CANNOT be transferred (respecting progressive unlock %)
// 3. Bonus assets CAN be converted between metals (stays as bonus)
// 4. Bonus assets CAN be used for fee payment and yield participation
// 5. Unlock: 30 days OR 5x trade volume (HYBRID, progressive)

import { Redis } from "@upstash/redis";
import { calculateUnlockPercent, BONUS_CONFIG } from "@/lib/metal-bonus-service";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// All bonus-trackable assets
const BONUS_ASSETS = ["AUXG", "AUXS", "AUXPT", "AUXPD"];

// ═══════════════════════════════════════════════════════════════════════════
// GET BONUS BALANCE — how much of an asset is locked as bonus
// ═══════════════════════════════════════════════════════════════════════════

export async function getBonusBalance(userId: string, asset: string): Promise<number> {
  const key = `user:${userId}:balance:bonus${asset.toUpperCase()}`;
  const bonus = (await redis.get(key)) as number | null;
  return bonus || 0;
}

export async function getAllBonusBalances(userId: string): Promise<Record<string, number>> {
  const pipeline = redis.pipeline();
  for (const asset of BONUS_ASSETS) {
    pipeline.get(`user:${userId}:balance:bonus${asset}`);
  }
  const results = await pipeline.exec();

  const balances: Record<string, number> = {};
  BONUS_ASSETS.forEach((asset, i) => {
    balances[asset] = (results[i] as number) || 0;
  });
  return balances;
}

// ═══════════════════════════════════════════════════════════════════════════
// GET WITHDRAWABLE BALANCE — factors in progressive unlock percentage
// ═══════════════════════════════════════════════════════════════════════════

export async function getWithdrawableBalance(userId: string, asset: string): Promise<{
  total: number;
  bonus: number;
  lockedBonus: number;
  unlockedBonus: number;
  withdrawable: number;
  unlockPercent: number;
  isFullyLocked: boolean;
}> {
  const assetUpper = asset.toUpperCase();

  // Get progressive unlock percentage
  const { unlockPercent } = await calculateUnlockPercent(userId);

  const pipeline = redis.pipeline();
  pipeline.get(`user:${userId}:balance:${assetUpper.toLowerCase()}`);
  pipeline.get(`user:${userId}:balance:bonus${assetUpper}`);
  const [total, bonus] = await pipeline.exec();

  const totalAmount = (total as number) || 0;
  const bonusAmount = (bonus as number) || 0;

  // Progressive unlock: only (100 - unlockPercent)% of bonus is still locked
  const lockedBonus = bonusAmount * (1 - unlockPercent / 100);
  const unlockedBonus = bonusAmount - lockedBonus;
  const withdrawable = Math.max(0, totalAmount - lockedBonus);

  return {
    total: totalAmount,
    bonus: bonusAmount,
    lockedBonus,
    unlockedBonus,
    withdrawable,
    unlockPercent,
    isFullyLocked: withdrawable <= 0 && totalAmount > 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECK TRANSFER ALLOWED — bonus assets cannot be transferred (progressive)
// ═══════════════════════════════════════════════════════════════════════════

export async function checkTransferAllowed(userId: string, asset: string, amount: number): Promise<{
  allowed: boolean;
  maxTransferable: number;
  bonusLocked: number;
  unlockPercent: number;
  message?: { tr: string; en: string };
}> {
  const assetUpper = asset.toUpperCase();

  if (!BONUS_ASSETS.includes(assetUpper)) {
    return { allowed: true, maxTransferable: amount, bonusLocked: 0, unlockPercent: 100 };
  }

  const { withdrawable, lockedBonus, unlockPercent } = await getWithdrawableBalance(userId, assetUpper);

  if (amount <= withdrawable) {
    return { allowed: true, maxTransferable: withdrawable, bonusLocked: lockedBonus, unlockPercent };
  }

  return {
    allowed: false,
    maxTransferable: withdrawable,
    bonusLocked: lockedBonus,
    unlockPercent,
    message: {
      tr: `${lockedBonus.toFixed(4)} ${assetUpper} bonus olarak kilitlidir (%${(100 - unlockPercent).toFixed(0)} kilitli). Transfer edilebilir: ${withdrawable.toFixed(4)} ${assetUpper}`,
      en: `${lockedBonus.toFixed(4)} ${assetUpper} is locked as bonus (${(100 - unlockPercent).toFixed(0)}% locked). Transferable: ${withdrawable.toFixed(4)} ${assetUpper}`,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECK WITHDRAW ALLOWED — bonus assets cannot be withdrawn (progressive)
// ═══════════════════════════════════════════════════════════════════════════

export async function checkWithdrawAllowed(userId: string, asset: string, amount: number): Promise<{
  allowed: boolean;
  maxWithdrawable: number;
  bonusLocked: number;
  unlockPercent: number;
  message?: { tr: string; en: string };
}> {
  const assetUpper = asset.toUpperCase();

  if (!BONUS_ASSETS.includes(assetUpper)) {
    return { allowed: true, maxWithdrawable: amount, bonusLocked: 0, unlockPercent: 100 };
  }

  const { withdrawable, lockedBonus, unlockPercent } = await getWithdrawableBalance(userId, assetUpper);

  if (amount <= withdrawable) {
    return { allowed: true, maxWithdrawable: withdrawable, bonusLocked: lockedBonus, unlockPercent };
  }

  return {
    allowed: false,
    maxWithdrawable: withdrawable,
    bonusLocked: lockedBonus,
    unlockPercent,
    message: {
      tr: `${lockedBonus.toFixed(4)} ${assetUpper} bonus olarak kilitlidir (%${(100 - unlockPercent).toFixed(0)} kilitli). Çekilebilir: ${withdrawable.toFixed(4)} ${assetUpper}`,
      en: `${lockedBonus.toFixed(4)} ${assetUpper} is locked as bonus (${(100 - unlockPercent).toFixed(0)}% locked). Withdrawable: ${withdrawable.toFixed(4)} ${assetUpper}`,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVERT BONUS — when user converts bonus metal to another metal,
// the bonus flag follows (stays locked in the new metal)
// ═══════════════════════════════════════════════════════════════════════════

export async function handleBonusConvert(
  userId: string,
  fromAsset: string,
  toAsset: string,
  fromAmount: number,
  toAmount: number
): Promise<void> {
  const fromUpper = fromAsset.toUpperCase();
  const toUpper = toAsset.toUpperCase();

  const bonusFrom = await getBonusBalance(userId, fromUpper);
  if (bonusFrom <= 0) return;

  // Calculate how much of the converted amount was bonus
  const totalFrom = ((await redis.get(`user:${userId}:balance:${fromUpper.toLowerCase()}`)) as number) || 0;
  const preConversionTotal = totalFrom + fromAmount;
  const bonusRatio = Math.min(1, bonusFrom / preConversionTotal);
  const bonusPortionFrom = fromAmount * bonusRatio;
  const bonusPortionTo = toAmount * bonusRatio;

  // Reduce bonus on source asset
  const newBonusFrom = Math.max(0, bonusFrom - bonusPortionFrom);
  await redis.set(`user:${userId}:balance:bonus${fromUpper}`, newBonusFrom);

  // Add bonus on target asset
  const bonusTo = await getBonusBalance(userId, toUpper);
  await redis.set(`user:${userId}:balance:bonus${toUpper}`, bonusTo + bonusPortionTo);

  console.log(`🔄 Bonus convert: ${userId} — ${bonusPortionFrom.toFixed(4)} bonus${fromUpper} → ${bonusPortionTo.toFixed(4)} bonus${toUpper}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// RECORD VOLUME — track cumulative trade volume for hybrid unlock
// (Replaces old recordPurchase with AUXS threshold)
// ═══════════════════════════════════════════════════════════════════════════

export async function recordVolume(
  userId: string,
  amountUsd: number
): Promise<{
  currentVolumeUsd: number;
  unlockPercent: number;
  justFullyUnlocked: boolean;
}> {
  // Import from metal-bonus-service to avoid circular deps
  const { recordVolume: doRecordVolume } = await import("@/lib/metal-bonus-service");
  const newTotal = await doRecordVolume(userId, amountUsd);

  const unlock = await calculateUnlockPercent(userId);
  const justFullyUnlocked = unlock.unlockPercent >= 100;

  // If fully unlocked, zero out all bonus balances
  if (justFullyUnlocked) {
    const wasUnlocked = await redis.get(`user:${userId}:bonus:unlocked`);
    if (wasUnlocked !== true && wasUnlocked !== "true") {
      await fullUnlock(userId);
    }
  }

  return {
    currentVolumeUsd: newTotal,
    unlockPercent: unlock.unlockPercent,
    justFullyUnlocked,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// BACKWARD COMPAT: recordPurchase wrapper (delegates to recordVolume)
// ═══════════════════════════════════════════════════════════════════════════

export async function recordPurchase(
  userId: string,
  metal: string,
  amountGrams: number,
  pricePerGram: number
): Promise<{
  totalPurchasedAuxsEquiv: number;
  unlockThreshold: number;
  justUnlocked: boolean;
}> {
  const amountUsd = amountGrams * pricePerGram;
  const result = await recordVolume(userId, amountUsd);
  return {
    totalPurchasedAuxsEquiv: result.currentVolumeUsd,
    unlockThreshold: 0, // deprecated
    justUnlocked: result.justFullyUnlocked,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FULL UNLOCK — zero out all bonus locks when 100% unlocked
// ═══════════════════════════════════════════════════════════════════════════

async function fullUnlock(userId: string): Promise<void> {
  const pipeline = redis.pipeline();

  for (const asset of BONUS_ASSETS) {
    pipeline.set(`user:${userId}:balance:bonus${asset}`, 0);
  }
  pipeline.set(`user:${userId}:bonus:unlocked`, true);
  pipeline.set(`user:${userId}:bonus:unlockedAt`, new Date().toISOString());

  await pipeline.exec();

  await redis.lpush(
    `user:${userId}:transactions`,
    JSON.stringify({
      type: "bonus",
      subtype: "unlock",
      description: "Bonus fully unlocked! All bonus assets are now freely available.",
      descriptionTr: "Bonus kilidi tamamen açıldı! Tüm bonus varlıklarınız artık serbesttir.",
      timestamp: new Date().toISOString(),
    })
  );

  console.log(`🔓 Bonus FULLY UNLOCKED for user ${userId}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// IS BONUS UNLOCKED — check if user has fully unlocked
// ═══════════════════════════════════════════════════════════════════════════

export async function isBonusUnlocked(userId: string): Promise<boolean> {
  const unlocked = await redis.get(`user:${userId}:bonus:unlocked`);
  return unlocked === true || unlocked === "true";
}

// ═══════════════════════════════════════════════════════════════════════════
// GET BONUS STATUS — full status for UI display (v2 with progressive)
// ═══════════════════════════════════════════════════════════════════════════

export async function getBonusStatus(userId: string): Promise<{
  hasBonus: boolean;
  unlocked: boolean;
  bonusBalances: Record<string, number>;
  unlockPercent: number;
  unlockMethod: 'time' | 'volume' | 'none';
  daysRemaining: number;
  volumeProgress: number;
  volumeRequired: number;
  currentVolumeUsd: number;
  message: { tr: string; en: string };
}> {
  const bonusBalances = await getAllBonusBalances(userId);
  const hasBonus = Object.values(bonusBalances).some(v => v > 0);
  const unlocked = await isBonusUnlocked(userId);

  const unlock = await calculateUnlockPercent(userId);
  const volumeRequired = unlock.totalBonusValueUsd * BONUS_CONFIG.volumeMultiplier;

  let message: { tr: string; en: string };

  if (unlocked || unlock.unlockPercent >= 100) {
    message = {
      tr: "Bonus varlıklarınızın kilidi açılmıştır. Tüm varlıklarınızı serbestçe kullanabilirsiniz.",
      en: "Your bonus assets are unlocked. You can freely use all your assets.",
    };
  } else if (hasBonus) {
    const daysLeft = Math.max(0, BONUS_CONFIG.unlockDays - unlock.daysElapsed);
    message = {
      tr: `Bonus varlıklarınız %${unlock.unlockPercent.toFixed(0)} açık. ${daysLeft.toFixed(0)} gün kaldı veya $${(volumeRequired - unlock.currentVolumeUsd).toFixed(0)} daha işlem yapın.`,
      en: `Your bonus assets are ${unlock.unlockPercent.toFixed(0)}% unlocked. ${daysLeft.toFixed(0)} days remaining or trade $${(volumeRequired - unlock.currentVolumeUsd).toFixed(0)} more.`,
    };
  } else {
    message = { tr: "", en: "" };
  }

  return {
    hasBonus,
    unlocked: unlocked || unlock.unlockPercent >= 100,
    bonusBalances,
    unlockPercent: unlock.unlockPercent,
    unlockMethod: unlock.timeProgress >= unlock.volumeProgress ? 'time' : 'volume',
    daysRemaining: Math.max(0, BONUS_CONFIG.unlockDays - unlock.daysElapsed),
    volumeProgress: unlock.volumeProgress,
    volumeRequired,
    currentVolumeUsd: unlock.currentVolumeUsd,
    message,
  };
}
