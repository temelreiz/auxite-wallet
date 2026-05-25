// ============================================
// AUXITE PROCUREMENT PIPELINE
// ============================================
// Orchestrates the full procurement cycle:
//
//   Trade happens → Queue → Convert Crypto → Buy Metal → Done
//
//   Step 1: Batch pending orders by metal
//   Step 2: Convert crypto → USDT (Binance spot sell)
//   Step 3: Calculate TL needed (USDT → TL via USD/TL rate)
//   Step 4: Buy metal from KuveytTürk (already have TL in account)
//   Step 5: Close hedge, mark complete
//
// IMPORTANT: This assumes TL liquidity is available in KuveytTürk
// account. The crypto→USDT conversion tracks what needs to be
// replenished. Actual TL funding is a treasury operation.
// ============================================

import {
  createProcurementOrder,
  getAllPendingOrders,
  getPendingOrdersByMetal,
  updateProcurementStatus,
  recordCryptoConversion,
  recordKtPurchase,
  createBatch,
  getProcurementConfig,
  type ProcurementOrder,
} from './procurement-service';

import {
  needsConversion,
  createLiquidationOrder,
  executeLiquidation,
  getCryptoSpotPrice,
} from './crypto-liquidation-service';

import {
  buyPreciousMetal,
  getPreciousMetalRates,
  getUsdTlRate,
  getMetalAccountSuffix,
  AUXITE_TO_KT_MAP,
  type PreciousMetalRate,
} from './kuveytturk-service';

import { closeHedge } from './hedge-engine';
import { notifyTrade } from './telegram';

// ============================================
// MAIN: PROCESS PROCUREMENT QUEUE
// ============================================
// Called by cron job every 5 minutes

export async function processProcurementQueue(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  details: Array<{
    orderId: string;
    metal: string;
    grams: number;
    status: string;
    error?: string;
  }>;
}> {
  const config = await getProcurementConfig();

  if (!config.enabled) {
    console.log('⏸️ Procurement pipeline is disabled');
    return { processed: 0, succeeded: 0, failed: 0, skipped: 0, details: [] };
  }

  console.log('🔄 Processing procurement queue...');

  const pendingOrders = await getAllPendingOrders();

  if (pendingOrders.length === 0) {
    console.log('✅ No pending procurement orders');
    return { processed: 0, succeeded: 0, failed: 0, skipped: 0, details: [] };
  }

  console.log(`📦 Found ${pendingOrders.length} pending procurement orders`);

  let processed = 0, succeeded = 0, failed = 0, skipped = 0;
  const details: Array<{ orderId: string; metal: string; grams: number; status: string; error?: string }> = [];

  // Process each order individually
  for (const order of pendingOrders) {
    try {
      const result = await processOrder(order, config);
      processed++;

      if (result.success) {
        succeeded++;
        details.push({ orderId: order.id, metal: order.metal, grams: order.metalGrams, status: 'completed' });
      } else if (result.skipped) {
        skipped++;
        details.push({ orderId: order.id, metal: order.metal, grams: order.metalGrams, status: 'skipped', error: result.error });
      } else {
        failed++;
        details.push({ orderId: order.id, metal: order.metal, grams: order.metalGrams, status: 'failed', error: result.error });
      }
    } catch (error: any) {
      failed++;
      details.push({ orderId: order.id, metal: order.metal, grams: order.metalGrams, status: 'error', error: error.message });

      await updateProcurementStatus(order.id, 'failed', `Pipeline error: ${error.message}`);
    }
  }

  const summary = `Procurement: ${processed} processed, ${succeeded} ok, ${failed} failed, ${skipped} skipped`;
  console.log(`📦 ${summary}`);

  // Notify admin on failures
  if (failed > 0) {
    try {
      await notifyTrade({
        type: 'procurement_alert',
        message: `⚠️ PROCUREMENT ALERT\n${summary}\n\nFailed orders:\n${details.filter(d => d.status === 'failed' || d.status === 'error').map(d => `• ${d.orderId}: ${d.error}`).join('\n')}`,
      } as any);
    } catch { /* telegram notification is best-effort */ }
  }

  return { processed, succeeded, failed, skipped, details };
}

// ============================================
// PROCESS SINGLE ORDER
// ============================================

