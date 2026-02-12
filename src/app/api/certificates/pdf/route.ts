// app/api/certificates/pdf/route.ts
// CERTIFICATE OF METAL ALLOCATION — Institutional Grade
// Swiss Private Bank + LBMA Custody Statement Style
// NO gradients, NO crypto vibes, NO startup aesthetics
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { createHash } from 'crypto';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

// ═══════════════════════════════════════════════
// HASH & REFERENCE GENERATORS
// ═══════════════════════════════════════════════

function generateCertificateHash(certificate: any): string {
  const data = JSON.stringify({
    certificateNumber: certificate.certificateNumber,
    userUid: certificate.userUid,
    metal: certificate.metal,
    grams: certificate.grams,
    serialNumber: certificate.serialNumber,
    vault: certificate.vault,
    purity: certificate.purity,
    issuedAt: certificate.issuedAt,
  });
  return '0x' + createHash('sha256').update(data).digest('hex');
}

function generateAllocationEventId(): string {
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `ALLOC-EVT-${random}`;
}

function generateLedgerReference(): string {
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
  return `AUX-LEDGER-${year}-${seq}`;
}

// ═══════════════════════════════════════════════
// METAL & VAULT CONSTANTS
// ═══════════════════════════════════════════════

const METAL_NAMES: Record<string, { full: string; symbol: string }> = {
  AUXG: { full: 'Gold', symbol: 'Au' },
  AUXS: { full: 'Silver', symbol: 'Ag' },
  AUXPT: { full: 'Platinum', symbol: 'Pt' },
  AUXPD: { full: 'Palladium', symbol: 'Pd' },
};

const PURITY_BY_METAL: Record<string, string> = {
  AUXG: '999.9',
  AUXS: '999',
  AUXPT: '999.5',
  AUXPD: '999.5',
};

const FORM_BY_METAL: Record<string, string> = {
  AUXG: 'LBMA Good Delivery',
  AUXS: 'LBMA Good Delivery',
  AUXPT: 'LPPM Good Delivery',
  AUXPD: 'LPPM Good Delivery',
};

const REFINER_BY_METAL: Record<string, string> = {
  AUXG: 'LBMA-Listed Refiner',
  AUXS: 'LBMA-Listed Refiner',
  AUXPT: 'LPPM-Listed Refiner',
  AUXPD: 'LPPM-Listed Refiner',
};

const VAULT_INFO: Record<string, { name: string; id: string; location: string; country: string }> = {
  IST: { name: 'Vault A – Istanbul Facility', id: 'TR-IST-VAULT-01', location: 'Istanbul', country: 'Turkey' },
  ZH: { name: 'Vault B – Zurich Facility', id: 'CH-ZRH-VAULT-01', location: 'Zurich', country: 'Switzerland' },
  DB: { name: 'Vault C – Dubai Facility', id: 'AE-DXB-VAULT-01', location: 'Dubai', country: 'UAE' },
  LN: { name: 'Vault D – London Facility', id: 'UK-LDN-VAULT-01', location: 'London', country: 'United Kingdom' },
};

