// app/api/staking/agreement/route.ts
// Staking Agreement PDF/HTML Generator
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const METAL_NAMES: Record<string, string> = {
  AUXG: 'Gold',
  AUXS: 'Silver',
  AUXPT: 'Platinum',
  AUXPD: 'Palladium',
};

const TERM_LABELS: Record<number, string> = {
  91: '3 Months',
  181: '6 Months',
  366: '12 Months',
};

function generateAgreementNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AUX-EARN-${year}-${random}`;
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
}

function generateAgreementHTML(data: {
  agreementNo: string;
  stakeId: string;
  holderUid: string;
  metal: string;
  metalName: string;
  amount: string;
  termLabel: string;
  lockDays: number;
  startDate: string;
  endDate: string;
  apyPercent: string;
  issueDate: string;
  issuerEntity: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auxite Staking Agreement - ${data.agreementNo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      background: #f8f9fa;
      color: #1a1a2e;
      line-height: 1.6;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid #e0e0e0;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #fff;
      padding: 30px 40px;
      text-align: center;
    }
    .logo {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 2px;
      margin-bottom: 5px;
    }
    .logo span { color: #10b981; }
    .doc-title {
      font-size: 18px;
      font-weight: 400;
      color: #94a3b8;
      margin-top: 10px;
    }
    .meta-bar {
      display: flex;
      justify-content: space-between;
      background: #f1f5f9;
      padding: 15px 40px;
      font-size: 12px;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
    }
    .content {
      padding: 40px;
    }
    .intro {
      font-size: 14px;
      color: #475569;
      margin-bottom: 25px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e2e8f0;
    }
    .intro strong { color: #0f172a; }
    h2 {
      font-size: 16px;
      color: #0f172a;
      margin: 25px 0 15px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #10b981;
      display: inline-block;
    }
    h2:first-of-type { margin-top: 0; }
    p, li {
      font-size: 13px;
      color: #475569;
      margin-bottom: 10px;
    }
    ul {
      margin-left: 20px;
      margin-bottom: 15px;
    }
    li { margin-bottom: 6px; }
    .params-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0 25px 0;
      font-size: 13px;
    }
    .params-table th,
    .params-table td {
      padding: 12px 15px;
      text-align: left;
      border: 1px solid #e2e8f0;
    }
    .params-table th {
      background: #f8fafc;
      color: #64748b;
      font-weight: 600;
      width: 40%;
    }
    .params-table td {
      color: #0f172a;
      font-weight: 500;
    }
    .highlight-row td {
      background: #f0fdf4;
      color: #166534;
      font-weight: 600;
    }
    .warning-box {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px 20px;
      margin: 20px 0;
      font-size: 12px;
      color: #92400e;
    }
    .info-box {
      background: #f0f9ff;
      border-left: 4px solid #0ea5e9;
      padding: 15px 20px;
      margin: 20px 0;
      font-size: 12px;
      color: #0369a1;
    }
    .term-def {
      background: #f8fafc;
      padding: 15px 20px;
      margin: 15px 0;
      border-radius: 8px;
      font-size: 12px;
    }
    .term-def strong { color: #0f172a; }
    .signature-section {
      margin-top: 40px;
      padding-top: 30px;
      border-top: 2px solid #e2e8f0;
    }
    .sig-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .sig-block {
      width: 45%;
    }
    .sig-label {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 5px;
    }
    .sig-value {
      font-size: 13px;
      color: #0f172a;
      font-weight: 600;
      font-family: 'Courier New', monospace;
    }
    .footer {
      background: #f8fafc;
      padding: 20px 40px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-success {
      background: #dcfce7;
      color: #166534;
    }
    .badge-warning {
      background: #fef3c7;
      color: #92400e;
    }
    @media print {
      body { padding: 0; background: #fff; }
      .container { box-shadow: none; border: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">AUX<span>ITE</span></div>
      <div class="doc-title">STAKING (EARN) AGREEMENT</div>
    </div>
    
    <div class="meta-bar">
      <div><strong>Agreement No:</strong> ${data.agreementNo}</div>
      <div><strong>Stake ID:</strong> ${data.stakeId}</div>
      <div><strong>Issue Date:</strong> ${data.issueDate}</div>
    </div>
    
    <div class="content">
      <div class="intro">
        This agreement ("<strong>Agreement</strong>") is entered into between <strong>Auxite</strong> ("Platform") and the Stake Holder ("Holder"), identified by <strong>Holder UID: ${data.holderUid}</strong>.
        <br><br>
        By confirming a stake on the Auxite platform, the Holder agrees to the terms below.
      </div>

      <h2>1. Stake Structure</h2>
      <div class="warning-box">
        <strong>⚠️ Important:</strong> This Stake is a fixed-term, non-compounding earn product based on the temporary leasing of physically allocated metal.
      </div>
      <ul>
        <li>Rewards are paid <strong>only at maturity</strong></li>
        <li>No interim or periodic reward payments are made</li>
        <li>Early unstake is <strong>not permitted</strong> unless explicitly stated otherwise</li>
      </ul>

      <h2>2. Binding Stake Parameters</h2>
      <table class="params-table">
        <tr>
          <th>Metal</th>
          <td>${data.metalName} (${data.metal})</td>
        </tr>
        <tr class="highlight-row">
          <th>Staked Amount</th>
          <td>${data.amount} ${data.metal}</td>
        </tr>
        <tr>
          <th>Term</th>
          <td>${data.termLabel}</td>
        </tr>
        <tr>
          <th>Lock Duration</th>
          <td>${data.lockDays} days</td>
        </tr>
        <tr>
          <th>Start Date / Time (UTC)</th>
          <td>${data.startDate}</td>
        </tr>
        <tr>
          <th>Maturity Date / Time (UTC)</th>
          <td>${data.endDate}</td>
        </tr>
        <tr class="highlight-row">
          <th>Displayed APY</th>
          <td>${data.apyPercent}%</td>
        </tr>
        <tr>
          <th>Reward Settlement</th>
          <td>At Maturity Only</td>
        </tr>
        <tr>
          <th>Reward Credit Time</th>
          <td>Within 24 hours after maturity</td>
        </tr>
        <tr>
          <th>Early Unstake</th>
          <td><span class="badge badge-warning">Not Allowed</span></td>
        </tr>
      </table>

      <div class="term-def">
        <strong>Term Definitions:</strong><br>
        • 3 Months: 91 days &nbsp;&nbsp; • 6 Months: 181 days &nbsp;&nbsp; • 12 Months: 366 days
      </div>

      <h2>3. Leasing of Physical Metal</h2>
      <p><strong>3.1</strong> During the lock period, the underlying physical metal corresponding to the Stake may be leased to third parties for operational or commercial purposes.</p>
      <p><strong>3.2</strong> The Holder acknowledges and agrees that:</p>
      <ul>
        <li>The metal remains physically allocated and tracked</li>
        <li>Leasing does not transfer ownership of the metal</li>
        <li>Leasing activity is conducted under Auxite's custody, risk, and compliance framework</li>
      </ul>
      <p><strong>3.3</strong> Leasing revenue forms the basis for the earn rate displayed at stake creation.</p>

      <h2>4. Rewards & APY Disclosure</h2>
      <p><strong>4.1</strong> The displayed APY is fixed for the duration of the Stake and applies only if the Stake reaches maturity.</p>
      <p><strong>4.2</strong> Rewards are calculated based on:</p>
      <ul>
        <li>Staked amount</li>
        <li>Lock duration (days)</li>
        <li>Displayed APY at stake creation</li>
      </ul>
      <p><strong>4.3</strong> Rewards are credited within 24 hours after the maturity date, subject to operational settlement.</p>
      <p><strong>4.4</strong> APY does not represent a guaranteed return and is not a promise of profit.</p>
      <p><strong>4.5</strong> In case of discrepancy, the Auxite internal ledger record prevails.</p>

      <h2>5. Settlement at Maturity</h2>
      <div class="info-box">
        Upon maturity:
        <ul style="margin-top: 10px; margin-bottom: 0;">
          <li>The original staked amount becomes unlocked</li>
          <li>Earned rewards are credited within 24 hours</li>
          <li>The Stake is marked as <span class="badge badge-success">Completed</span></li>
        </ul>
        <br>
        <strong>No action is required from the Holder to receive rewards.</strong>
      </div>

      <h2>6. Risks & Acknowledgements</h2>
      <p>The Holder acknowledges that:</p>
      <ul>
        <li>Metal prices may fluctuate</li>
        <li>Leasing counterparties may involve operational risk</li>
        <li>Rewards depend on successful lease settlement</li>
        <li>Temporary delays (up to 24 hours) may occur due to reconciliation, audit, or vault settlement</li>
      </ul>

      <h2>7. Suspension / Exceptional Events</h2>
      <p>Auxite may delay settlement due to:</p>
      <ul>
        <li>Custodian reconciliation</li>
        <li>Vault or logistics confirmation</li>
        <li>Force majeure or regulatory intervention</li>
      </ul>
      <p>Such delays do not constitute a breach of this Agreement.</p>

      <h2>8. Legal Nature</h2>
      <p>This Agreement:</p>
      <ul>
        <li>Is <strong>not</strong> a security, derivative, or investment contract</li>
        <li>Does <strong>not</strong> constitute a deposit or savings product</li>
        <li>Does <strong>not</strong> guarantee capital appreciation</li>
      </ul>
      <p>It represents a fixed-term metal leasing arrangement administered digitally.</p>

      <h2>9. Governing Documents & Precedence</h2>
      <p>This Agreement incorporates:</p>
      <ul>
        <li>Auxite Terms of Service</li>
        <li>Auxite Earn / Staking Rules</li>
        <li>Auxite Redemption Policy</li>
        <li>Auxite Risk Disclosures</li>
      </ul>
      <p><strong>Order of precedence:</strong></p>
      <ol style="margin-left: 20px;">
        <li>Auxite Ledger Records</li>
        <li>This Agreement</li>
        <li>Platform Policies</li>
      </ol>

      <h2>10. Acceptance</h2>
      <p>This Agreement is deemed accepted upon confirmation of the Stake on the Auxite platform.</p>

      <div class="signature-section">
        <div class="sig-row">
          <div class="sig-block">
            <div class="sig-label">Auxite Authorized Issuer</div>
            <div class="sig-value">${data.issuerEntity}</div>
          </div>
          <div class="sig-block">
            <div class="sig-label">Holder UID</div>
            <div class="sig-value">${data.holderUid}</div>
          </div>
        </div>
        <div class="sig-row">
          <div class="sig-block">
            <div class="sig-label">Digital Timestamp</div>
            <div class="sig-value">${data.issueDate}</div>
          </div>
          <div class="sig-block">
            <div class="sig-label">Agreement Status</div>
            <div class="sig-value"><span class="badge badge-success">ACTIVE</span></div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <p>This is a digitally generated agreement. No physical signature required.</p>
      <p style="margin-top: 5px;">© ${new Date().getFullYear()} Auxite Precious Metals AG. All rights reserved.</p>
      <p style="margin-top: 5px; font-family: monospace;">${data.agreementNo}</p>
    </div>
  </div>
</body>
</html>
`;
}

