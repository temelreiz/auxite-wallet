// ============================================
// PHYSICAL REDEMPTION API
// Blueprint: Auxite Physical Redemption v1.0
// Cash settlement, Vault pickup, Insured courier, Vault transfer
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { sendEmail } from '@/lib/email';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'physicalredemption@auxite.io';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ── Thresholds ──
const MIN_THRESHOLDS: Record<string, number> = {
  AUXG: 100,     // 100 grams gold
  AUXS: 31000,   // ~1000 oz silver
  AUXPT: 100,    // 100 grams platinum
  AUXPD: 100,    // 100 grams palladium
};

// ── Fees ──
const REDEMPTION_FEES: Record<string, number> = {
  AUXG: 0.0075,   // 0.75%
  AUXS: 0.0125,   // 1.25%
  AUXPT: 0.015,   // 1.5% dynamic
  AUXPD: 0.015,   // 1.5% dynamic
};

// ── SLA (business days) ──
const SLA: Record<string, { min: number; max: number }> = {
  AUXG: { min: 5, max: 15 },
  AUXS: { min: 10, max: 25 },
  AUXPT: { min: 10, max: 20 },
  AUXPD: { min: 10, max: 20 },
};

// ── Supported Vaults ──
const VAULTS = [
  { id: 'zurich', name: 'Zurich', country: 'Switzerland', active: true },
  { id: 'dubai', name: 'Dubai', country: 'UAE', active: true },
  { id: 'london', name: 'London', country: 'UK', active: false },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', active: false },
];

type RedemptionMethod = 'cash' | 'pickup' | 'courier' | 'vault_transfer';

// ── GET: Redemption config + user eligibility ──
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const metal = searchParams.get('metal')?.toUpperCase() || 'AUXG';

  // Check if redemption is enabled
  const enabled = await redis.get('config:redemption:enabled');
  if (enabled === false || enabled === 'false') {
    return NextResponse.json({ success: false, error: 'Physical redemption is currently unavailable' });
  }

  // Metal-specific toggle
  const metalEnabled = await redis.get(`config:redemption:${metal.toLowerCase()}:enabled`);
  if (metalEnabled === false || metalEnabled === 'false') {
    return NextResponse.json({ success: false, error: `Physical redemption for ${metal} is currently unavailable` });
  }

  // User balance check
  let userBalance = 0;
  let encumbered = 0;
  if (address) {
    const balKey = `user:${address.toLowerCase()}:balance`;
    const bal = await redis.hget(balKey, metal.toLowerCase());
    userBalance = parseFloat(bal as string || '0');

    // Check encumbered (staked) amount
    const stakesRaw = await redis.get(`stakes:${address.toLowerCase()}`);
    if (stakesRaw) {
      const stakes = typeof stakesRaw === 'string' ? JSON.parse(stakesRaw) : stakesRaw;
      if (Array.isArray(stakes)) {
        for (const s of stakes) {
          if ((s.metal || '').toUpperCase() === metal && (s.status === 'active' || s.status === 'locked')) {
            encumbered += parseFloat(s.amount) || 0;
          }
        }
      }
    }
  }

  const available = Math.max(0, userBalance - encumbered);
  const minThreshold = MIN_THRESHOLDS[metal] || 100;
  const fee = REDEMPTION_FEES[metal] || 0.0075;
  const sla = SLA[metal] || { min: 5, max: 15 };
  const activeVaults = VAULTS.filter(v => v.active);

  // Cooling period check (T+3)
  let coolingActive = false;
  if (address) {
    const lastRedemption = await redis.get(`user:${address.toLowerCase()}:last_redemption`);
    if (lastRedemption) {
      const lastTs = parseInt(lastRedemption as string);
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      if (Date.now() - lastTs < threeDays) {
        coolingActive = true;
      }
    }
  }

  return NextResponse.json({
    success: true,
    metal,
    config: {
      enabled: true,
      minThreshold,
      feePercent: fee * 100,
      sla,
      vaults: activeVaults,
      methods: {
        cash: { available: true, label: 'Cash Settlement' },
        pickup: { available: true, label: 'Vault Pickup' },
        courier: { available: true, label: 'Insured Courier', kycTier: 2 },
        vault_transfer: { available: false, label: 'Vault Transfer', inviteOnly: true },
      },
    },
    user: address ? {
      balance: userBalance,
      encumbered,
      available,
      eligible: available >= minThreshold && !coolingActive,
      coolingActive,
      estimatedFee: available * fee,
    } : null,
  });
}

