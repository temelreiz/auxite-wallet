// app/api/withdraw/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { processWithdraw } from "@/lib/blockchain-service";
import { sendWithdrawConfirmedEmail, sendWithdrawRequestedEmail } from "@/lib/email-service";
import { getUserLanguage } from "@/lib/user-language";
import { checkTradingAllowed } from "@/lib/trading-guard";
import { getWithdrawFee, getMinWithdraw } from "@/lib/withdraw-fees";
import { requireKycForWithdraw, assertCardHoldAllows, usdValueOf } from "@/lib/withdrawal-guard";
import { recordAuxmEntry } from "@/lib/auxm-ledger";
import * as OTPAuth from "otpauth";
import * as crypto from "crypto";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface WithdrawRequest {
  twoFactorCode?: string;
  address: string;
  coin: string;
  amount: number; // Direkt kripto miktarı
  withdrawAddress: string;
  network?: string; // ethereum, tron, base, bitcoin etc.
  memo?: string;
}

// Fees and minimums centralized in src/lib/withdraw-fees.ts.
// Use getWithdrawFee(coin, network) and getMinWithdraw(coin, network).

// Balance key mapping
const BALANCE_KEYS: Record<string, string> = {
  USDT: "usdt",
  USDC: "usdc",
  BTC: "btc",
  ETH: "eth",
  XRP: "xrp",
  SOL: "sol",
  AUXM: "auxm",
};

// AUXM is a USD-pegged settlement token. Withdrawals convert it 1:1 to
// the user-selected payout asset. ETH conversion uses live USD price.
const AUXM_PAYOUT_ASSETS = ["USDC", "USDT", "ETH", "BTC"] as const;
type AuxmPayoutAsset = typeof AUXM_PAYOUT_ASSETS[number];

// ═══════════════════════════════════════════════════════════════════════════
// 2FA VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