// GET - Generate agreement by stakeId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stakeId = searchParams.get('stakeId');
    const format = searchParams.get('format') || 'html';

    if (!stakeId) {
      return NextResponse.json({ error: 'stakeId required' }, { status: 400 });
    }

    // Fetch stake from Redis
    const stake = await redis.hgetall(`stake:${stakeId}`) as any;
    
    if (!stake || !stake.id) {
      return NextResponse.json({ error: 'Stake not found' }, { status: 404 });
    }

    // Generate agreement number if not exists
    let agreementNo = stake.agreementNo;
    if (!agreementNo) {
      agreementNo = generateAgreementNumber();
      await redis.hset(`stake:${stakeId}`, { agreementNo });
    }

    const lockDays = parseInt(stake.lockDays) || 91;
    const termLabel = TERM_LABELS[lockDays] || `${lockDays} days`;

    const data = {
      agreementNo,
      stakeId: stake.id,
      holderUid: stake.userUid || stake.holderUid || 'N/A',
      metal: stake.metal,
      metalName: METAL_NAMES[stake.metal] || stake.metal,
      amount: parseFloat(stake.amount).toFixed(4),
      termLabel,
      lockDays,
      startDate: formatDate(stake.startDate || stake.createdAt),
      endDate: formatDate(stake.endDate || stake.maturityDate),
      apyPercent: stake.apy || stake.apyPercent || '0',
      issueDate: formatDate(stake.createdAt || new Date()),
      issuerEntity: 'Auxite Precious Metals AG',
    };

    const html = generateAgreementHTML(data);

    if (format === 'json') {
      return NextResponse.json({
        agreementNo: data.agreementNo,
        stakeId: data.stakeId,
        holderUid: data.holderUid,
        metal: data.metal,
        metalName: data.metalName,
        amount: data.amount,
        termLabel: data.termLabel,
        lockDays: data.lockDays,
        startDate: data.startDate,
        endDate: data.endDate,
        apyPercent: data.apyPercent,
        issueDate: data.issueDate,
        issuerEntity: data.issuerEntity,
      });
    }

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error: any) {
    console.error('Agreement generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Generate agreement with custom data (for preview/testing)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      stakeId = 'PREVIEW-' + Date.now(),
      holderUid = 'PREVIEW-USER',
      metal = 'AUXG',
      amount = '10',
      lockDays = 91,
      apy = '5.5',
      startDate = new Date().toISOString(),
    } = body;

    const termLabel = TERM_LABELS[lockDays] || `${lockDays} days`;
    const endDateObj = new Date(startDate);
    endDateObj.setDate(endDateObj.getDate() + lockDays);

    const data = {
      agreementNo: generateAgreementNumber(),
      stakeId,
      holderUid,
      metal,
      metalName: METAL_NAMES[metal] || metal,
      amount: parseFloat(amount).toFixed(4),
      termLabel,
      lockDays,
      startDate: formatDate(startDate),
      endDate: formatDate(endDateObj),
      apyPercent: apy,
      issueDate: formatDate(new Date()),
      issuerEntity: 'Auxite Precious Metals AG',
    };

    const html = generateAgreementHTML(data);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error: any) {
    console.error('Agreement preview error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
