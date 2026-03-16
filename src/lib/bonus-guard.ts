// src/lib/bonus-guard.ts
// Bonus Asset Guard — Early Bird & Campaign bonus restrictions
// Rules:
// 1. Bonus assets CANNOT be withdrawn
// 2. Bonus assets CANNOT be transferred to another user
// 3. Bonus assets CAN be converted between metals (stays as bonus)
// 4. Bonus unlocks when user makes real purchases totaling 500 AUXS equivalent

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Unlock threshold: 500 AUXS or equivalent in other metals
const UNLOCK_THRESHOLD_AUXS = 500;

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
// GET WITHDRAWABLE BALANCE — total balance minus bonus (locked) portion
// ═══════════════════════════════════════════════════════════════════════════

export async function getWithdrawableBalance(userId: string, asset: string): Promise<{
  total: number;
  bonus: number;
  withdrawable: number;
  isFullyLocked: boolean;
}> {
  const assetUpper = asset.toUpperCase();

  // Check if bonus is already unlocked
  const unlocked = await isBonusUnlocked(userId);

  const pipeline = redis.pipeline();
  pipeline.get(`user:${userId}:balance:${assetUpper}`);
  pipeline.get(`user:${userId}:balance:bonus${assetUpper}`);
  const [total, bonus] = await pipeline.exec();

  const totalAmount = (total as number) || 0;
  const bonusAmount = unlocked ? 0 : ((bonus as number) || 0);
  const withdrawable = Math.max(0, totalAmount - bonusAmount);

  return {
    total: totalAmount,
    bonus: bonusAmount,
    withdrawable,
    isFullyLocked: withdrawable <= 0 && totalAmount > 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECK TRANSFER ALLOWED — bonus assets cannot be transferred
// ═══════════════════════════════════════════════════════════════════════════

export async function checkTransferAllowed(userId: string, asset: string, amount: number): Promise<{
  allowed: boolean;
  maxTransferable: number;
  bonusLocked: number;
  message?: { tr: string; en: string };
}> {
  const assetUpper = asset.toUpperCase();

  // Only metal assets can have bonus locks
  if (!BONUS_ASSETS.includes(assetUpper)) {
    return { allowed: true, maxTransferable: amount, bonusLocked: 0 };
  }

  const { total, bonus, withdrawable } = await getWithdrawableBalance(userId, assetUpper);

  if (amount <= withdrawable) {
    return { allowed: true, maxTransferable: withdrawable, bonusLocked: bonus };
  }

  return {
    allowed: false,
    maxTransferable: withdrawable,
    bonusLocked: bonus,
    message: {
      tr: `${bonus.toFixed(4)} ${assetUpper} bonus olarak kilitlidir ve transfer edilemez. Transfer edilebilir bakiye: ${withdrawable.toFixed(4)} ${assetUpper}`,
      en: `${bonus.toFixed(4)} ${assetUpper} is locked as bonus and cannot be transferred. Transferable balance: ${withdrawable.toFixed(4)} ${assetUpper}`,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECK WITHDRAW ALLOWED — bonus assets cannot be withdrawn
// ═══════════════════════════════════════════════════════════════════════════

export async function checkWithdrawAllowed(userId: string, asset: string, amount: number): Promise<{
  allowed: boolean;
  maxWithdrawable: number;
  bonusLocked: number;
  message?: { tr: string; en: string };
}> {
  const assetUpper = asset.toUpperCase();

  if (!BONUS_ASSETS.includes(assetUpper)) {
    return { allowed: true, maxWithdrawable: amount, bonusLocked: 0 };
  }

  const { withdrawable, bonus } = await getWithdrawableBalance(userId, assetUpper);

  if (amount <= withdrawable) {
    return { allowed: true, maxWithdrawable: withdrawable, bonusLocked: bonus };
  }

  return {
    allowed: false,
    maxWithdrawable: withdrawable,
    bonusLocked: bonus,
    message: {
      tr: `${bonus.toFixed(4)} ${assetUpper} bonus olarak kilitlidir ve çekilemez. Çekilebilir bakiye: ${withdrawable.toFixed(4)} ${assetUpper}`,
      en: `${bonus.toFixed(4)} ${assetUpper} is locked as bonus and cannot be withdrawn. Withdrawable balance: ${withdrawable.toFixed(4)} ${assetUpper}`,
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

  // Check if bonus is already unlocked
  const unlocked = await isBonusUnlocked(userId);
  if (unlocked) return;

  const bonusFrom = await getBonusBalance(userId, fromUpper);
  if (bonusFrom <= 0) return;

  // Calculate how much of the converted amount was bonus
  const totalFrom = ((await redis.get(`user:${userId}:balance:${fromUpper}`)) as number) || 0;
  // After conversion, totalFrom has already been reduced, so we use the pre-conversion total
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
// RECORD PURCHASE — track cumulative purchases for unlock threshold
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
  const metalUpper = metal.toUpperCase();

  // Get AUXS price to calculate equivalent
  let auxsPrice = 2.90; // fallback
  try {
    const { getTokenPrices } = await import("@/lib/v6-token-service");
    const auxsPrices = await getTokenPrices("AUXS");
    auxsPrice = auxsPrices.askPerGram || 2.90;
  } catch {}

  // Calculate AUXS equivalent of this purchase
  const purchaseValueUsd = amountGrams * pricePerGram;
  const auxsEquivalent = purchaseValueUsd / auxsPrice;

  // Increment cumulative purchases
  const key = `user:${userId}:purchases:auxsEquiv`;
  const prev = ((await redis.get(key)) as number) || 0;
  const newTotal = prev + auxsEquivalent;
  await redis.set(key, newTotal);

  // Check if threshold just crossed
  const wasUnlocked = prev >= UNLOCK_THRESHOLD_AUXS;
  const isNowUnlocked = newTotal >= UNLOCK_THRESHOLD_AUXS;
  const justUnlocked = !wasUnlocked && isNowUnlocked;

  if (justUnlocked) {
    await unlockBonus(userId);
  }

  return {
    totalPurchasedAuxsEquiv: newTotal,
    unlockThreshold: UNLOCK_THRESHOLD_AUXS,
    justUnlocked,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// UNLOCK BONUS — remove all bonus locks for a user
// ═══════════════════════════════════════════════════════════════════════════

async function unlockBonus(userId: string): Promise<void> {
  const pipeline = redis.pipeline();

  for (const asset of BONUS_ASSETS) {
    pipeline.set(`user:${userId}:balance:bonus${asset}`, 0);
  }
  pipeline.set(`user:${userId}:bonus:unlocked`, true);
  pipeline.set(`user:${userId}:bonus:unlockedAt`, new Date().toISOString());

  await pipeline.exec();

  // Record unlock event
  await redis.lpush(
    `user:${userId}:transactions`,
    JSON.stringify({
      type: "bonus",
      subtype: "unlock",
      description: `Bonus unlocked! You've reached ${UNLOCK_THRESHOLD_AUXS} AUXS in purchases. All bonus assets are now fully available.`,
      descriptionTr: `Bonus kilidi açıldı! ${UNLOCK_THRESHOLD_AUXS} AUXS değerinde alım yaptınız. Tüm bonus varlıklarınız artık serbesttir.`,
      timestamp: new Date().toISOString(),
    })
  );

  console.log(`🔓 Bonus UNLOCKED for user ${userId} — reached ${UNLOCK_THRESHOLD_AUXS} AUXS threshold`);
}

// ═══════════════════════════════════════════════════════════════════════════
// IS BONUS UNLOCKED — check if user has reached the threshold
// ═══════════════════════════════════════════════════════════════════════════

export async function isBonusUnlocked(userId: string): Promise<boolean> {
  const unlocked = await redis.get(`user:${userId}:bonus:unlocked`);
  return unlocked === true || unlocked === "true";
}

// ═══════════════════════════════════════════════════════════════════════════
// GET BONUS STATUS — full status for UI display
// ═══════════════════════════════════════════════════════════════════════════

export async function getBonusStatus(userId: string): Promise<{
  hasBonus: boolean;
  unlocked: boolean;
  bonusBalances: Record<string, number>;
  totalPurchasedAuxsEquiv: number;
  unlockThreshold: number;
  progressPercent: number;
  remainingToUnlock: number;
  message: { tr: string; en: string };
}> {
  const bonusBalances = await getAllBonusBalances(userId);
  const hasBonus = Object.values(bonusBalances).some(v => v > 0);
  const unlocked = await isBonusUnlocked(userId);

  const totalPurchased = ((await redis.get(`user:${userId}:purchases:auxsEquiv`)) as number) || 0;
  const progressPercent = Math.min(100, (totalPurchased / UNLOCK_THRESHOLD_AUXS) * 100);
  const remaining = Math.max(0, UNLOCK_THRESHOLD_AUXS - totalPurchased);

  let message: { tr: string; en: string };

  if (unlocked) {
    message = {
      tr: "Bonus varlıklarınızın kilidi açılmıştır. Tüm varlıklarınızı serbestçe kullanabilirsiniz.",
      en: "Your bonus assets are unlocked. You can freely use all your assets.",
    };
  } else if (hasBonus) {
    message = {
      tr: `Bonus varlıklarınız kilitlidir. ${remaining.toFixed(0)} AUXS değerinde daha alım yaparak kilidi açabilirsiniz. (%${progressPercent.toFixed(0)} tamamlandı)`,
      en: `Your bonus assets are locked. Purchase ${remaining.toFixed(0)} AUXS worth more to unlock. (${progressPercent.toFixed(0)}% complete)`,
    };
  } else {
    message = { tr: "", en: "" };
  }

  return {
    hasBonus,
    unlocked,
    bonusBalances,
    totalPurchasedAuxsEquiv: totalPurchased,
    unlockThreshold: UNLOCK_THRESHOLD_AUXS,
    progressPercent,
    remainingToUnlock: remaining,
    message,
  };
}
