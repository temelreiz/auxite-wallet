/**
 * Recurring Stake Execution API
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

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
        if (plan.hour !== currentHour) continue;
        if (!checkShouldExecute(plan, now)) continue;

        const balances = await redis.hgetall('balances:' + walletAddress);
        const metalBalance = parseFloat((balances as Record<string, string>)?.[plan.token.toLowerCase()] || '0');

        let stakeAmount = plan.amount;
        let purchasedAmount = 0;

        // Metal bakiyesi yetersizse fallback source kullan
        if (metalBalance < plan.amount && plan.paymentSource !== 'metal_balance') {
          const needed = plan.amount - metalBalance;
          const sourceKey = plan.paymentSource.replace('_balance', '');
          const sourceBalance = parseFloat((balances as Record<string, string>)?.[sourceKey] || '0');

          const priceData = await getMetalPrice(plan.token);
          const requiredAmount = needed * priceData.askPerGram;

          if (sourceBalance >= requiredAmount) {
            const buyResult = await executeBuy(walletAddress, plan, needed, requiredAmount);
            
            if (buyResult.success) {
              purchasedAmount = buyResult.toAmount;
              stakeAmount = metalBalance + purchasedAmount;
            } else {
              await sendNotification(walletAddress, {
                title: 'Duzenli Birikim Basarisiz',
                body: plan.token + ' alimi basarisiz.',
                type: 'recurring_stake_failed'
              });
              results.push({ planId: plan.id, status: 'failed', reason: 'buy_failed' });
              continue;
            }
          } else {
            await sendNotification(walletAddress, {
              title: 'Duzenli Birikim Basarisiz',
              body: plan.token + ' biriktirme icin yeterli bakiye yok.',
              type: 'recurring_stake_failed'
            });
            results.push({ planId: plan.id, status: 'skipped', reason: 'insufficient_balance' });
            continue;
          }
        } else if (metalBalance < plan.amount) {
          await sendNotification(walletAddress, {
            title: 'Duzenli Birikim Basarisiz',
            body: plan.token + ' bakiyeniz yetersiz.',
            type: 'recurring_stake_failed'
          });
          results.push({ planId: plan.id, status: 'skipped', reason: 'insufficient_metal' });
          continue;
        }

        try {
          const stakeResult = await executeStake(walletAddress, plan.token, stakeAmount, plan.stakeDuration);

          if (stakeResult.success) {
            plan.stats.executionCount++;
            plan.stats.totalStaked += stakeAmount;
            if (purchasedAmount > 0) {
              plan.stats.totalSpent += purchasedAmount;
            }
            plan.stats.lastExecutionAt = now.toISOString();
            plan.stats.nextExecutionAt = calculateNextExecution(plan);
            updated = true;

            const message = purchasedAmount > 0
              ? purchasedAmount.toFixed(4) + 'g ' + plan.token + ' alindi ve toplam ' + stakeAmount.toFixed(4) + 'g stake edildi.'
              : stakeAmount.toFixed(4) + 'g ' + plan.token + ' stake edildi.';

            await sendNotification(walletAddress, {
              title: 'Duzenli Birikim Basarili',
              body: message,
              type: 'recurring_stake_success'
            });

            results.push({ planId: plan.id, status: 'executed', staked: stakeAmount, purchased: purchasedAmount });
          } else {
            results.push({ planId: plan.id, status: 'failed', error: stakeResult.error });
          }
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

function checkShouldExecute(plan: any, now: Date): boolean {
  const dayOfWeek = now.getDay();
  const dayOfMonth = now.getDate();

  switch (plan.frequency) {
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
    case 'weekly': next.setDate(next.getDate() + 7); break;
    case 'biweekly': next.setDate(next.getDate() + 14); break;
    case 'monthly': next.setMonth(next.getMonth() + 1); break;
  }

  return next.toISOString();
}

async function getMetalPrice(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const response = await fetch(baseUrl + '/api/prices?token=' + token);
  const data = await response.json();
  return { askPerGram: data.askPerGram || data.ask || 100, bidPerGram: data.bidPerGram || data.bid || 95 };
}

async function executeBuy(walletAddress: string, plan: any, gramAmount: number, usdAmount: number) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  const response = await fetch(baseUrl + '/api/trade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-wallet-address': walletAddress },
    body: JSON.stringify({
      address: walletAddress,
      type: 'buy',
      fromToken: plan.paymentSource.replace('_balance', '').toUpperCase(),
      toToken: plan.token,
      fromAmount: usdAmount,
      executeOnChain: false,
    }),
  });

  const data = await response.json();
  return { success: response.ok, toAmount: data.toAmount || 0, error: data.error };
}

async function executeStake(walletAddress: string, token: string, amount: number, duration: number) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  const response = await fetch(baseUrl + '/api/staking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-wallet-address': walletAddress },
    body: JSON.stringify({ action: 'stake', token, amount, duration }),
  });

  const data = await response.json();
  return { success: response.ok, error: data.error };
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
