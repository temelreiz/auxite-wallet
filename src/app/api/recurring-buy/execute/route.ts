/**
 * Recurring Buy (DCA) Execution API
 *
 * Called hourly by /api/cron/execute-all. Runs each active plan whose day and
 * hour (UTC) match, buying through the user's own routes — see
 * src/lib/recurring-exec.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { formatAmount } from '@/lib/format';
import { checkTradingAllowed } from '@/lib/trading-guard';
import { isCronRequest } from '@/lib/security/require-user';
import { getBalances, buyMetal, stakeMetal, notify } from '@/lib/recurring-exec';

export async function POST(request: NextRequest) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Kill Switch / Trading Guard — maintenance'de DCA'lar atlanır
    const tradingCheck = await checkTradingAllowed('metalTrading');
    if (!tradingCheck.allowed) {
      return NextResponse.json(
        { error: 'DCA execution skipped — trading disabled', reason: tradingCheck.reason },
        { status: 503 }
      );
    }

    const now = new Date();
    const results: any[] = [];

    const activeWalletsData = await redis.get('dca:active-wallets');
    const activeWallets: string[] = activeWalletsData
      ? (typeof activeWalletsData === 'string' ? JSON.parse(activeWalletsData) : activeWalletsData)
      : [];

    for (const walletAddress of activeWallets) {
      const plansData = await redis.get('recurring-buy:' + walletAddress);
      if (!plansData) continue;

      const plans = typeof plansData === 'string' ? JSON.parse(plansData) : plansData;
      let updated = false;

      for (const plan of plans) {
        if (plan.status !== 'active') continue;
        if (!isDue(plan, now)) continue;

        try {
          const sourceKey = plan.paymentSource.replace('_balance', '');
          const balances = await getBalances(walletAddress);

          if ((balances[sourceKey] || 0) < plan.amount) {
            await notify(walletAddress, 'Recurring buy skipped', `Not enough ${sourceKey.toUpperCase()} for your ${plan.token} plan.`);
            results.push({ planId: plan.id, status: 'skipped', reason: 'insufficient_balance' });
            // Count the slot as handled so it is not retried every hour today.
            plan.stats.lastAttemptAt = now.toISOString();
            plan.stats.nextExecutionAt = calculateNextExecution(plan, now);
            updated = true;
            continue;
          }

          const buy = await buyMetal(walletAddress, plan.paymentSource, plan.token, plan.amount);
          plan.stats.lastAttemptAt = now.toISOString();
          updated = true;

          if (!buy.ok) {
            results.push({ planId: plan.id, status: 'failed', error: buy.error });
            continue;
          }

          plan.stats.executionCount++;
          plan.stats.totalSpent += plan.amount;
          plan.stats.totalPurchased += buy.grams;
          plan.stats.averagePrice = plan.stats.totalPurchased > 0 ? plan.stats.totalSpent / plan.stats.totalPurchased : 0;
          plan.stats.nextExecutionAt = calculateNextExecution(plan, now);

          if (plan.autoStake && plan.stakeDuration) {
            const stake = await stakeMetal(walletAddress, plan.token, buy.grams, plan.stakeDuration);
            await notify(
              walletAddress,
              'Recurring buy completed',
              formatAmount(buy.grams, plan.token) + 'g ' + plan.token + (stake.ok ? ' bought and staked.' : ' bought (staking failed).'),
            );
          } else {
            await notify(walletAddress, 'Recurring buy completed', formatAmount(buy.grams, plan.token) + 'g ' + plan.token + ' bought.');
          }

          results.push({ planId: plan.id, status: 'executed', grams: buy.grams });
        } catch (err: any) {
          results.push({ planId: plan.id, status: 'error', error: err.message });
        }
      }

      if (updated) {
        await redis.set('recurring-buy:' + walletAddress, JSON.stringify(plans));
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
    console.error('DCA execution error:', error);
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
    case 'daily': return true;
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
    case 'daily': next.setUTCDate(next.getUTCDate() + 1); break;
    case 'weekly': next.setUTCDate(next.getUTCDate() + 7); break;
    case 'biweekly': next.setUTCDate(next.getUTCDate() + 14); break;
    case 'monthly': next.setUTCMonth(next.getUTCMonth() + 1); break;
  }
  return next.toISOString();
}
