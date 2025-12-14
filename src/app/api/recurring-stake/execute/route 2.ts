/**
 * Recurring Stake Execution API
 * Cron job tarafından çağrılır
 * Zamanı gelen stake planlarını execute eder
 * Metal bakiyesi yoksa önce alım yapar, sonra stake eder
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    // API key kontrolü
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const currentHour = now.getHours();
    const results: any[] = [];

    // Tüm kullanıcıların planlarını tara
    const keys = await redis.keys('recurring-stake:0x*');

    for (const key of keys) {
      const walletAddress = key.replace('recurring-stake:', '');
      const plansData = await redis.get(key);
      if (!plansData) continue;

      const plans = typeof plansData === 'string' ? JSON.parse(plansData) : plansData;
      let updated = false;

      for (const plan of plans) {
        if (plan.status !== 'active') continue;
        if (plan.hour !== currentHour) continue;

        // Gün kontrolü
        if (!checkShouldExecute(plan, now)) continue;

        // Metal bakiyesini kontrol et
        const balances = await redis.hgetall('balances:' + walletAddress);
        const metalBalance = parseFloat(balances?.[plan.token.toLowerCase()] || '0');

        let stakeAmount = plan.amount;
        let purchasedAmount = 0;

        // Metal bakiyesi yetersizse, fallback source'tan alım yap
        if (metalBalance < plan.amount) {
          const needed = plan.amount - metalBalance;
          
          // Fallback payment source kontrolü
          if (plan.paymentSource !== 'metal_balance') {
            const sourceKey = plan.paymentSource.replace('_balance', '');
            const sourceBalance = parseFloat(balances?.[sourceKey] || '0');

            // Alım için yeterli bakiye var mı?
            const priceData = await getMetalPrice(plan.token);
            const requiredAmount = needed * priceData.askPerGram;

            if (sourceBalance >= requiredAmount) {
              // Önce alım yap
              const buyResult = await executeBuy(walletAddress, plan, needed, requiredAmount);
              
              if (buyResult.success) {
                purchasedAmount = buyResult.toAmount;
                stakeAmount = metalBalance + purchasedAmount;
              } else {
                await sendNotification(walletAddress, {
                  title: 'Düzenli Birikim Başarısız',
                  body: `${plan.token} alımı başarısız: ${buyResult.error}`,
                  type: 'recurring_stake_failed'
                });
                results.push({ planId: plan.id, status: 'failed', reason: 'buy_failed' });
                continue;
              }
            } else {
              // Yetersiz bakiye
              await sendNotification(walletAddress, {
                title: 'Düzenli Birikim Başarısız',
                body: `${plan.token} biriktirme için yeterli bakiye yok.`,
                type: 'recurring_stake_failed'
              });
              results.push({ planId: plan.id, status: 'skipped', reason: 'insufficient_balance' });
              continue;
            }
          } else {
            // Sadece metal bakiyesi kullanılacak ama yetersiz
            await sendNotification(walletAddress, {
              title: 'Düzenli Birikim Başarısız',
              body: `${plan.token} bakiyeniz yetersiz (${metalBalance.toFixed(4)}g / ${plan.amount}g).`,
              type: 'recurring_stake_failed'
            });
            results.push({ planId: plan.id, status: 'skipped', reason: 'insufficient_metal' });
            continue;
          }
        }

        // Stake işlemi
        try {
          const stakeResult = await executeStake(walletAddress, plan.token, stakeAmount, plan.stakeDuration);

          if (stakeResult.success) {
            // İstatistikleri güncelle
            plan.stats.executionCount++;
            plan.stats.totalStaked += stakeAmount;
            if (purchasedAmount > 0) {
              plan.stats.totalSpent += purchasedAmount;
            }
            plan.stats.lastExecutionAt = now.toISOString();
            plan.stats.nextExecutionAt = calculateNextExecution(plan);
            updated = true;

            const message = purchasedAmount > 0
              ? `${purchasedAmount.toFixed(4)}g ${plan.token} alındı ve toplam ${stakeAmount.toFixed(4)}g ${plan.stakeDuration} ay stake edildi.`
              : `${stakeAmount.toFixed(4)}g ${plan.token} ${plan.stakeDuration} ay stake edildi.`;

            await sendNotification(walletAddress, {
              title: 'Düzenli Birikim Başarılı',
              body: message,
              type: 'recurring_stake_success'
            });

            results.push({ 
              planId: plan.id, 
              status: 'executed', 
              staked: stakeAmount,
              purchased: purchasedAmount 
            });
          } else {
            results.push({ planId: plan.id, status: 'failed', error: stakeResult.error });
          }
        } catch (err: any) {
          results.push({ planId: plan.id, status: 'error', error: err.message });
        }
      }

      if (updated) {
        await redis.set(key, JSON.stringify(plans));
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
    case 'weekly':
      return dayOfWeek === (plan.dayOfWeek ?? 1);
    case 'biweekly':
      const weekOfMonth = Math.ceil(dayOfMonth / 7);
      return dayOfWeek === (plan.dayOfWeek ?? 1) && (weekOfMonth === 1 || weekOfMonth === 3);
    case 'monthly':
      return dayOfMonth === (plan.dayOfMonth ?? 1);
    default:
      return false;
  }
}

function calculateNextExecution(plan: any): string {
  const now = new Date();
  const next = new Date();
  next.setHours(plan.hour, 0, 0, 0);

  switch (plan.frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
  }

  return next.toISOString();
}

async function getMetalPrice(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  const response = await fetch(baseUrl + '/api/prices?token=' + token);
  const data = await response.json();
  
  return {
    askPerGram: data.askPerGram || data.ask || 0,
    bidPerGram: data.bidPerGram || data.bid || 0,
  };
}

async function executeBuy(walletAddress: string, plan: any, gramAmount: number, usdAmount: number) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  const response = await fetch(baseUrl + '/api/trade', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-wallet-address': walletAddress,
    },
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
  return {
    success: response.ok,
    toAmount: data.toAmount || 0,
    error: data.error,
  };
}

async function executeStake(walletAddress: string, token: string, amount: number, duration: number) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  const response = await fetch(baseUrl + '/api/staking', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-wallet-address': walletAddress,
    },
    body: JSON.stringify({
      action: 'stake',
      token,
      amount,
      duration,
    }),
  });

  const data = await response.json();
  return {
    success: response.ok,
    error: data.error,
  };
}

async function sendNotification(walletAddress: string, notification: { title: string; body: string; type: string }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  try {
    await fetch(baseUrl + '/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.INTERNAL_API_KEY || '',
      },
      body: JSON.stringify({
        walletAddress,
        ...notification,
      }),
    });
  } catch (err) {
    console.error('Failed to send notification:', err);
  }
}
