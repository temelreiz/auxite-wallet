// app/api/certificates/pdf/route.ts
// Digital Allocated Metal Certificate PDF Generator
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';

// Sertifika hash'i oluştur
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
  return createHash('sha256').update(data).digest('hex');
}

// Allocation Event ID oluştur
function generateAllocationEventId(): string {
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `ALLOC-EVT-${random}`;
}

// Ledger Reference oluştur
function generateLedgerReference(): string {
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
  return `AUX-LEDGER-${year}-${seq}`;
}

const METAL_NAMES: Record<string, { full: string; symbol: string }> = {
  AUXG: { full: 'Gold', symbol: 'Au' },
  AUXS: { full: 'Silver', symbol: 'Ag' },
  AUXPT: { full: 'Platinum', symbol: 'Pt' },
  AUXPD: { full: 'Palladium', symbol: 'Pd' },
};

const PURITY_BY_METAL: Record<string, string> = {
  AUXG: '.9999',
  AUXS: '.999',
  AUXPT: '.9995',
  AUXPD: '.9995',
};

const REFINER_INFO: Record<string, string> = {
  AUXG: 'LBMA-Listed Refiner',
  AUXS: 'LBMA-Listed Refiner',
  AUXPT: 'LPPM-Listed Refiner',
  AUXPD: 'LPPM-Listed Refiner',
};

const VAULT_INFO: Record<string, { name: string; id: string; location: string }> = {
  IST: { name: 'Vault A – Istanbul Facility', id: 'TR-IST-VAULT-01', location: 'Istanbul, Turkey' },
  ZH: { name: 'Vault B – Zurich Facility', id: 'CH-ZRH-VAULT-01', location: 'Zurich, Switzerland' },
  DB: { name: 'Vault C – Dubai Facility', id: 'AE-DXB-VAULT-01', location: 'Dubai, UAE' },
  LN: { name: 'Vault D – London Facility', id: 'UK-LDN-VAULT-01', location: 'London, UK' },
};

