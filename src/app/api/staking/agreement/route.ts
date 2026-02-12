// app/api/staking/agreement/route.ts
// PRECIOUS METALS LEASING PARTICIPATION NOTE — Institutional Grade
// Swiss Private Bank + Structured Note Style
// NO gradients, NO crypto vibes, NO startup aesthetics
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const METAL_NAMES: Record<string, { full: string; symbol: string }> = {
  AUXG: { full: 'Gold', symbol: 'Au' },
  AUXS: { full: 'Silver', symbol: 'Ag' },
  AUXPT: { full: 'Platinum', symbol: 'Pt' },
  AUXPD: { full: 'Palladium', symbol: 'Pd' },
};

const TERM_LABELS: Record<number, string> = {
  91: '3 Months',
  181: '6 Months',
  366: '12 Months',
};

function generateNoteId(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `YLD-${year}-${random}`;
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateFull(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
}

// ═══════════════════════════════════════════════
// INSTITUTIONAL PARTICIPATION NOTE HTML
// ═══════════════════════════════════════════════

function generateParticipationNoteHTML(data: {
  noteId: string;
  stakeId: string;
  holderUid: string;
  metal: string;
  metalName: string;
  metalSymbol: string;
  amount: string;
  termLabel: string;
  lockDays: number;
  startDate: string;
  endDate: string;
  effectiveDate: string;
  maturityDate: string;
  leaseRate: string;
  yieldType: string;
  issueDate: string;
  issuerEntity: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.noteId} — Precious Metals Leasing Participation Note</title>
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', Georgia, serif;
      background: #ffffff;
      color: #1a1a1a;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      max-width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 0;
      background: #ffffff;
    }

    /* ── GOLD LINE ── */
    .gold-line { height: 3px; background: #C5A55A; }

    /* ── HEADER ── */
    .header {
      padding: 28px 40px 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #e5e5e5;
    }
    .header-left h1 {
      font-size: 13px;
      letter-spacing: 6px;
      color: #1a1a1a;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .header-left h2 {
      font-size: 16px;
      font-weight: 400;
      color: #333;
      letter-spacing: 0.5px;
    }
    .header-right {
      text-align: right;
      font-size: 11px;
      color: #555;
      line-height: 1.7;
    }
    .header-right .note-id {
      font-family: 'Courier New', monospace;
      font-weight: 700;
      color: #1a1a1a;
      font-size: 12px;
    }
    .label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888;
    }

    /* ── CONTENT ── */
    .content { padding: 24px 40px; }

    /* ── SECTION ── */
    .section { margin-bottom: 22px; }
    .section-title {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #888;
      margin-bottom: 10px;
      padding-bottom: 4px;
      border-bottom: 1px solid #ddd;
    }

    /* ── FIELD GRID ── */
    .field-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 30px;
    }
    .field { margin-bottom: 4px; }
    .field-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888;
    }
    .field-value {
      font-size: 12px;
      color: #1a1a1a;
      font-weight: 500;
    }
    .field-value.mono {
      font-family: 'Courier New', monospace;
    }

    /* ── POSITION TABLE ── */
    .position-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    .position-table th {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888;
      font-weight: 600;
      padding: 8px 12px;
      text-align: left;
      border-bottom: 2px solid #C5A55A;
      background: #fafafa;
    }
    .position-table td {
      font-size: 12px;
      padding: 10px 12px;
      border-bottom: 1px solid #eee;
      color: #1a1a1a;
    }
    .position-table td.bold { font-weight: 700; }

    /* ── STRUCTURE STATEMENT ── */
    .structure-statement {
      padding: 16px 18px;
      background: #fafafa;
      border-left: 3px solid #C5A55A;
      font-size: 11px;
      color: #333;
      font-style: italic;
      line-height: 1.8;
      margin: 16px 0;
    }

    /* ── RISK DISCLOSURE ── */
    .risk-disclosure {
      padding: 12px 16px;
      background: #fafafa;
      border: 1px solid #e5e5e5;
      font-size: 11px;
      color: #555;
      line-height: 1.7;
      margin: 12px 0;
    }

    /* ── ENCUMBRANCE ── */
    .encumbrance-statement {
      padding: 14px 16px;
      background: #fff9f0;
      border-left: 3px solid #d4a340;
      font-size: 11px;
      color: #6b5420;
      font-style: italic;
      line-height: 1.7;
      margin: 16px 0;
    }

    /* ── RETURN MECHANICS ── */
    .return-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-top: 8px;
    }
    .return-item {
      background: #fafafa;
      padding: 10px 14px;
      border-bottom: 2px solid #e5e5e5;
    }
    .return-item .label { margin-bottom: 4px; }
    .return-item .value {
      font-size: 12px;
      font-weight: 600;
      color: #1a1a1a;
    }

    /* ── SIGNATURE ZONE ── */
    .signature-zone {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }
    .sig-box { text-align: center; width: 45%; }
    .sig-line {
      border-bottom: 1px solid #1a1a1a;
      width: 100%;
      height: 30px;
      margin-bottom: 6px;
    }
    .sig-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888;
    }
    .sig-entity {
      font-size: 10px;
      color: #333;
      margin-top: 2px;
    }

    /* ── FOOTER ── */
    .electronic-notice {
      text-align: center;
      font-size: 9px;
      color: #888;
      padding: 8px 40px;
      font-style: italic;
    }
    .footer {
      padding: 14px 40px;
      border-top: 1px solid #e5e5e5;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .footer-left {
      font-size: 9px;
      color: #888;
      line-height: 1.6;
    }
    .footer-right {
      font-size: 8px;
      color: #aaa;
      text-align: right;
    }
    .footer-gold { height: 2px; background: #C5A55A; }

    @media print {
      body { background: white; }
      .page { box-shadow: none; margin: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="gold-line"></div>

    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <h1>Auxite</h1>
        <h2>Precious Metals Leasing Participation Note</h2>
      </div>
      <div class="header-right">
        <div class="label">Note ID</div>
        <div class="note-id">${data.noteId}</div>
        <div style="margin-top: 8px;">
          <div class="label">Effective Date</div>
          <div>${data.effectiveDate}</div>
        </div>
        <div style="margin-top: 8px;">
          <div class="label">Maturity Date</div>
          <div>${data.maturityDate}</div>
        </div>
        <div style="margin-top: 8px;">
          <div class="label">Term</div>
          <div>${data.termLabel}</div>
        </div>
      </div>
    </div>

    <div class="content">
      <!-- Participant Block -->
      <div class="section">
        <div class="section-title">Participant</div>
        <div class="field-grid">
          <div class="field">
            <div class="field-label">Client ID</div>
            <div class="field-value mono">${data.holderUid}</div>
          </div>
          <div class="field">
            <div class="field-label">Account Type</div>
            <div class="field-value">Segregated Custody</div>
          </div>
        </div>
      </div>

      <!-- Position Summary Table -->
      <div class="section">
        <div class="section-title">Position Summary</div>
        <table class="position-table">
          <thead>
            <tr>
              <th>Metal</th>
              <th>Amount</th>
              <th>Lease Rate</th>
              <th>Yield</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="bold">${data.metalName} (${data.metalSymbol})</td>
              <td class="bold">${data.amount} g</td>
              <td>${data.leaseRate}%</td>
              <td>${data.yieldType}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Structure Statement -->
      <div class="structure-statement">
        The client has elected to participate in a metals leasing program whereby allocated metals
        are temporarily deployed to approved institutional counterparties.
      </div>

      <!-- Risk Disclosure -->
      <div class="section">
        <div class="section-title">Risk Disclosure</div>
        <div class="risk-disclosure">
          Leased metals may be subject to counterparty and settlement risk. Auxite maintains
          strict counterparty selection and risk controls.
        </div>
      </div>

      <!-- Encumbrance Statement -->
      <div class="encumbrance-statement">
        During the lease term, the metals referenced herein are considered encumbered
        and may not be transferred or redeemed until maturity.
      </div>

      <!-- Return Mechanics -->
      <div class="section">
        <div class="section-title">Return Mechanics</div>
        <div class="return-grid">
          <div class="return-item">
            <div class="label">Yield Distribution</div>
            <div class="value">At Maturity</div>
          </div>
          <div class="return-item">
            <div class="label">Return Type</div>
            <div class="value">Metal Credited</div>
          </div>
          <div class="return-item">
            <div class="label">Early Exit</div>
            <div class="value">Not Permitted</div>
          </div>
        </div>
      </div>

      <!-- Collateral / Hedge Line -->
      <div class="risk-disclosure" style="margin-top: 16px;">
        Leasing activity may be supported by collateral arrangements and market hedging strategies.
      </div>

      <!-- Key Terms -->
      <div class="section">
        <div class="section-title">Key Terms</div>
        <div class="field-grid">
          <div class="field">
            <div class="field-label">Effective Date</div>
            <div class="field-value">${data.startDate}</div>
          </div>
          <div class="field">
            <div class="field-label">Maturity Date</div>
            <div class="field-value">${data.endDate}</div>
          </div>
          <div class="field">
            <div class="field-label">Lock Duration</div>
            <div class="field-value">${data.lockDays} Days</div>
          </div>
          <div class="field">
            <div class="field-label">Settlement</div>
            <div class="field-value">Within 24 Hours Post-Maturity</div>
          </div>
        </div>
      </div>

      <!-- Legal Nature -->
      <div class="section">
        <div class="section-title">Legal Nature</div>
        <div class="risk-disclosure">
          This note represents a fixed-term metals leasing arrangement administered digitally.
          It is not a security, derivative, deposit, or investment contract. It does not guarantee
          capital appreciation. In case of discrepancy, the Auxite internal ledger record prevails.
        </div>
      </div>

      <!-- Signature Zone — Dual Signature -->
      <div class="signature-zone">
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-label">Authorized Signatory</div>
          <div class="sig-entity">${data.issuerEntity}</div>
        </div>
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-label">Custody Oversight</div>
          <div class="sig-entity">Independent Verification</div>
        </div>
      </div>
    </div>

    <!-- Electronic Notice -->
    <div class="electronic-notice">
      This document is electronically issued and recorded within Auxite's custody ledger.
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-left">
        ${data.issuerEntity}<br>
        Zurich, Switzerland<br>
        Custody &amp; Settlement Services
      </div>
      <div class="footer-right">
        This note is governed by the Auxite Terms of Service<br>
        and Leasing Program Rules. In case of discrepancy,<br>
        the Auxite internal ledger shall prevail.
      </div>
    </div>
    <div class="footer-gold"></div>
  </div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════
// GET — Generate Participation Note by stakeId
// ═══════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stakeId = searchParams.get('stakeId');
    const format = searchParams.get('format') || 'html';

    if (!stakeId) {
      return NextResponse.json({ error: 'stakeId required' }, { status: 400 });
    }

    const stake = await redis.hgetall(`stake:${stakeId}`) as any;
    if (!stake || !stake.id) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 });
    }

    // Generate note ID if not exists
    let noteId = stake.noteId || stake.agreementNo;
    if (!noteId) {
      noteId = generateNoteId();
      await redis.hset(`stake:${stakeId}`, { noteId });
    }

    const lockDays = parseInt(stake.lockDays) || 91;
    const termLabel = TERM_LABELS[lockDays] || `${lockDays} Days`;
    const metalInfo = METAL_NAMES[stake.metal] || { full: stake.metal, symbol: '' };

    const startDateObj = new Date(stake.startDate || stake.createdAt);
    const endDateObj = new Date(stake.endDate || stake.maturityDate);

    const data = {
      noteId,
      stakeId: stake.id,
      holderUid: stake.userUid || stake.holderUid || 'N/A',
      metal: stake.metal,
      metalName: metalInfo.full,
      metalSymbol: metalInfo.symbol,
      amount: parseFloat(stake.amount).toFixed(4),
      termLabel,
      lockDays,
      startDate: formatDateFull(startDateObj),
      endDate: formatDateFull(endDateObj),
      effectiveDate: formatDate(startDateObj),
      maturityDate: formatDate(endDateObj),
      leaseRate: stake.apy || stake.apyPercent || '0',
      yieldType: 'Fixed',
      issueDate: formatDateFull(stake.createdAt || new Date()),
      issuerEntity: 'Auxite Precious Metals AG',
    };

    if (format === 'json') {
      return NextResponse.json(data);
    }

    const html = generateParticipationNoteHTML(data);
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error: any) {
    console.error('Participation note error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — Generate participation note with custom data (preview/testing)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      stakeId = 'PREVIEW-' + Date.now(),
      holderUid = 'PREVIEW-USER',
      metal = 'AUXG',
      amount = '10',
      lockDays = 91,
      apy = '3.40',
      startDate = new Date().toISOString(),
    } = body;

    const termLabel = TERM_LABELS[lockDays] || `${lockDays} Days`;
    const metalInfo = METAL_NAMES[metal] || { full: metal, symbol: '' };
    const endDateObj = new Date(startDate);
    endDateObj.setDate(endDateObj.getDate() + lockDays);
    const startDateObj = new Date(startDate);

    const data = {
      noteId: generateNoteId(),
      stakeId,
      holderUid,
      metal,
      metalName: metalInfo.full,
      metalSymbol: metalInfo.symbol,
      amount: parseFloat(amount).toFixed(4),
      termLabel,
      lockDays,
      startDate: formatDateFull(startDateObj),
      endDate: formatDateFull(endDateObj),
      effectiveDate: formatDate(startDateObj),
      maturityDate: formatDate(endDateObj),
      leaseRate: apy,
      yieldType: 'Fixed',
      issueDate: formatDateFull(new Date()),
      issuerEntity: 'Auxite Precious Metals AG',
    };

    const html = generateParticipationNoteHTML(data);
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error: any) {
    console.error('Participation note preview error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