async function processOrder(
  order: ProcurementOrder,
  config: Awaited<ReturnType<typeof getProcurementConfig>>,
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {

  // ── Step 1: Convert crypto to USDT (if needed) ──
  if (needsConversion(order.fromToken)) {
    if (!config.autoConvertCrypto) {
      return { success: false, skipped: true, error: 'Auto crypto conversion disabled' };
    }

    await updateProcurementStatus(order.id, 'converting_crypto', `Converting ${order.fromAmount} ${order.fromToken} → USDT`);

    try {
      // Create and execute liquidation order
      const liqOrder = await createLiquidationOrder(
        order.id,
        order.fromToken,
        order.fromAmount,
        order.fromValueUSD,
      );

      const result = await executeLiquidation(liqOrder.id);

      if (!result || result.status === 'failed') {
        // If Binance isn't configured, mark for manual review
        const errorMsg = result?.error || 'Liquidation failed';

        if (errorMsg.includes('not configured')) {
          await updateProcurementStatus(order.id, 'manual_review',
            `Binance API not configured. Manual crypto liquidation needed: ${order.fromAmount} ${order.fromToken}`,
          );
          return { success: false, skipped: true, error: 'Manual liquidation needed' };
        }

        // Check retry count
        if (order.retryCount < config.maxRetries) {
          order.retryCount++;
          await updateProcurementStatus(order.id, 'pending', `Crypto conversion failed (attempt ${order.retryCount}/${config.maxRetries}): ${errorMsg}`);
          return { success: false, error: `Retry ${order.retryCount}: ${errorMsg}` };
        }

        await updateProcurementStatus(order.id, 'failed', `Crypto conversion failed after ${config.maxRetries} attempts: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      // Record conversion
      await recordCryptoConversion(order.id, {
        exchange: 'binance',
        orderId: result.exchangeOrderId,
        soldAmount: order.fromAmount,
        receivedUSDT: result.actualUSDT || order.fromValueUSD,
        rate: result.rate || 0,
        completedAt: Date.now(),
      });

      await updateProcurementStatus(order.id, 'crypto_converted',
        `Converted ${order.fromAmount} ${order.fromToken} → ${(result.actualUSDT || order.fromValueUSD).toFixed(2)} USDT`,
      );

    } catch (error: any) {
      await updateProcurementStatus(order.id, 'failed', `Crypto conversion error: ${error.message}`);
      return { success: false, error: error.message };
    }
  } else {
    // AUXM or USDT payment — no conversion needed
    await updateProcurementStatus(order.id, 'crypto_converted',
      `No conversion needed (${order.fromToken} is USD-denominated)`,
    );
  }

  // ── Step 2: Buy metal from KuveytTürk ──
  if (!config.autoPurchaseMetal) {
    await updateProcurementStatus(order.id, 'manual_review', 'Auto metal purchase disabled - manual KuveytTürk buy needed');
    return { success: false, skipped: true, error: 'Manual purchase mode' };
  }

  await updateProcurementStatus(order.id, 'purchasing_metal', `Buying ${order.metalGrams.toFixed(3)}g ${order.metal} from KuveytTürk`);

  try {
    // Get current KuveytTürk rates
    const rates = await getPreciousMetalRates();
    const usdTlRate = await getUsdTlRate();

    // Find the rate for this metal
    const ktFxCode = AUXITE_TO_KT_MAP[order.metal];
    if (!ktFxCode) {
      throw new Error(`Unknown metal mapping for ${order.metal}`);
    }

    const metalRate = rates.find(r => r.fxCode === ktFxCode);
    if (!metalRate) {
      throw new Error(`KuveytTürk rate not found for ${ktFxCode}`);
    }

    const buyRateTL = metalRate.buyRate; // TL per gram (bank's selling price)
    const totalTL = buyRateTL * order.metalGrams;
    const usdEquivalent = totalTL / usdTlRate.sell;

    // ── Cost-coverage guard ──
    // Verify the price we charged the user covers the all-in procurement cost
    // (KT ask + HTX fee + USD/TL FX spread + fixed transfer fee). If margin is
    // below the configured minimum, hold the order for manual review instead
    // of buying at a loss. Skipped when the charged price is unknown (0).
    const cm = config.costModel;
    if (cm?.blockOnNegativeMargin && order.tradePricePerGram > 0) {
      const ktCostPerGramUSD = buyRateTL / usdTlRate.sell;                 // KT ask, USD/g
      const feeFactor = 1 + (cm.htxFeePct + cm.fxSpreadPct) / 100;         // HTX + USD/TL FX
      const allInPerGram =
        ktCostPerGramUSD * feeFactor + cm.withdrawFeeUSD / Math.max(order.metalGrams, 1e-9);
      const revenuePerGram = order.tradePricePerGram;                      // USD/g charged
      const marginPct = allInPerGram > 0 ? ((revenuePerGram - allInPerGram) / allInPerGram) * 100 : 0;
      const marginUSD = (revenuePerGram - allInPerGram) * order.metalGrams;

      if (marginPct < cm.minMarginPct) {
        await updateProcurementStatus(order.id, 'manual_review',
          `Low/negative margin ${marginPct.toFixed(2)}% (min ${cm.minMarginPct}%): charged $${revenuePerGram.toFixed(2)}/g vs all-in cost $${allInPerGram.toFixed(2)}/g (KT $${ktCostPerGramUSD.toFixed(2)} + HTX ${cm.htxFeePct}% + FX ${cm.fxSpreadPct}%). Held before purchase.`,
          { ktCostPerGramUSD, allInPerGram, revenuePerGram, marginPct, marginUSD },
        );
        try {
          await notifyTrade({
            type: 'procurement_margin_alert',
            message: `⚠️ MARGIN HOLD: ${order.metalGrams.toFixed(3)}g ${order.metal} — margin ${marginPct.toFixed(2)}% (charged $${revenuePerGram.toFixed(2)}/g, all-in cost $${allInPerGram.toFixed(2)}/g). Order ${order.id} → manual_review.`,
          } as any);
        } catch { /* telegram best-effort */ }
        return { success: false, skipped: true, error: `Low margin ${marginPct.toFixed(2)}%` };
      }
    }

    console.log(`🏦 KuveytTürk buy: ${order.metalGrams.toFixed(3)}g ${order.metal}`);
    console.log(`   Rate: ${buyRateTL.toFixed(2)} TL/gram`);
    console.log(`   Total: ${totalTL.toFixed(2)} TL (~$${usdEquivalent.toFixed(2)})`);

    // Execute KuveytTürk purchase.
    // From = funding account: USD account (suffix 102) per treasury decision;
    // falls back to a TL account if USD env unset. To = the metal's OWN account
    // (Gold 101 / Silver 103 / Platinum 104 / Palladium 105), resolved per metal.
    // NOTE: BuyRate below is KT's TL/gram rate. If KT requires the funding
    // currency to match the rate when buying from the USD account, verify on
    // sandbox whether a USD rate / different param is needed.
    const ktAccountFrom = parseInt(
      process.env.KUVEYTTURK_ACCOUNT_USD || process.env.KUVEYTTURK_ACCOUNT_TL || '0',
    );
    const ktAccountTo = getMetalAccountSuffix(order.metal);
    const ktUsername = process.env.KUVEYTTURK_USERNAME || '';

    if (!ktAccountFrom || !ktAccountTo || !ktUsername) {
      // KuveytTürk accounts not configured — mark for manual review
      await updateProcurementStatus(order.id, 'manual_review',
        `KuveytTürk accounts not configured (from=${ktAccountFrom || 'unset'}, to[${order.metal}]=${ktAccountTo || 'unset'}). Manual purchase needed: ${order.metalGrams.toFixed(3)}g ${order.metal} @ ${buyRateTL.toFixed(2)} TL/g = ${totalTL.toFixed(2)} TL`,
        { buyRateTL, totalTL, usdEquivalent },
      );

      // Still record the KT purchase info for reference
      await recordKtPurchase(order.id, {
        referenceId: 'MANUAL_PENDING',
        metalGrams: order.metalGrams,
        rateTLPerGram: buyRateTL,
        totalTL,
        usdEquivalent,
        completedAt: Date.now(),
      });

      return { success: false, skipped: true, error: 'KuveytTürk accounts not configured' };
    }

    // Execute the API purchase
    const purchaseResult = await buyPreciousMetal({
      AccountSuffixFrom: ktAccountFrom,
      AccountSuffixTo: ktAccountTo,
      CorporateWebUserName: ktUsername,
      BuyRate: buyRateTL,
      ExchangeAmount: order.metalGrams,
    });

    if (!purchaseResult.success) {
      throw new Error(`KuveytTürk buy failed: ${JSON.stringify(purchaseResult.errors)}`);
    }

    // Record KuveytTürk purchase
    await recordKtPurchase(order.id, {
      referenceId: purchaseResult.executionReferenceId || `KT-${Date.now()}`,
      metalGrams: order.metalGrams,
      rateTLPerGram: buyRateTL,
      totalTL,
      usdEquivalent,
      completedAt: Date.now(),
    });

    console.log(`✅ KuveytTürk purchase complete: ${purchaseResult.executionReferenceId}`);

  } catch (error: any) {
    console.error(`❌ KuveytTürk purchase failed:`, error);

    if (order.retryCount < config.maxRetries) {
      order.retryCount++;
      await updateProcurementStatus(order.id, 'crypto_converted',
        `KuveytTürk purchase failed (attempt ${order.retryCount}/${config.maxRetries}): ${error.message}`,
      );
      return { success: false, error: `KT retry ${order.retryCount}: ${error.message}` };
    }

    await updateProcurementStatus(order.id, 'failed', `KuveytTürk purchase failed: ${error.message}`);
    return { success: false, error: error.message };
  }

  // ── Step 3: Close hedge ──
  if (order.hedgeId) {
    try {
      const metalRate = order.ktPurchase?.rateTLPerGram || order.tradePricePerGram;
      const hedgeResult = await closeHedge(order.hedgeId, metalRate);
      if (hedgeResult.success) {
        console.log(`✅ Hedge closed: ${order.hedgeId} | P&L: $${hedgeResult.pnl.toFixed(2)}`);
      }
    } catch (error) {
      console.warn(`⚠️ Hedge close failed for ${order.hedgeId}:`, error);
      // Don't fail the procurement — hedge close is supplementary
    }
  }

  // ── Step 4: Mark complete ──
  await updateProcurementStatus(order.id, 'completed',
    `Procurement complete: ${order.metalGrams.toFixed(3)}g ${order.metal} purchased from KuveytTürk`,
    {
      ktRate: order.ktPurchase?.rateTLPerGram,
      totalTL: order.ktPurchase?.totalTL,
      usdEquivalent: order.ktPurchase?.usdEquivalent,
    },
  );

  return { success: true };
}

// ============================================
// MANUAL TRIGGER: Process specific metal
// ============================================

export async function processMetalProcurement(metal: string): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const config = await getProcurementConfig();
  const orders = await getPendingOrdersByMetal(metal);

  let processed = 0, succeeded = 0, failed = 0;

  for (const order of orders) {
    const result = await processOrder(order, config);
    processed++;
    if (result.success) succeeded++;
    else failed++;
  }

  return { processed, succeeded, failed };
}

// ============================================
// QUEUE TRADE FOR PROCUREMENT
// ============================================
// Called from trade route after successful trade

export async function queueTradeForProcurement(params: {
  tradeId: string;
  userAddress: string;
  type: 'buy' | 'sell';
  fromToken: string;
  fromAmount: number;
  toToken: string;
  toAmount: number;
  pricePerGram: number;
  fee: number;
  hedgeId?: string;
}): Promise<string | null> {
  // Only queue BUY trades (user buying metal = we need to procure)
  // SELL trades = user returning metal, no procurement needed
  if (params.type !== 'buy') {
    return null;
  }

  const metal = params.toToken.toUpperCase();
  const METALS = ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'];

  if (!METALS.includes(metal)) {
    return null; // Not a metal purchase
  }

  // Calculate USD value of what user paid
  let fromValueUSD = params.fromAmount;

  if (params.fromToken.toUpperCase() !== 'AUXM' && params.fromToken.toUpperCase() !== 'USDT') {
    // For crypto payments, get current price from the active liquidation venue
    const price = await getCryptoSpotPrice(params.fromToken);
    if (price > 0) {
      fromValueUSD = params.fromAmount * price;
    }
  }

  const order = await createProcurementOrder({
    tradeId: params.tradeId,
    userAddress: params.userAddress,
    fromToken: params.fromToken,
    fromAmount: params.fromAmount,
    fromValueUSD,
    metal,
    metalGrams: params.toAmount,
    tradePricePerGram: params.pricePerGram,
    hedgeId: params.hedgeId,
  });

  return order.id;
}