function get2FAKey(address: string): string {
  return `user:2fa:${address.toLowerCase()}`;
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

async function verify2FA(address: string, code: string): Promise<{ valid: boolean; error?: string; enabled?: boolean }> {
  const key = get2FAKey(address);
  
  // Redis hash olarak oku (hgetall)
  const data = await redis.hgetall(key);
  
  // 2FA verisi yoksa
  if (!data || Object.keys(data).length === 0) {
    return { valid: false, error: "2FA etkinleştirilmemiş. Lütfen önce 2FA'yı aktif edin.", enabled: false };
  }
  
  // 2FA aktif değilse - hem string "true" hem boolean true kontrol et
  const isEnabled = data.enabled === true || data.enabled === "true";
  if (!isEnabled || !data.secret) {
    return { valid: false, error: "2FA etkinleştirilmemiş. Lütfen önce 2FA'yı aktif edin.", enabled: false };
  }
  
  // Kod girilmemişse
  if (!code) {
    return { valid: false, error: "2FA kodu gerekli", enabled: true };
  }
  
  // TOTP doğrula
  try {
    const secretObj = OTPAuth.Secret.fromBase32(data.secret as string);
    const totp = new OTPAuth.TOTP({
      issuer: "Auxite",
      label: "user",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: secretObj,
    });
    // Window 3 = ±90 saniye tolerans (frontend verify + backend re-verify arasındaki gecikme)
    const delta = totp.validate({ token: code, window: 3 });
    if (delta !== null) {
      return { valid: true, enabled: true };
    }
  } catch (e) {
    console.error("TOTP verify error:", e);
  }

  // Backup kodu dene - check both possible keys
  let backupCodes: string[] = [];
  
  if (data.hashedBackupCodes) {
    try {
      backupCodes = JSON.parse(data.hashedBackupCodes as string);
    } catch {}
  }
  
  if (backupCodes.length === 0 && data.backupCodes) {
    try {
      backupCodes = JSON.parse(data.backupCodes as string);
    } catch {}
  }
  
  const hashedInput = hashCode(code.toUpperCase());
  const codeIndex = backupCodes.indexOf(hashedInput);
  
  if (codeIndex !== -1) {
    // Kullanılan backup kodunu sil
    backupCodes.splice(codeIndex, 1);
    await redis.hset(key, {
      backupCodes: JSON.stringify(backupCodes),
      hashedBackupCodes: JSON.stringify(backupCodes),
      backupCodesRemaining: backupCodes.length.toString(),
    });
    return { valid: true, enabled: true };
  }
  
  return { valid: false, error: "Geçersiz 2FA kodu", enabled: true };
}

export async function POST(request: NextRequest) {
  try {
    // Kill Switch / Trading Guard
    const withdrawCheck = await checkTradingAllowed('cryptoWithdraw');
    if (!withdrawCheck.allowed) {
      return NextResponse.json(
        { error: withdrawCheck.message?.en || 'Withdrawal temporarily disabled', reason: withdrawCheck.reason, message: withdrawCheck.message },
        { status: 503 }
      );
    }

    const body = await request.json();
    // Support both web (address, coin, withdrawAddress) and mobile (fromAddress, token, toAddress) field names
    const address = body.address || body.fromAddress;
    const coin = (body.coin || body.token || "").toUpperCase();
    const amount = body.amount;
    const withdrawAddress = body.withdrawAddress || body.toAddress;
    const network = body.network;
    const memo = body.memo;
    const twoFactorCode = body.twoFactorCode;

    console.log(`📤 Withdraw request: coin=${coin}, amount=${amount}, to=${withdrawAddress?.slice(0, 10)}..., network=${network || 'default'}, has2FA=${!!twoFactorCode}`);

    // ── LOCK GUARD (Auxite Borrow) — withdrawing a metal must use AVAILABLE grams.
    if (["AUXG", "AUXS", "AUXPT", "AUXPD"].includes(coin) && address && Number(amount) > 0) {
      const { assertAvailable } = await import("@/lib/allocation-service");
      const guard = await assertAvailable(address, coin, Number(amount));
      if (!guard.ok) return NextResponse.json({ error: guard.error, available: guard.available, locked: guard.locked, yielding: guard.yielding }, { status: 400 });
    }

    // Validation
    if (!address || !coin || !amount || !withdrawAddress) {
      console.error(`❌ Missing fields: address=${!!address}, coin=${!!coin}, amount=${!!amount}, withdrawAddress=${!!withdrawAddress}`);
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
    }

    // Desteklenen coinler
    const supportedCoins = ["USDT", "USDC", "ETH", "XRP", "SOL", "BTC", "AUXM"];
    if (!supportedCoins.includes(coin)) {
      return NextResponse.json({ error: "Unsupported cryptocurrency" }, { status: 400 });
    }

    // ── P1: KYC GATE — only identity-verified accounts can move value out.
    // Covers every path in this route (AUXM redemption + crypto withdrawal).
    const kycGate = await requireKycForWithdraw(address);
    if (!kycGate.ok) {
      return NextResponse.json({ error: kycGate.error, code: kycGate.code }, { status: 403 });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // AUXM REDEMPTION — convert settlement balance to chosen crypto + send.
    // Body: { coin: "AUXM", payoutAsset: "USDC"|"USDT"|"ETH", amount, ... }
    // ═════════════════════════════════════════════════════════════════════════
    if (coin === "AUXM") {
      const payoutAsset = String(body.payoutAsset || "USDC").toUpperCase() as AuxmPayoutAsset;
      if (!AUXM_PAYOUT_ASSETS.includes(payoutAsset)) {
        return NextResponse.json({
          error: `Unsupported payout asset for AUXM. Choose one of: ${AUXM_PAYOUT_ASSETS.join(", ")}`,
        }, { status: 400 });
      }

      // Min withdrawal in AUXM (= USD)
      if (amount < 10) {
        return NextResponse.json({ error: "Minimum AUXM withdrawal is 10 AUXM ($10)" }, { status: 400 });
      }

      const normalizedAddr = address.toLowerCase();

      // Read AUXM balance from same source as other coins
      const baseUrl = request.headers.get("host")
        ? `https://${request.headers.get("host")}`
        : process.env.NEXT_PUBLIC_APP_URL || "https://vault.auxite.io";
      let auxmBalance = 0;
      try {
        const balanceRes = await fetch(`${baseUrl}/api/user/balance?address=${normalizedAddr}`);
        const balanceData = await balanceRes.json();
        if (balanceData.success && balanceData.balances) {
          auxmBalance = parseFloat(balanceData.balances.auxm || "0");
        }
      } catch (e) {
        console.warn("Balance API failed for AUXM redeem, falling back to redis:", e);
        const cur = await redis.hgetall(`user:${normalizedAddr}:balance`);
        auxmBalance = parseFloat((cur?.auxm as string) || "0");
      }

      if (amount > auxmBalance) {
        return NextResponse.json({
          error: "Insufficient AUXM balance",
          required: amount,
          available: auxmBalance,
        }, { status: 400 });
      }

      // Convert AUXM (USD) → payout asset amount
      // 1 AUXM = 1 USD; USDC/USDT = 1 USD; ETH/BTC = market price
      let payoutAmount: number;
      let ethPriceUsd: number | undefined;
      let btcPriceUsd: number | undefined;
      if (payoutAsset === "USDC" || payoutAsset === "USDT") {
        payoutAmount = amount; // 1:1
      } else if (payoutAsset === "ETH") {
        // ETH: fetch live price from /api/prices (oracle, GoldAPI/CoinGecko)
        try {
          const priceRes = await fetch(`${baseUrl}/api/prices?chain=84532`);
          const priceData = await priceRes.json();
          ethPriceUsd = parseFloat(priceData?.spotPrices?.ETH || "0");
          if (!ethPriceUsd || ethPriceUsd <= 0) throw new Error("ETH price unavailable");
        } catch (e) {
          ethPriceUsd = 3000;
          console.warn("Using fallback ETH price 3000:", e);
        }
        payoutAmount = amount / ethPriceUsd;
      } else {
        // BTC: fetch live price from /api/crypto (multi-source: HTX/Binance/CoinGecko)
        try {
          const cryptoRes = await fetch(`${baseUrl}/api/crypto`);
          const cryptoData = await cryptoRes.json();
          btcPriceUsd = parseFloat(cryptoData?.bitcoin?.usd || "0");
          if (!btcPriceUsd || btcPriceUsd <= 0) throw new Error("BTC price unavailable");
        } catch (e) {
          btcPriceUsd = 90000;
          console.warn("Using fallback BTC price 90000:", e);
        }
        payoutAmount = amount / btcPriceUsd;
      }

      // Apply payout-asset network fee (uses default network for the asset
      // — see DEFAULT_NETWORK in lib/withdraw-fees.ts).
      const payoutFee = getWithdrawFee(payoutAsset).fee;
      const netPayout = payoutAmount - payoutFee;
      if (netPayout <= 0) {
        return NextResponse.json({
          error: `AUXM amount too small after fees. Minimum payout: ${payoutFee} ${payoutAsset}`,
        }, { status: 400 });
      }

      // ── P2: CARD-FUNDED HOLD — block extracting unsettled card value.
      // AUXM is USD-pegged 1:1, so the withdraw USD value is `amount`.
      const auxmHold = await assertCardHoldAllows(normalizedAddr, amount);
      if (!auxmHold.ok) {
        return NextResponse.json({ error: auxmHold.error, code: auxmHold.code, details: auxmHold.details }, { status: 403 });
      }

      // Burn AUXM from user's balance immediately so they don't double-spend.
      // If on-chain transfer fails, we re-credit (refund handled in catch below).
      const balanceKey = `user:${normalizedAddr}:balance`;
      await redis.hincrbyfloat(balanceKey, "auxm", -amount);

      // Record transaction (processing)
      const txId = `withdraw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      // AUXM burn bookkeeping (payout asset is the other leg).
      await recordAuxmEntry({
        address: normalizedAddr,
        delta: -amount,
        reason: "withdraw",
        counterAsset: payoutAsset,
        counterAmount: netPayout,
        refTxId: txId,
        meta: { payoutFee },
      });
      const transaction = {
        id: txId,
        type: "withdraw",
        subType: "auxm_redemption",
        coin: "AUXM",
        payoutAsset,
        payoutAmount: netPayout.toString(),
        amount: amount.toString(),
        netAmount: netPayout.toString(),
        fee: payoutFee.toString() + " " + payoutAsset,
        ethPriceUsd: ethPriceUsd?.toString(),
        btcPriceUsd: btcPriceUsd?.toString(),
        withdrawAddress,
        memo: memo || null,
        status: "processing",
        timestamp: Date.now(),
      };
      const txKey = `user:${normalizedAddr}:transactions`;
      await redis.lpush(txKey, JSON.stringify(transaction));

      console.log(`💱 AUXM redemption: ${amount} AUXM → ${netPayout} ${payoutAsset} → ${withdrawAddress.slice(0, 10)}...`);

      // Try direct on-chain transfer of payout asset.
      // If hot wallet doesn't have enough, processWithdraw returns failure;
      // we then queue the redemption to pending:onchain:withdraws for the
      // reconcile cron to process once the treasury is funded.
      const direct = await processWithdraw(payoutAsset, withdrawAddress, netPayout);

      if (direct.success) {
        // Mark tx completed
        const txs = await redis.lrange(txKey, 0, 50);
        const updated = txs.map((t: any) => {
          const p = typeof t === "string" ? JSON.parse(t) : t;
          if (p.id === txId) {
            return JSON.stringify({ ...p, status: "completed", txHash: direct.txHash, completedAt: Date.now() });
          }
          return typeof t === "string" ? t : JSON.stringify(t);
        });
        await redis.del(txKey);
        if (updated.length) await redis.rpush(txKey, ...updated.reverse());

        return NextResponse.json({
          success: true,
          withdrawal: {
            id: txId,
            coin: "AUXM",
            payoutAsset,
            amount,
            payoutAmount: netPayout,
            fee: payoutFee,
            withdrawAddress,
            txHash: direct.txHash,
            status: "completed",
            explorerUrl: getExplorerUrl(payoutAsset, direct.txHash || ""),
          },
        });
      }

      // Treasury empty / on-chain failed — queue for deferred reconciliation.
      await redis.lpush("pending:onchain:withdraws", JSON.stringify({
        kind: "auxm_redemption",
        txId,
        address: normalizedAddr,
        payoutAsset,
        payoutAmount: netPayout,
        withdrawAddress,
        queuedAt: Date.now(),
        directError: direct.error,
      }));
      console.log(`⏸  AUXM redemption queued (treasury low/error): ${direct.error}`);

      return NextResponse.json({
        success: true,
        deferred: true,
        withdrawal: {
          id: txId,
          coin: "AUXM",
          payoutAsset,
          amount,
          payoutAmount: netPayout,
          fee: payoutFee,
          withdrawAddress,
          status: "queued",
          message: "Withdrawal queued. Settlement within 24-72 hours pending treasury reconciliation.",
        },
      });
    }

    // Minimum çekim kontrolü (network-aware: USDT/USDC/ETH on Ethereum has higher minimum)
    const minAmount = (() => {
      try { return getMinWithdraw(coin, network); } catch { return 0; }
    })();
    if (amount < minAmount) {
      return NextResponse.json({
        error: `Minimum withdrawal is ${minAmount} ${coin}`
      }, { status: 400 });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RATE LIMITING - Brute force ve spam saldırılarını önle
    // ═══════════════════════════════════════════════════════════════════════════
    const rateLimitKey = `ratelimit:withdraw:${address.toLowerCase()}`;
    const rateLimitWindow = 300; // 5 dakika
    const rateLimitMax = 3; // 5 dakikada max 3 çekim denemesi
    const now = Math.floor(Date.now() / 1000);

    await redis.zremrangebyscore(rateLimitKey, 0, now - rateLimitWindow);
    const requestCount = await redis.zcard(rateLimitKey);

    if (requestCount >= rateLimitMax) {
      return NextResponse.json({
        error: "Çok fazla çekim denemesi. Lütfen 5 dakika bekleyin.",
        code: "RATE_LIMIT_EXCEEDED",
      }, { status: 429 });
    }

    await redis.zadd(rateLimitKey, { score: now, member: `${now}-${Math.random()}` });
    await redis.expire(rateLimitKey, rateLimitWindow * 2);

    // ═══════════════════════════════════════════════════════════════════════════
    // 2FA DOĞRULAMASI - KRİTİK GÜVENLİK KONTROLÜ
    // Frontend kontrolü yeterli değil, backend'de de doğrulanmalı!
    // ═══════════════════════════════════════════════════════════════════════════
    const twoFAResult = await verify2FA(address, twoFactorCode || "");
    console.log(`🔐 2FA result: enabled=${twoFAResult.enabled}, valid=${twoFAResult.valid}, error=${twoFAResult.error || 'none'}`);

    // 2FA etkinse kod gerekli
    if (twoFAResult.enabled) {
      if (!twoFAResult.valid) {
        console.warn(`⚠️ 2FA verification failed for withdraw: ${twoFAResult.error}`);
        return NextResponse.json({
          error: twoFAResult.error || "Geçersiz 2FA kodu",
          code: "2FA_REQUIRED",
          requires2FA: true,
        }, { status: 401 });
      }
    }
    // 2FA etkin değilse işleme devam et (kullanıcı henüz 2FA kurmamış)

    // BTC ve USDC henüz desteklenmiyor
    if (coin === "BTC") {
      return NextResponse.json({
        error: "BTC withdrawals coming soon. Please use ETH, USDT, XRP or SOL."
      }, { status: 400 });
    }
    if (coin === "USDC") {
      return NextResponse.json({
        error: "USDC withdrawals coming soon. Please use USDT for stablecoin withdrawals."
      }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const balanceKey = `user:${normalizedAddress}:balance`;

    // Balance API'den gerçek bakiyeyi al (blockchain + redis + allocation)
    // Redis-only okuma yetersiz: external wallet kullanıcılarında USDT/ETH blockchain'de
    const balanceFieldKey = BALANCE_KEYS[coin];
    let cryptoBalance = 0;

    const baseUrl = request.headers.get("host")
      ? `https://${request.headers.get("host")}`
      : process.env.NEXT_PUBLIC_APP_URL || "https://vault.auxite.io";

    try {
      const balanceRes = await fetch(`${baseUrl}/api/user/balance?address=${normalizedAddress}`);
      const balanceData = await balanceRes.json();
      if (balanceData.success && balanceData.balances) {
        cryptoBalance = parseFloat(balanceData.balances[balanceFieldKey] || "0");
        console.log(`📊 Balance from API: ${coin}=${cryptoBalance} (source: balance API)`);
      } else {
        throw new Error(balanceData.error || "Balance API returned unsuccessful");
      }
    } catch (e) {
      // Fallback: Redis'ten oku
      console.warn(`⚠️ Balance API failed, falling back to Redis:`, e);
      const currentBalance = await redis.hgetall(balanceKey);
      if (!currentBalance || Object.keys(currentBalance).length === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      cryptoBalance = parseFloat(currentBalance[balanceFieldKey] as string || "0");
    }

    const networkFee = (() => {
      try { return getWithdrawFee(coin, network).fee; } catch { return 0; }
    })();

    console.log(`📊 Withdraw check - Coin: ${coin}, Balance: ${cryptoBalance}, Requested: ${amount}, Fee: ${networkFee}`);

    if (amount > cryptoBalance) {
      return NextResponse.json({ 
        error: `Insufficient ${coin} balance`,
        required: amount,
        available: cryptoBalance,
      }, { status: 400 });
    }

    // Net gönderilecek miktar (fee düşüldükten sonra)
    const netAmount = amount - networkFee;
    
    if (netAmount <= 0) {
      return NextResponse.json({ 
        error: `Amount too small. Minimum after fee: ${networkFee} ${coin}`,
      }, { status: 400 });
    }

    // Transaction ID oluştur
    const txId = `withdraw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Transaction kaydı (pending olarak başla)
    const transaction = {
      id: txId,
      type: "withdraw",
      subType: "external_settlement",
      coin: coin,
      amount: amount.toString(),
      netAmount: netAmount.toString(),
      fee: networkFee.toString(),
      withdrawAddress,
      memo: memo || null,
      status: "processing",
      timestamp: Date.now(),
    };

    const txKey = `user:${normalizedAddress}:transactions`;

    // ── P2: CARD-FUNDED HOLD — block extracting unsettled card value.
    const cryptoHold = await assertCardHoldAllows(normalizedAddress, await usdValueOf(coin, amount));
    if (!cryptoHold.ok) {
      return NextResponse.json({ error: cryptoHold.error, code: cryptoHold.code, details: cryptoHold.details }, { status: 403 });
    }

    // Önce bakiyeyi düş
    await redis.hincrbyfloat(balanceKey, balanceFieldKey, -amount);

    // Transaction'ı kaydet
    await redis.lpush(txKey, JSON.stringify(transaction));

    // Send "requested" email (Stage 1 of 3)
    (async () => {
      try {
        const userId = await redis.get(`user:address:${normalizedAddress}`);
        if (userId) {
          const userData = await redis.hgetall(`user:${userId}`);
          if (userData?.email) {
            const userLang = await getUserLanguage(normalizedAddress);
            await sendWithdrawRequestedEmail(
              userData.email as string,
              userData.name as string || 'User',
              amount.toString(),
              coin,
              withdrawAddress,
              networkFee.toString() + ' ' + coin,
              userLang
            );
          }
        }
      } catch (e) {
        console.error('Failed to send withdraw-requested email:', e);
      }
    })();

    // ===== GERÇEK BLOCKCHAIN TRANSFERİ =====
    console.log(`🚀 Processing ${coin} withdraw: ${netAmount} to ${withdrawAddress} (network: ${network || 'default'})`);

    const withdrawResult = await processWithdraw(
      coin,
      withdrawAddress,
      netAmount,
      coin === "XRP" && memo ? parseInt(memo) : undefined,
      network
    );

    // Log detailed result for debugging
    console.log(`📋 Withdraw result: success=${withdrawResult.success}, txHash=${withdrawResult.txHash || 'none'}, error=${withdrawResult.error || 'none'}`);

    if (withdrawResult.success) {
      // Başarılı - transaction'ı güncelle
      const transactions = await redis.lrange(txKey, 0, 50);
      const updatedTransactions = transactions.map((tx: any) => {
        const parsed = typeof tx === 'string' ? JSON.parse(tx) : tx;
        if (parsed.id === txId) {
          return JSON.stringify({
            ...parsed,
            status: "completed",
            txHash: withdrawResult.txHash,
            blockchainFee: withdrawResult.fee,
            completedAt: Date.now(),
          });
        }
        return typeof tx === 'string' ? tx : JSON.stringify(tx);
      });

      // Transaction listesini güncelle
      await redis.del(txKey);
      if (updatedTransactions.length > 0) {
        await redis.rpush(txKey, ...updatedTransactions.reverse());
      }

      console.log(`✅ Withdraw completed: ${withdrawResult.txHash}`);

      // Send email notification (non-blocking)
      (async () => {
        try {
          const userId = await redis.get(`user:address:${normalizedAddress}`);
          if (userId) {
            const userData = await redis.hgetall(`user:${userId}`);
            if (userData?.email) {
              const userLang = await getUserLanguage(normalizedAddress);
              await sendWithdrawConfirmedEmail(
                userData.email as string,
                userData.name as string || 'User',
                amount.toString(),
                coin,
                withdrawAddress,
                withdrawResult.txHash,
                networkFee.toString() + ' ' + coin,
                userLang
              );
            }
          }
        } catch (e) {
          console.error('Failed to send withdraw email:', e);
        }
      })();

      const updatedBalance = await redis.hgetall(balanceKey);

      // Push notification (non-blocking)
      const { notifyTransactionRich } = await import('@/lib/notification-sender');
      notifyTransactionRich(normalizedAddress, {
        type: 'withdrawal', amount: netAmount, token: coin.toUpperCase(),
        toAddress: withdrawAddress, txHash: withdrawResult.txHash, channel: 'default',
      }).catch(err => console.error('[Push] withdraw notification error:', err));

      return NextResponse.json({
        success: true,
        withdrawal: {
          id: txId,
          coin,
          amount,
          netAmount,
          networkFee,
          withdrawAddress,
          status: "completed",
          txHash: withdrawResult.txHash,
          explorerUrl: getExplorerUrl(coin, withdrawResult.txHash!),
        },
        balances: {
          [balanceFieldKey]: parseFloat(updatedBalance?.[balanceFieldKey] as string || "0"),
        },
      });

    } else {
      // Başarısız - bakiyeyi geri yükle
      await redis.hincrbyfloat(balanceKey, balanceFieldKey, amount);
      
      // Transaction'ı failed olarak güncelle
      const transactions = await redis.lrange(txKey, 0, 50);
      const updatedTransactions = transactions.map((tx: any) => {
        const parsed = typeof tx === 'string' ? JSON.parse(tx) : tx;
        if (parsed.id === txId) {
          return JSON.stringify({
            ...parsed,
            status: "failed",
            error: withdrawResult.error,
            failedAt: Date.now(),
          });
        }
        return typeof tx === 'string' ? tx : JSON.stringify(tx);
      });

      await redis.del(txKey);
      if (updatedTransactions.length > 0) {
        await redis.rpush(txKey, ...updatedTransactions.reverse());
      }

      console.error(`❌ Withdraw failed: ${withdrawResult.error}`);

      // Map blockchain errors to user-friendly messages
      let userError = withdrawResult.error || "Withdrawal failed";
      if (userError.includes("Insufficient USDT balance")) {
        userError = "Hot wallet USDT balance insufficient. Please contact support.";
      } else if (userError.includes("Insufficient ETH for gas")) {
        userError = "Hot wallet ETH gas balance insufficient. Please contact support.";
      } else if (userError.includes("Insufficient hot wallet balance")) {
        userError = "Hot wallet balance insufficient. Please contact support.";
      } else if (userError.includes("private key not configured")) {
        userError = "Withdrawal service temporarily unavailable. Please contact support.";
      } else if (userError.includes("Insufficient SOL balance")) {
        userError = "Hot wallet SOL balance insufficient. Please contact support.";
      } else if (userError.includes("Insufficient XRP balance")) {
        userError = "Hot wallet XRP balance insufficient. Please contact support.";
      }

      return NextResponse.json({
        error: userError,
        debugError: withdrawResult.error, // Detailed error for debugging
        refunded: true,
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Withdraw error:", error);
    return NextResponse.json({ error: "Withdrawal failed: " + error.message }, { status: 500 });
  }
}

// Explorer URL helper
function getExplorerUrl(coin: string, txHash: string): string {
  switch (coin) {
    case 'ETH':
    case 'USDT':
      return `https://etherscan.io/tx/${txHash}`;
    case 'XRP':
      return `https://xrpscan.com/tx/${txHash}`;
    case 'SOL':
      return `https://solscan.io/tx/${txHash}`;
    case 'BTC':
      return `https://blockstream.info/tx/${txHash}`;
    default:
      return '';
  }
}