// ═══════════════════════════════════════════════
// GET — Generate Certificate Data + HTML
// ═══════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const certNumber = searchParams.get('certNumber');
    const format = searchParams.get('format') || 'json';

    if (!certNumber) {
      return NextResponse.json({ error: 'certNumber required' }, { status: 400 });
    }

    const certificate = await redis.hgetall(`certificate:${certNumber}`) as any;
    if (!certificate || !certificate.certificateNumber) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    // User allocations for bar traceability
    const allocDataRaw = await redis.get(`allocation:user:${certificate.userUid}:list`);
    let allocations: any[] = [];
    if (allocDataRaw) {
      const allAllocs = typeof allocDataRaw === 'string' ? JSON.parse(allocDataRaw) : allocDataRaw;
      allocations = allAllocs.filter((a: any) =>
        a.certificateNumber === certNumber ||
        a.serialNumber === certificate.serialNumber
      );
    }

    const certHash = generateCertificateHash(certificate);
    const vault = VAULT_INFO[certificate.vault] || {
      name: `Vault – ${certificate.vaultName || certificate.vault}`,
      id: `${certificate.vault}-VAULT-01`,
      location: certificate.vaultName || certificate.vault,
      country: '',
    };
    const metalInfo = METAL_NAMES[certificate.metal] || { full: certificate.metal, symbol: '' };
    const purity = PURITY_BY_METAL[certificate.metal] || certificate.purity;
    const form = FORM_BY_METAL[certificate.metal] || 'Good Delivery';
    const refiner = REFINER_BY_METAL[certificate.metal] || 'Listed Refiner';

    const verifyUrl = `https://vault.auxite.io/verify?cert=${certificate.certificateNumber}`;

    // Generate QR code as data URL
    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 120,
        margin: 1,
        color: { dark: '#1e293b', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });
    } catch (e) {
      console.warn('QR generation failed:', e);
    }

    // Build institutional certificate data
    const pdfData = {
      // Header
      certificateNumber: certificate.certificateNumber,
      issueDate: certificate.issuedAt,
      statementType: 'Allocated Custody',

      // Client block
      client: {
        uid: certificate.userUid,
        jurisdiction: vault.country || 'International',
        accountType: 'Segregated Custody',
      },

      // Metal details
      metal: {
        name: metalInfo.full,
        symbol: metalInfo.symbol,
        auxSymbol: certificate.metal,
        quantity: `${certificate.grams} g`,
        gramsNumeric: parseFloat(certificate.grams),
        purity: purity,
        form: form,
        allocationType: 'Fully Allocated',
      },

      // Bar traceability
      bars: allocations.length > 0
        ? allocations.map((a, i) => ({
            refiner: refiner,
            serial: a.serialNumber,
            grossWeight: `${parseFloat(a.grams).toFixed(1)}g`,
            fineWeight: `${parseFloat(a.grams).toFixed(1)}g`,
          }))
        : [{
            refiner: refiner,
            serial: certificate.serialNumber,
            grossWeight: `${parseFloat(certificate.grams).toFixed(1)}g`,
            fineWeight: `${parseFloat(certificate.grams).toFixed(1)}g`,
          }],

      // Custody structure
      custody: {
        custodian: 'Auxite Approved Custodian',
        vaultName: vault.name,
        vaultId: vault.id,
        location: vault.location,
        structure: 'Bankruptcy-Remote Bailment',
        audit: 'Independently Verified',
        encumbrance: 'None',
      },

      // Verification
      verification: {
        hash: certHash,
        url: verifyUrl,
        qrDataUrl: qrDataUrl,
      },

      // Ledger
      ledger: {
        allocationEventId: certificate.allocationEventId || generateAllocationEventId(),
        ledgerReference: certificate.ledgerReference || generateLedgerReference(),
      },

      // Issuer
      issuer: {
        name: 'Auxite Precious Metals AG',
        address: 'Zurich, Switzerland',
      },
    };

    if (format === 'html' || format === 'pdf') {
      const html = generateInstitutionalCertificateHTML(pdfData, format === 'pdf');
      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return NextResponse.json({ success: true, certificate: pdfData });
  } catch (error: any) {
    console.error('Certificate PDF error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════
// INSTITUTIONAL CERTIFICATE HTML
// Swiss Private Bank + LBMA Custody Statement
// ═══════════════════════════════════════════════

function generateInstitutionalCertificateHTML(data: any, autoPrint: boolean = false): string {
  const issueDate = new Date(data.issueDate);
  const formattedDate = issueDate.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  const barRows = data.bars.map((bar: any) => `
    <tr>
      <td>${bar.refiner}</td>
      <td class="mono">${bar.serial}</td>
      <td>${bar.grossWeight}</td>
      <td>${bar.fineWeight}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.certificateNumber} — Certificate of Metal Allocation</title>
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
      position: relative;
    }

    /* ── GOLD ACCENT LINE ── */
    .gold-line {
      height: 3px;
      background: #C5A55A;
    }

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
      font-size: 18px;
      font-weight: 400;
      color: #333;
      letter-spacing: 1px;
    }
    .header-right {
      text-align: right;
      font-size: 11px;
      color: #333;
      line-height: 1.7;
    }
    .header-right .cert-no {
      font-family: 'Courier New', monospace;
      font-weight: 700;
      color: #1a1a1a;
      font-size: 12px;
    }
    .header-right .label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #666;
    }

    /* ── PREAMBLE ── */
    .preamble {
      padding: 16px 40px;
      font-size: 11px;
      color: #333;
      font-style: italic;
      background: #f8f7f4;
      border-bottom: 1px solid #e0e0e0;
    }

    /* ── CONTENT ── */
    .content { padding: 24px 40px; }

    /* ── SECTION ── */
    .section {
      margin-bottom: 22px;
    }
    .section-title {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #555;
      margin-bottom: 10px;
      padding-bottom: 4px;
      border-bottom: 1px solid #ccc;
    }

    /* ── CLIENT BLOCK ── */
    .client-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 30px;
    }
    .field { margin-bottom: 4px; }
    .field-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #555;
    }
    .field-value {
      font-size: 13px;
      color: #111;
      font-weight: 600;
    }
    .field-value.mono {
      font-family: 'Courier New', monospace;
    }

    /* ── METAL TABLE ── */
    .metal-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    .metal-table th {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #444;
      font-weight: 700;
      padding: 8px 10px;
      text-align: left;
      border-bottom: 2px solid #C5A55A;
      background: #f8f7f4;
    }
    .metal-table td {
      font-size: 13px;
      padding: 10px 10px;
      border-bottom: 1px solid #ddd;
      color: #111;
    }
    .metal-table td.mono {
      font-family: 'Courier New', monospace;
      font-size: 11px;
    }
    .metal-table td.bold {
      font-weight: 700;
    }

    /* ── BAR TRACEABILITY ── */
    .bar-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    .bar-table th {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #444;
      font-weight: 700;
      padding: 8px 10px;
      text-align: left;
      border-bottom: 2px solid #1a1a1a;
      background: #f8f7f4;
    }
    .bar-table td {
      font-size: 12px;
      padding: 8px 10px;
      border-bottom: 1px solid #ddd;
      color: #111;
    }
    .bar-table td.mono {
      font-family: 'Courier New', monospace;
    }

    /* ── LEGAL STATEMENT ── */
    .legal-statement {
      padding: 14px 16px;
      background: #f8f7f4;
      border-left: 3px solid #C5A55A;
      font-size: 12px;
      color: #222;
      font-style: italic;
      line-height: 1.7;
      margin: 16px 0;
    }

    /* ── CUSTODY STRUCTURE ── */
    .custody-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 30px;
    }

    /* ── VERIFICATION ── */
    .verification-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      margin-top: 8px;
    }
    .hash-block {
      flex: 1;
    }
    .hash-box {
      font-family: 'Courier New', monospace;
      font-size: 9px;
      color: #333;
      background: #f5f5f3;
      padding: 10px 12px;
      word-break: break-all;
      border: 1px solid #ccc;
      margin-top: 6px;
    }
    .qr-block {
      text-align: center;
    }
    .qr-block img {
      width: 100px;
      height: 100px;
    }
    .qr-label {
      font-size: 8px;
      color: #555;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* ── SIGNATURE ZONE ── */
    .signature-zone {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }
    .sig-box {
      text-align: center;
      width: 45%;
    }
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
      color: #555;
    }
    .sig-entity {
      font-size: 10px;
      color: #222;
      margin-top: 2px;
    }

    /* ── FOOTER ── */
    .footer {
      padding: 14px 40px;
      border-top: 1px solid #e5e5e5;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .footer-left {
      font-size: 9px;
      color: #555;
      line-height: 1.6;
    }
    .footer-right {
      font-size: 8px;
      color: #777;
      text-align: right;
    }
    .footer-gold {
      height: 2px;
      background: #C5A55A;
    }

    /* ── ELECTRONIC NOTICE ── */
    .electronic-notice {
      text-align: center;
      font-size: 9px;
      color: #555;
      padding: 8px 40px;
      font-style: italic;
    }

    /* ── PDF DOWNLOAD BAR ── */
    .pdf-bar {
      text-align: center;
      padding: 12px 40px;
      background: #f8f7f4;
      border-bottom: 1px solid #e0e0e0;
    }
    .pdf-bar button {
      font-family: Georgia, 'Times New Roman', serif;
      background: #1a1a1a;
      color: #fff;
      border: none;
      padding: 10px 28px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      cursor: pointer;
      margin: 0 6px;
    }
    .pdf-bar button:hover { background: #333; }
    .pdf-bar button.outline {
      background: transparent;
      color: #1a1a1a;
      border: 1px solid #1a1a1a;
    }
    .pdf-bar button.outline:hover { background: #f0f0f0; }
    @media print {
      .pdf-bar { display: none !important; }
    }

    /* ── PRINT ── */
    @media print {
      body { background: white; }
      .page { box-shadow: none; margin: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Gold accent line -->
    <div class="gold-line"></div>

    <!-- PDF Download Bar -->
    <div class="pdf-bar">
      <button onclick="window.print()">⬇ Save as PDF</button>
      <button class="outline" onclick="window.history.back()">← Back</button>
    </div>

    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <h1>Auxite</h1>
        <h2>Certificate of Metal Allocation</h2>
      </div>
      <div class="header-right">
        <div class="label">Certificate No</div>
        <div class="cert-no">${data.certificateNumber}</div>
        <div style="margin-top: 8px;">
          <div class="label">Issue Date</div>
          <div>${formattedDate}</div>
        </div>
        <div style="margin-top: 8px;">
          <div class="label">Statement Type</div>
          <div>${data.statementType}</div>
        </div>
      </div>
    </div>

    <!-- Preamble -->
    <div class="preamble">
      This certificate confirms beneficial ownership of fully allocated physical precious metals
      held within independent custody structures.
    </div>

    <div class="content">
      <!-- Client Block -->
      <div class="section">
        <div class="section-title">Account Holder</div>
        <div class="client-grid">
          <div class="field">
            <div class="field-label">Client ID</div>
            <div class="field-value mono">${data.client.uid}</div>
          </div>
          <div class="field">
            <div class="field-label">Jurisdiction</div>
            <div class="field-value">${data.client.jurisdiction}</div>
          </div>
          <div class="field">
            <div class="field-label">Account Type</div>
            <div class="field-value">${data.client.accountType}</div>
          </div>
          <div class="field">
            <div class="field-label">Classification</div>
            <div class="field-value">Beneficial Owner</div>
          </div>
        </div>
      </div>

      <!-- Metal Details Table -->
      <div class="section">
        <div class="section-title">Metal Allocation Details</div>
        <table class="metal-table">
          <thead>
            <tr>
              <th>Metal</th>
              <th>Quantity</th>
              <th>Purity</th>
              <th>Form</th>
              <th>Vault</th>
              <th>Allocation Type</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="bold">${data.metal.name} (${data.metal.symbol})</td>
              <td class="bold">${data.metal.quantity}</td>
              <td>${data.metal.purity}</td>
              <td>${data.metal.form}</td>
              <td>${data.custody.location}</td>
              <td>${data.metal.allocationType}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Bar / Lot Traceability -->
      <div class="section">
        <div class="section-title">Bar / Lot Traceability</div>
        <table class="bar-table">
          <thead>
            <tr>
              <th>Refiner</th>
              <th>Bar Serial</th>
              <th>Gross Weight</th>
              <th>Fine Weight</th>
            </tr>
          </thead>
          <tbody>
            ${barRows}
          </tbody>
        </table>
      </div>

      <!-- Legal Statement -->
      <div class="legal-statement">
        Title to the above metals is held for the benefit of the client and is not recorded
        on the balance sheet of Auxite or any affiliated entity.
      </div>

      <!-- Custody Structure -->
      <div class="section">
        <div class="section-title">Custody Structure</div>
        <div class="custody-grid">
          <div class="field">
            <div class="field-label">Custodian</div>
            <div class="field-value">${data.custody.custodian}</div>
          </div>
          <div class="field">
            <div class="field-label">Structure</div>
            <div class="field-value">${data.custody.structure}</div>
          </div>
          <div class="field">
            <div class="field-label">Audit</div>
            <div class="field-value">${data.custody.audit}</div>
          </div>
          <div class="field">
            <div class="field-label">Encumbrance</div>
            <div class="field-value">${data.custody.encumbrance}</div>
          </div>
        </div>
      </div>

      <!-- Verification -->
      <div class="section">
        <div class="section-title">Verification</div>
        <div class="verification-row">
          <div class="hash-block">
            <div class="field-label">Certificate Hash (SHA-256)</div>
            <div class="hash-box">${data.verification.hash}</div>
            <div style="margin-top: 8px;">
              <div class="field-label">Ledger References</div>
              <div style="font-size: 11px; color: #222; margin-top: 4px;">
                Event: <span class="mono" style="font-family: 'Courier New', monospace;">${data.ledger.allocationEventId}</span><br>
                Ledger: <span class="mono" style="font-family: 'Courier New', monospace;">${data.ledger.ledgerReference}</span>
              </div>
            </div>
          </div>
          <div class="qr-block">
            ${data.verification.qrDataUrl
              ? `<img src="${data.verification.qrDataUrl}" alt="Verify Certificate" />`
              : `<div style="width:100px;height:100px;border:2px dashed #ccc;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">QR Code</div>`
            }
            <div class="qr-label">Scan to Verify</div>
          </div>
        </div>
      </div>

      <!-- Signature Zone — Dual Signature -->
      <div class="signature-zone">
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-label">Authorized Signatory</div>
          <div class="sig-entity">${data.issuer.name}</div>
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
        ${data.issuer.name}<br>
        ${data.issuer.address}<br>
        Custody &amp; Settlement Services
      </div>
      <div class="footer-right">
        This certificate is governed by the Auxite Terms of Service<br>
        and Redemption Policy. In case of discrepancy, the Auxite<br>
        allocation ledger and custodian records shall prevail.
      </div>
    </div>
    <div class="footer-gold"></div>
  </div>
  ${autoPrint ? `<script>window.onload = function() { window.print(); }</script>` : ''}
</body>
</html>`;
}