// ── POST: Submit redemption request ──
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, metal, amount, method, vault, notes, twoFactorCode } = body;

    if (!address || !metal || !amount || !method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const upperMetal = metal.toUpperCase();
    const amt = parseFloat(amount);

    // Validate method
    const validMethods: RedemptionMethod[] = ['cash', 'pickup', 'courier', 'vault_transfer'];
    if (!validMethods.includes(method)) {
      return NextResponse.json({ error: 'Invalid redemption method' }, { status: 400 });
    }

    // Check global enable
    const enabled = await redis.get('config:redemption:enabled');
    if (enabled === false || enabled === 'false') {
      return NextResponse.json({ error: 'Physical redemption is currently unavailable' }, { status: 403 });
    }

    // Physical methods require minimum threshold
    if (method !== 'cash') {
      const minThreshold = MIN_THRESHOLDS[upperMetal] || 100;
      if (amt < minThreshold) {
        return NextResponse.json({
          error: `Minimum ${minThreshold}g required for physical redemption of ${upperMetal}`,
        }, { status: 400 });
      }
    }

    // Check balance
    const balKey = `user:${address.toLowerCase()}:balance`;
    const bal = parseFloat(await redis.hget(balKey, upperMetal.toLowerCase()) as string || '0');

    // Check encumbered
    let encumbered = 0;
    const stakesRaw = await redis.get(`stakes:${address.toLowerCase()}`);
    if (stakesRaw) {
      const stakes = typeof stakesRaw === 'string' ? JSON.parse(stakesRaw) : stakesRaw;
      if (Array.isArray(stakes)) {
        for (const s of stakes) {
          if ((s.metal || '').toUpperCase() === upperMetal && (s.status === 'active' || s.status === 'locked')) {
            encumbered += parseFloat(s.amount) || 0;
          }
        }
      }
    }

    const available = bal - encumbered;
    if (amt > available) {
      return NextResponse.json({ error: 'Insufficient available balance (encumbered positions excluded)' }, { status: 400 });
    }

    // Cooling period check
    const lastRedemption = await redis.get(`user:${address.toLowerCase()}:last_redemption`);
    if (lastRedemption) {
      const lastTs = parseInt(lastRedemption as string);
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      if (Date.now() - lastTs < threeDays) {
        return NextResponse.json({ error: 'Cooling period active (T+3). Please wait before submitting another redemption.' }, { status: 429 });
      }
    }

    // Calculate fee
    const feeRate = REDEMPTION_FEES[upperMetal] || 0.0075;
    const fee = amt * feeRate;
    const netAmount = amt - fee;
    const sla = SLA[upperMetal] || { min: 5, max: 15 };

    // Create redemption request
    const redemptionId = `RDM_${Date.now()}_${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

    const redemption = {
      id: redemptionId,
      address: address.toLowerCase(),
      metal: upperMetal,
      amount: amt,
      fee,
      feePercent: feeRate * 100,
      netAmount,
      method,
      vault: vault || null,
      notes: notes || '',
      status: method === 'cash' ? 'processing' : 'pending_approval',
      kycTier: 1, // TODO: actual KYC check
      sla,
      createdAt: new Date().toISOString(),
      timestamp: Date.now(),
      stages: [
        { stage: 'submitted', timestamp: Date.now(), note: 'Redemption request submitted' },
      ],
    };

    // Store redemption
    await redis.lpush(`redemptions:${address.toLowerCase()}`, JSON.stringify(redemption));
    await redis.lpush('admin:redemptions:all', JSON.stringify(redemption));
    await redis.ltrim('admin:redemptions:all', 0, 499);

    // Set cooling period
    await redis.set(`user:${address.toLowerCase()}:last_redemption`, Date.now().toString());

    // For cash settlement, process immediately (deduct balance)
    if (method === 'cash') {
      const newBal = bal - amt;
      await redis.hset(balKey, { [upperMetal.toLowerCase()]: newBal.toString() });

      // Credit AUXM equivalent
      const metalPrices: Record<string, number> = { AUXG: 95, AUXS: 1.1, AUXPT: 32, AUXPD: 35 };
      const price = metalPrices[upperMetal] || 95;
      const auxmCredit = netAmount * price;
      const currentAuxm = parseFloat(await redis.hget(balKey, 'auxm') as string || '0');
      await redis.hset(balKey, { auxm: (currentAuxm + auxmCredit).toString() });

      // Log transaction
      const tx = {
        id: redemptionId,
        type: 'sell',
        coin: upperMetal,
        amount: amt,
        amountUsd: amt * price,
        fee,
        status: 'completed',
        metadata: { method: 'cash', netAmount, auxmCredit },
        createdAt: new Date().toISOString(),
        timestamp: Date.now(),
      };
      await redis.lpush(`user:${address.toLowerCase()}:transactions`, JSON.stringify(tx));
    }

    // Log to treasury
    const logEntry = {
      id: `tlog_${Date.now()}`,
      type: 'redemption',
      message: `${method.toUpperCase()} redemption: ${amt}g ${upperMetal} by ${address.slice(0, 8)}...`,
      amount: amt,
      token: upperMetal,
      operator: 'system',
      timestamp: Date.now(),
      date: new Date().toISOString(),
    };
    await redis.lpush('treasury:log', JSON.stringify(logEntry));

    // ── Admin Notification Email ──
    const methodLabels: Record<string, string> = {
      cash: 'Cash Settlement (AUXM)',
      pickup: 'Vault Pickup',
      courier: 'Insured Courier',
      vault_transfer: 'Vault Transfer',
    };

    try {
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `🔔 New Redemption Request — ${amt}g ${upperMetal} [${redemptionId}]`,
        html: `
          <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 32px;background:#fafaf8;border:1px solid #e5e2dc">
            <div style="border-bottom:2px solid #2F6F62;padding-bottom:16px;margin-bottom:24px">
              <h2 style="margin:0;font-size:18px;color:#1a1a1a;font-weight:600">New Physical Redemption Request</h2>
              <p style="margin:4px 0 0;font-size:12px;color:#888;letter-spacing:0.05em">${new Date().toISOString()}</p>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:14px;color:#333">
              <tr style="border-bottom:1px solid #e5e2dc">
                <td style="padding:10px 0;font-weight:600;color:#666;width:160px">Redemption ID</td>
                <td style="padding:10px 0;font-family:monospace;color:#2F6F62;font-weight:600">${redemptionId}</td>
              </tr>
              <tr style="border-bottom:1px solid #e5e2dc">
                <td style="padding:10px 0;font-weight:600;color:#666">Wallet</td>
                <td style="padding:10px 0;font-family:monospace;font-size:12px">${address}</td>
              </tr>
              <tr style="border-bottom:1px solid #e5e2dc">
                <td style="padding:10px 0;font-weight:600;color:#666">Metal</td>
                <td style="padding:10px 0;font-weight:600">${upperMetal}</td>
              </tr>
              <tr style="border-bottom:1px solid #e5e2dc">
                <td style="padding:10px 0;font-weight:600;color:#666">Gross Amount</td>
                <td style="padding:10px 0">${amt.toLocaleString()}g</td>
              </tr>
              <tr style="border-bottom:1px solid #e5e2dc">
                <td style="padding:10px 0;font-weight:600;color:#666">Fee (${(feeRate * 100).toFixed(2)}%)</td>
                <td style="padding:10px 0">${fee.toFixed(2)}g</td>
              </tr>
              <tr style="border-bottom:1px solid #e5e2dc">
                <td style="padding:10px 0;font-weight:600;color:#666">Net Delivery</td>
                <td style="padding:10px 0;font-weight:700;color:#2F6F62">${netAmount.toFixed(2)}g</td>
              </tr>
              <tr style="border-bottom:1px solid #e5e2dc">
                <td style="padding:10px 0;font-weight:600;color:#666">Method</td>
                <td style="padding:10px 0">${methodLabels[method] || method}</td>
              </tr>
              <tr style="border-bottom:1px solid #e5e2dc">
                <td style="padding:10px 0;font-weight:600;color:#666">Vault</td>
                <td style="padding:10px 0">${vault || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;font-weight:600;color:#666">Status</td>
                <td style="padding:10px 0"><span style="background:${method === 'cash' ? '#2F6F62' : '#f59e0b'};color:#fff;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:600">${redemption.status.replace('_', ' ').toUpperCase()}</span></td>
              </tr>
            </table>
            ${method !== 'cash' ? '<div style="margin-top:24px;padding:14px 16px;background:#fff8e1;border:1px solid #f59e0b33;border-radius:6px;font-size:13px;color:#92400e">⚠️ This request requires manual approval. Review in Admin Panel → Redemption tab.</div>' : ''}
            <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e2dc;font-size:11px;color:#999">
              Auxite Physical Redemption System · Aurum Ledger Ltd · Hong Kong
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('Admin notification email failed:', emailErr);
      // Non-blocking: don't fail the redemption if email fails
    }

    return NextResponse.json({
      success: true,
      redemption: {
        id: redemptionId,
        metal: upperMetal,
        amount: amt,
        fee,
        netAmount,
        method,
        status: redemption.status,
        estimatedDelivery: method === 'cash' ? 'Instant' : `${sla.min}-${sla.max} business days`,
        vault: vault || null,
      },
    });
  } catch (error: any) {
    console.error('Redemption error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process redemption' }, { status: 500 });
  }
}
