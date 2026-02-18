/**
 * Monthly Custody Statement Cron Job
 * Runs on the 1st of every month at 08:00 UTC
 * Sends portfolio summary + transaction history email to all active users
 *
 * Schedule: 0 8 1 * *
 * Auth: Bearer CRON_SECRET or x-api-key INTERNAL_API_KEY
 */

import { NextRequest, NextResponse } from 'next/server';
import { getActiveUsersWithEmail, sendMonthlyStatementEmail } from '@/lib/statement-email';
import { getUserBalance, getTransactions, type Transaction } from '@/lib/redis';

export const maxDuration = 300; // 5 minutes — may need to process many users

export async function GET(request: NextRequest) {
  // Auth — Vercel cron secret or internal API key
  const authHeader = request.headers.get('authorization');
  const apiKey = request.headers.get('x-api-key');
  const isAuthorized =
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    apiKey === process.env.INTERNAL_API_KEY ||
    process.env.NODE_ENV !== 'production';

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Determine statement period — previous month
  const now = new Date();
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 11 : now.getMonth() - 1; // 0-indexed

  const periodStart = new Date(year, month, 1).getTime();
  const periodEnd = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

  console.log(`[monthly-statements] Starting for ${year}-${String(month + 1).padStart(2, '0')}`);

  const results = {
    period: `${year}-${String(month + 1).padStart(2, '0')}`,
    usersFound: 0,
    emailsSent: 0,
    emailsFailed: 0,
    errors: [] as string[],
  };

  try {
    // 1. Get all active users with email
    const users = await getActiveUsersWithEmail();
    results.usersFound = users.length;
    console.log(`[monthly-statements] Found ${users.length} users with email`);

    // 2. Process each user
    for (const user of users) {
      try {
        // Get current balance
        const balance = await getUserBalance(user.address);

        // Check if user has any holdings
        const hasHoldings = balance.auxg > 0 || balance.auxs > 0 || balance.auxpt > 0 ||
          balance.auxpd > 0 || balance.auxm > 0 || balance.eth > 0 || balance.btc > 0 ||
          balance.xrp > 0 || balance.sol > 0 || balance.usdt > 0 || balance.usd > 0;

        if (!hasHoldings) {
          // Skip users with zero balance — no need to send empty statement
          continue;
        }

        // Get transactions for the month
        const allTx = await getTransactions(user.address, 200);
        const monthlyTx = allTx.filter((tx: Transaction) => {
          const ts = tx.timestamp;
          return ts >= periodStart && ts <= periodEnd;
        });

        // Send email
        const result = await sendMonthlyStatementEmail(user, balance, monthlyTx, year, month);
        if (result.success) {
          results.emailsSent++;
        } else {
          results.emailsFailed++;
          results.errors.push(`${user.email}: ${result.error}`);
        }

        // Rate limit: 100ms between emails to avoid Resend rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err: any) {
        results.emailsFailed++;
        results.errors.push(`${user.email}: ${err.message}`);
        console.error(`[monthly-statements] Error for ${user.email}:`, err.message);
      }
    }

    console.log(`[monthly-statements] Done: ${results.emailsSent} sent, ${results.emailsFailed} failed`);
    return NextResponse.json({ success: true, ...results });
  } catch (error: any) {
    console.error(`[monthly-statements] Fatal error:`, error.message);
    return NextResponse.json({ error: error.message, ...results }, { status: 500 });
  }
}
