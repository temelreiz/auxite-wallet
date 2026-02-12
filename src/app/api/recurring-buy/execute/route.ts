/**
 * Recurring Buy (DCA) Execution API
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { formatAmount } from '@/lib/format';

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const currentHour = now.getHours();
    const results: any[] = [];

    // Aktif wallet listesini al
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
        if (plan.hour !== currentHour) continue;
        if (!checkShouldExecute(plan, now)) continue;

        const balanceKey = plan.paymentSource.replace('_balance', '');
        const balances = await redis.hgetall('balances:' + walletAddress);
        const sourceBalance = parseFloat((balances as Record<string, string>)?.[balanceKey] || '0');

        if (sourceBalance < plan.amount) {
          await sendNotification(walletAddress, {
            title: 'Duzenli Yatirim Basarisiz',
            body: plan.token + ' alimi icin yeterli bakiye yok.',
            type: 'dca_failed'
          });
          results.push({ planId: plan.id, status: 'skipped', reason: 'insufficient_balance' });
          continue;
        }

        try {
          const tradeResult = await executeTrade(walletAddress, plan);

          if (tradeResult.success) {
            plan.stats.executionCount++;
            plan.stats.totalSpent += plan.amount;
            plan.stats.totalPurchased += tradeResult.toAmount;
            plan.stats.averagePrice = plan.stats.totalSpent / plan.stats.totalPurchased;
            plan.stats.nextExecutionAt = calculateNextExecution(plan);
            updated = true;

            if (plan.autoStake && plan.stakeDuration) {
              await executeStake(walletAddress, plan.token, tradeResult.toAmount, plan.stakeDuration);
              await sendNotification(walletAddress, {
                title: 'Duzenli Yatirim + Biriktirme',
                body: formatAmount(tradeResult.toAmount, plan.token) + 'g ' + plan.token + ' alindi ve stake edildi.',
                type: 'dca_stake_success'
              });
            } else {
              await sendNotification(walletAddress, {
                title: 'Duzenli Yatirim Basarili',
                body: formatAmount(tradeResult.toAmount, plan.token) + 'g ' + plan.token + ' alindi.',
                type: 'dca_success'
              });
            }

            results.push({ planId: plan.id, status: 'executed', toAmount: tradeResult.toAmount });
          } else {
            results.push({ planId: plan.id, status: 'failed', error: tradeResult.error });
          }
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

function checkShouldExecute(plan: any, now: Date): boolean {
  const dayOfWeek = now.getDay();
  const dayOfMonth = now.getDate();

  switch (plan.frequency) {
    case 'daily': return true;
    case 'weekly': return dayOfWeek === (plan.dayOfWeek ?? 1);
    case 'biweekly':
      const weekOfMonth = Math.ceil(dayOfMonth / 7);
      return dayOfWeek === (plan.dayOfWeek ?? 1) && (weekOfMonth === 1 || weekOfMonth === 3);
    case 'monthly': return dayOfMonth === (plan.dayOfMonth ?? 1);
    default: return false;
  }
}

function calculateNextExecution(plan: any): string {
  const next = new Date();
  next.setHours(plan.hour, 0, 0, 0);

  switch (plan.frequency) {
    case 'daily': next.setDate(next.getDate() + 1); break;
    case 'weekly': next.setDate(next.getDate() + 7); break;
    case 'biweekly': next.setDate(next.getDate() + 14); break;
    case 'monthly': next.setMonth(next.getMonth() + 1); break;
  }

  return next.toISOString();
}

async function executeTrade(walletAddress: string, plan: any) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  const response = await fetch(baseUrl + '/api/trade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-wallet-address': walletAddress },
    body: JSON.stringify({
      address: walletAddress,
      type: 'buy',
      fromToken: plan.paymentSource.replace('_balance', '').toUpperCase(),
      toToken: plan.token,
      fromAmount: plan.amount,
      executeOnChain: false,
    }),
  });

  const data = await response.json();
  return { success: response.ok, toAmount: data.toAmount || 0, error: data.error };
}

async function executeStake(walletAddress: string, token: string, amount: number, duration: number) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  await fetch(baseUrl + '/api/staking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-wallet-address': walletAddress },
    body: JSON.stringify({ action: 'stake', token, amount, duration }),
  });
}

async function sendNotification(walletAddress: string, notification: { title: string; body: string; type: string }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  try {
    await fetch(baseUrl + '/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.INTERNAL_API_KEY || '' },
      body: JSON.stringify({ walletAddress, ...notification }),
    });
  } catch (err) {
    console.error('Failed to send notification:', err);
  }
}