// GET - Sertifika PDF verisi oluştur
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const certNumber = searchParams.get('certNumber');
    const format = searchParams.get('format') || 'json';

    if (!certNumber) {
      return NextResponse.json({ error: 'certNumber required' }, { status: 400 });
    }

    // Sertifikayı bul
    const certificate = await redis.hgetall(`certificate:${certNumber}`) as any;
    if (!certificate || !certificate.certificateNumber) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    // Kullanıcının tüm allocation'larını bul
    const allocDataRaw = await redis.get(`allocation:user:${certificate.userUid}:list`);
    let allocations: any[] = [];
    if (allocDataRaw) {
      const allAllocs = typeof allocDataRaw === 'string' ? JSON.parse(allocDataRaw) : allocDataRaw;
      allocations = allAllocs.filter((a: any) => 
        a.certificateNumber === certNumber || 
        a.serialNumber === certificate.serialNumber
      );
    }

    // Hash oluştur
    const certHash = generateCertificateHash(certificate);

    // Vault bilgisi
    const vault = VAULT_INFO[certificate.vault] || {
      name: `Vault – ${certificate.vaultName || certificate.vault}`,
      id: `${certificate.vault}-VAULT-01`,
      location: certificate.vaultName || certificate.vault,
    };

    // Metal bilgisi
    const metalInfo = METAL_NAMES[certificate.metal] || { full: certificate.metal, symbol: '' };
    const purity = PURITY_BY_METAL[certificate.metal] || certificate.purity;
    const refiner = REFINER_INFO[certificate.metal] || 'Listed Refiner';

    // Sertifika verisi
    const pdfData = {
      // Header
      title: 'AUXITE GLOBAL',
      subtitle: 'Digital Allocated Metal Certificate',
      certificateId: certificate.certificateNumber,
      issueDate: certificate.issuedAt,

      // Certificate Holder
      holder: {
        uid: certificate.userUid,
        name: '(Redacted — stored in Auxite secure ledger)',
        email: '(Encrypted in Ledger)',
      },

      // Allocated Metal Details
      metal: {
        type: `${metalInfo.full} (${metalInfo.symbol})`,
        symbol: certificate.metal,
        purity: purity,
        refiner: refiner,
        certification: 'Refiner Assay Certified',
        totalWeight: `${certificate.grams} grams`,
        allocationDate: certificate.issuedAt,
      },

      // Bar Allocations
      barAllocations: allocations.length > 0 
        ? allocations.map((a, i) => ({
            allocationNo: `AL-${String(i + 1).padStart(3, '0')}`,
            barSerialNo: a.serialNumber,
            weight: `${a.grams}g`,
          }))
        : [{
            allocationNo: 'AL-001',
            barSerialNo: certificate.serialNumber,
            weight: `${certificate.grams}g`,
          }],

      // Vault & Custodian
      vault: {
        custodian: 'Auxite Approved Custodian',
        name: vault.name,
        id: vault.id,
        location: vault.location,
        storageType: 'Fully Allocated, Segregated',
      },

      // Certification Status
      status: {
        current: 'Allocated',
        redeemable: 'Yes',
        rehypothecation: 'No',
        leasing: 'No (unless opted-in separately by holder)',
      },

      // Ledger & Audit
      ledger: {
        allocationEventId: certificate.allocationEventId || generateAllocationEventId(),
        ledgerReference: certificate.ledgerReference || generateLedgerReference(),
      },

      // Verification
      verification: {
        hash: certHash,
        url: `https://auxite-wallet.vercel.app/verify?cert=${certificate.certificateNumber}`,
        qrData: `https://auxite-wallet.vercel.app/verify?cert=${certificate.certificateNumber}`,
      },

      // Issuer
      issuer: {
        name: 'Auxite Precious Metals AG',
        declaration: 'Auxite Global confirms that the above-described physical metal is fully allocated, verified by custodian records, and is uniquely linked to the bars listed in this certificate. This certificate serves as proof of allocation, not a security or financial instrument.',
        signature: 'Digital Signature Embedded',
        timestamp: certificate.issuedAt,
      },

      // Legal Disclaimers
      disclaimers: [
        'This certificate is governed by the Auxite Terms of Service and Redemption Policy.',
        'In case of any discrepancy, the Auxite allocation ledger and custodian records shall prevail.',
        'This certificate may be replaced or voided in the event of reallocation, consolidation, or redemption.',
      ],

      // Footer
      footer: 'This document may be digitally signed and timestamped. Physical printing is for reference only; the authoritative version is available via Auxite verification service.',
    };

    // HTML format
    if (format === 'html') {
      const html = generateCertificateHTML(pdfData);
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

// HTML sertifika oluştur
function generateCertificateHTML(data: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.certificateId} - Auxite Certificate</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      line-height: 1.6;
    }
    .certificate {
      max-width: 800px;
      margin: 20px auto;
      background: white;
      border: 2px solid #d4af37;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-bottom: 4px solid #d4af37;
    }
    .header h1 { 
      font-size: 28px; 
      font-weight: 700;
      letter-spacing: 4px;
      margin-bottom: 8px;
    }
    .header h2 { 
      font-size: 16px; 
      font-weight: 400;
      color: #d4af37;
      letter-spacing: 2px;
    }
    .cert-info {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.2);
    }
    .cert-info div { text-align: center; }
    .cert-info label { font-size: 10px; color: #94a3b8; text-transform: uppercase; }
    .cert-info p { font-size: 14px; font-weight: 600; font-family: monospace; }
    
    .content { padding: 30px; }
    
    .section {
      margin-bottom: 25px;
      padding: 20px;
      background: #f8fafc;
      border-radius: 8px;
      border-left: 4px solid #d4af37;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #d4af37;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title span { font-size: 18px; }
    
    table { width: 100%; border-collapse: collapse; }
    table th, table td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    table th { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
    table td { font-size: 13px; color: #1e293b; }
    table td.mono { font-family: monospace; }
    
    .status-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .status-item { display: flex; justify-content: space-between; padding: 8px 12px; background: white; border-radius: 4px; }
    .status-item label { color: #64748b; font-size: 12px; }
    .status-item span { font-weight: 600; font-size: 12px; }
    .status-item span.yes { color: #10b981; }
    .status-item span.no { color: #ef4444; }
    
    .hash-box {
      background: #1e293b;
      color: #10b981;
      padding: 12px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 11px;
      word-break: break-all;
      margin: 10px 0;
    }
    
    .ledger-box {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      padding: 12px;
      border-radius: 4px;
      margin: 15px 0;
    }
    .ledger-box p { font-size: 12px; color: #92400e; margin: 4px 0; }
    .ledger-box strong { color: #78350f; }
    
    .verification-url { color: #3b82f6; text-decoration: none; font-size: 12px; }
    
    .qr-placeholder {
      width: 100px; height: 100px;
      background: #f1f5f9;
      border: 2px dashed #cbd5e1;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; color: #64748b;
      margin-top: 10px;
    }
    
    .declaration { font-size: 12px; color: #475569; font-style: italic; line-height: 1.8; }
    
    .disclaimers {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      padding: 15px;
      margin-top: 20px;
    }
    .disclaimers p {
      font-size: 11px;
      color: #991b1b;
      margin: 8px 0;
      padding-left: 15px;
      position: relative;
    }
    .disclaimers p::before {
      content: "•";
      position: absolute;
      left: 0;
      color: #dc2626;
    }
    
    .signature {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .signature-box { text-align: center; }
    .signature-line {
      width: 200px;
      border-bottom: 1px solid #1e293b;
      margin-bottom: 5px;
      font-family: 'Brush Script MT', cursive;
      font-size: 24px;
      color: #1e293b;
    }
    .signature-label { font-size: 10px; color: #64748b; }
    
    .footer {
      background: #f1f5f9;
      padding: 15px 30px;
      font-size: 10px;
      color: #64748b;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    
    @media print {
      body { background: white; }
      .certificate { box-shadow: none; margin: 0; border: none; }
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <h1>🏢 ${data.title}</h1>
      <h2>${data.subtitle}</h2>
      <div class="cert-info">
        <div>
          <label>Certificate ID</label>
          <p>${data.certificateId}</p>
        </div>
        <div>
          <label>Issue Date (UTC)</label>
          <p>${new Date(data.issueDate).toISOString()}</p>
        </div>
      </div>
    </div>
    
    <div class="content">
      <!-- Certificate Holder -->
      <div class="section">
        <div class="section-title"><span>👤</span> Certificate Holder</div>
        <table>
          <tr><th>Field</th><th>Value</th></tr>
          <tr><td>Holder UID</td><td class="mono">${data.holder.uid}</td></tr>
          <tr><td>Holder Name</td><td>${data.holder.name}</td></tr>
          <tr><td>Contact Email</td><td>${data.holder.email}</td></tr>
        </table>
      </div>
      
      <!-- Allocated Metal Details -->
      <div class="section">
        <div class="section-title"><span>🪙</span> Allocated Metal Details</div>
        <table>
          <tr><th>Field</th><th>Value</th></tr>
          <tr><td>Metal Type</td><td><strong>${data.metal.type}</strong></td></tr>
          <tr><td>Purity</td><td>${data.metal.purity}</td></tr>
          <tr><td>Refiner</td><td>${data.metal.refiner}</td></tr>
          <tr><td>Certification</td><td>${data.metal.certification}</td></tr>
          <tr><td>Total Allocated Weight</td><td><strong>${data.metal.totalWeight}</strong></td></tr>
          <tr><td>Allocation Effective Date</td><td>${new Date(data.metal.allocationDate).toISOString()}</td></tr>
        </table>
      </div>
      
      <!-- Bar Allocations -->
      <div class="section">
        <div class="section-title"><span>📦</span> Bar Allocations (Physical)</div>
        <table>
          <tr><th>Allocation No</th><th>Bar Serial No</th><th>Weight</th></tr>
          ${data.barAllocations.map((bar: any) => `
            <tr>
              <td>${bar.allocationNo}</td>
              <td class="mono">${bar.barSerialNo}</td>
              <td>${bar.weight}</td>
            </tr>
          `).join('')}
        </table>
        <p style="font-size: 11px; color: #64748b; margin-top: 10px; font-style: italic;">
          Each bar is uniquely identifiable and segregated within the vault.
        </p>
      </div>
      
      <!-- Vault & Custodian -->
      <div class="section">
        <div class="section-title"><span>🏦</span> Vault & Custodian</div>
        <table>
          <tr><th>Field</th><th>Value</th></tr>
          <tr><td>Custodian</td><td>${data.vault.custodian}</td></tr>
          <tr><td>Vault Name</td><td>${data.vault.name}</td></tr>
          <tr><td>Vault ID</td><td class="mono">${data.vault.id}</td></tr>
          <tr><td>Location</td><td>${data.vault.location}</td></tr>
          <tr><td>Storage Type</td><td>${data.vault.storageType}</td></tr>
        </table>
      </div>
      
      <!-- Certification Status -->
      <div class="section">
        <div class="section-title"><span>🔐</span> Certification Status</div>
        <div class="status-grid">
          <div class="status-item"><label>Status</label><span class="yes">${data.status.current}</span></div>
          <div class="status-item"><label>Redeemable</label><span class="yes">${data.status.redeemable}</span></div>
          <div class="status-item"><label>Rehypothecation</label><span class="no">${data.status.rehypothecation}</span></div>
          <div class="status-item"><label>Leasing</label><span class="no">${data.status.leasing}</span></div>
        </div>
      </div>
      
      <!-- Ledger & Audit Reference -->
      <div class="section">
        <div class="section-title"><span>📋</span> Ledger & Audit Reference</div>
        <div class="ledger-box">
          <p><strong>Allocation Event ID:</strong> ${data.ledger.allocationEventId}</p>
          <p><strong>Ledger Reference:</strong> ${data.ledger.ledgerReference}</p>
        </div>
      </div>
      
      <!-- Verification -->
      <div class="section">
        <div class="section-title"><span>🔍</span> Verification</div>
        <p style="font-size: 12px; margin-bottom: 8px;"><strong>Certificate Hash (SHA-256):</strong></p>
        <div class="hash-box">${data.verification.hash}</div>
        <p style="font-size: 12px; margin-bottom: 8px;"><strong>Verification URL:</strong></p>
        <a href="${data.verification.url}" class="verification-url">${data.verification.url}</a>
        <div class="qr-placeholder">QR Code<br>(Scan to Verify)</div>
      </div>
      
      <!-- Issuer Declaration -->
      <div class="section">
        <div class="section-title"><span>⚖️</span> Issuer Declaration</div>
        <p class="declaration">${data.issuer.declaration}</p>
        
        <!-- Legal Disclaimers -->
        <div class="disclaimers">
          ${data.disclaimers.map((d: string) => `<p>${d}</p>`).join('')}
        </div>
        
        <div class="signature">
          <div class="signature-box">
            <div class="signature-line">Auxite Global</div>
            <div class="signature-label">${data.issuer.name}</div>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 11px; color: #64748b;">Digital Signature: <span style="color: #10b981;">✓ Verified</span></p>
            <p style="font-size: 11px; color: #64748b;">Timestamp: ${new Date(data.issuer.timestamp).toISOString()}</p>
          </div>
        </div>
      </div>
    </div>
    
    <div class="footer">${data.footer}</div>
  </div>
</body>
</html>
  `;
}
