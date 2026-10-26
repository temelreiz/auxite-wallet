/**
 * Recurring Stake Execution API
 *
 * Called hourly by /api/cron/execute-all. For each due plan: stake `amount`
 * grams; if the metal balance is short and the plan names a USD/USDT source,
 * buy the shortfall first. All calls go through the user's own routes — see
 * src/lib/recurring-exec.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { checkTradingAllowed } from '@/lib/trading-guard';
import { isCronRequest } from '@/lib/security/require-user';
import { getBalances, askPerGram, buyMetal, stakeMetal, notify } from '@/lib/recurring-exec';

// Buy a little over the shortfall so spread/rounding still leaves enough grams.
const BUY_BUFFER = 1.01;

export async function POST(request: NextRequest) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tradingCheck = await checkTradingAllowed('metalTrading');
    if (!tradingCheck.allowed) {
      return NextResponse.json(
        { error: 'Recurring stake skipped — trading disabled', reason: tradingCheck.reason },
        { status: 503 }
      );
    }

    const now = new Date();
    const results: any[] = [];

    const activeWalletsData = await redis.get('stake:active-wallets');
    const activeWallets: string[] = activeWalletsData
      ? (typeof activeWalletsData === 'string' ? JSON.parse(activeWalletsData) : activeWalletsData)
      : [];

    for (const walletAddress of activeWallets) {
      const plansData = await redis.get('recurring-stake:' + walletAddress);
      if (!plansData) continue;

      const plans = typeof plansData === 'string' ? JSON.parse(plansData) : plansData;
      let updated = false;

      for (const plan of plans) {
        if (plan.status !== 'active') continue;
        if (!isDue(plan, now)) continue;

        plan.stats.lastAttemptAt = now.toISOString();
        plan.stats.nextExecutionAt = calculateNextExecution(plan, now);
        updated = true;

        try {
          const metalKey = plan.token.toLowerCase();
          let metalBalance = (await getBalances(walletAddress))[metalKey] || 0;
          let purchased = 0;

          if (metalBalance < plan.amount) {
            if (plan.paymentSource === 'metal_balance') {
              await notify(walletAddress, 'Recurring stake skipped', `Not enough ${plan.token} to stake ${plan.amount}g.`);
              results.push({ planId: plan.id, status: 'skipped', reason: 'insufficient_metal' });
              continue;
            }

            const shortfall = plan.amount - metalBalance;
            const cost = Math.ceil(shortfall * (await askPerGram(plan.token)) * BUY_BUFFER * 100) / 100;
            const buy = await buyMetal(walletAddress, plan.paymentSource, plan.token, cost);
            if (!buy.ok) {
              await notify(walletAddress, 'Recurring stake failed', `Could not buy ${plan.token} for your plan.`);
              results.push({ planId: plan.id, status: 'failed', reason: 'buy_failed', error: buy.error });
              continue;
            }
            purchased = buy.grams;
            metalBalance += purchased;
          }

          const stakeAmount = Math.min(plan.amount, metalBalance);
          const stake = await stakeMetal(walletAddress, plan.token, stakeAmount, plan.stakeDuration);
          if (!stake.ok) {
            results.push({ planId: plan.id, status: 'failed', error: stake.error });
            continue;
          }

          plan.stats.executionCount++;
          plan.stats.totalStaked += stakeAmount;
          plan.stats.totalSpent += purchased;
          plan.stats.lastExecutionAt = now.toISOString();

          await notify(
            walletAddress,
            'Recurring stake completed',
            (purchased > 0 ? purchased.toFixed(4) + 'g ' + plan.token + ' bought, ' : '') +
              stakeAmount.toFixed(4) + 'g ' + plan.token + ' staked.',
          );
          results.push({ planId: plan.id, status: 'executed', staked: stakeAmount, purchased });
        } catch (err: any) {
          results.push({ planId: plan.id, status: 'error', error: err.message });
        }
      }

      if (updated) {
        await redis.set('recurring-stake:' + walletAddress, JSON.stringify(plans));
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
      summary: {
        executed: results.filter(r => r.status === 'executed').length,
        skipped: results.filter(r => r.status === 'skipped').length,
        failed: results.filter(r => r.status === 'failed' || r.status === 'error').length,
      }
    });
  } catch (error: any) {
    console.error('Recurring stake execution error:', error);
    return NextResponse.json({ error: error.message || 'Execution failed' }, { status: 500 });
  }
}

/** Due when today matches the plan's schedule, the hour has come (UTC), and today's slot has not run. */
function isDue(plan: any, now: Date): boolean {
  if (now.getUTCHours() < (plan.hour ?? 9)) return false;
  const last = plan.stats?.lastAttemptAt ? new Date(plan.stats.lastAttemptAt) : null;
  if (last && last.toISOString().slice(0, 10) === now.toISOString().slice(0, 10)) return false;

  const dayOfWeek = now.getUTCDay();
  const dayOfMonth = now.getUTCDate();
  switch (plan.frequency) {
    case 'weekly': return dayOfWeek === (plan.dayOfWeek ?? 1);
    case 'biweekly': {
      const weekOfMonth = Math.ceil(dayOfMonth / 7);
      return dayOfWeek === (plan.dayOfWeek ?? 1) && (weekOfMonth === 1 || weekOfMonth === 3);
    }
    case 'monthly': return dayOfMonth === (plan.dayOfMonth ?? 1);
    default: return false;
  }
}

function calculateNextExecution(plan: any, now: Date): string {
  const next = new Date(now);
  next.setUTCHours(plan.hour ?? 9, 0, 0, 0);
  switch (plan.frequency) {
    case 'weekly': next.setUTCDate(next.getUTCDate() + 7); break;
    case 'biweekly': next.setUTCDate(next.getUTCDate() + 14); break;
    case 'monthly': next.setUTCMonth(next.getUTCMonth() + 1); break;
  }
  return next.toISOString();
}
