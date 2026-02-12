// lib/email.ts
// INSTITUTIONAL EMAIL SERVICE — Auxite Precious Metals AG
// Swiss Private Bank Style — Plain, Dense, Structured
// NO gradients, NO crypto vibes, NO marketing banners
// Think: Private bank statement, NOT fintech campaign

import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@auxite.io';
const VAULT_URL = 'https://vault.auxite.io';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  try {
    if (!resend) {
      console.warn('Resend API key not configured — email not sent');
      return { success: false, error: 'Email service not configured' };
    }

    const { data, error } = await resend.emails.send({
      from: `Auxite <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Email send error:', error);
      throw new Error(error.message);
    }

    console.log(`Email sent to ${to}: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error('Email service error:', err);
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════
// INSTITUTIONAL EMAIL WRAPPER
// Swiss private bank style — minimal, dense, structured
// White background, black text, gold accent, serif typography
// ═══════════════════════════════════════════════════════════════

function institutionalEmailWrapper(content: string, deskName: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; background: #f5f5f5; margin: 0; padding: 20px; color: #1a1a1a; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .gold-line { height: 3px; background: #C5A55A; }
    .header {
      padding: 24px 30px 16px;
      border-bottom: 1px solid #e5e5e5;
    }
    .header h1 {
      font-size: 13px;
      letter-spacing: 5px;
      color: #1a1a1a;
      font-weight: 700;
      text-transform: uppercase;
      margin: 0 0 2px 0;
    }
    .header p {
      font-size: 11px;
      color: #888;
      margin: 0;
    }
    .body { padding: 28px 30px; }
    .body h2 {
      font-size: 16px;
      color: #1a1a1a;
      font-weight: 400;
      margin: 0 0 16px 0;
    }
    .body p {
      font-size: 13px;
      color: #444;
      line-height: 1.7;
      margin: 0 0 14px 0;
    }
    .greeting {
      font-size: 13px;
      color: #444;
      margin: 0 0 16px 0;
    }
    .detail-card {
      background: #fafafa;
      border-left: 3px solid #C5A55A;
      padding: 16px 18px;
      margin: 18px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #eee;
    }
    .detail-row:last-child { border-bottom: none; }
    .detail-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888;
    }
    .detail-value {
      font-size: 12px;
      font-weight: 600;
      color: #1a1a1a;
      text-align: right;
    }
    .cta-button {
      display: inline-block;
      background: #1a1a1a;
      color: #fff;
      padding: 12px 24px;
      text-decoration: none;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin: 16px 0;
    }
    .notice {
      font-size: 11px;
      color: #888;
      font-style: italic;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #eee;
    }
    .desk-sign {
      font-size: 12px;
      color: #666;
      font-style: italic;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #eee;
    }
    .master-footer-notice {
      font-size: 10px;
      color: #999;
      margin-top: 12px;
      font-style: italic;
    }
    .security-alert-box {
      background: #fef2f2;
      border-left: 3px solid #dc2626;
      padding: 16px 18px;
      margin: 18px 0;
    }
    .footer {
      padding: 16px 30px;
      border-top: 1px solid #e5e5e5;
      text-align: center;
    }
    .footer p {
      font-size: 9px;
      color: #aaa;
      margin: 4px 0;
    }
    .footer-gold { height: 2px; background: #C5A55A; }
  </style>
</head>
<body>
  <div class="container">
    <div class="gold-line"></div>
    <div class="header">
      <h1>Auxite</h1>
      <p>Custody &amp; Settlement Services</p>
    </div>
    <div class="body">
      ${content}

      <p class="desk-sign">${deskName}</p>
      <p class="master-footer-notice">This message serves as an operational confirmation and should be retained for your financial records.</p>
    </div>
    <div class="footer">
      <p>Aurum Ledger Ltd &middot; Hong Kong</p>
      <p>This is an automated notification. Please do not reply.</p>
    </div>
    <div class="footer-gold"></div>
  </div>
</body>
</html>`;
}


// ═══════════════════════════════════════════════════════════════
// 1. TRADE EXECUTION CONFIRMATION
// Metal alim / satim sonrasi — VERY CRITICAL
// ═══════════════════════════════════════════════════════════════

export async function sendTradeExecutionEmail(
  to: string,
  data: {
    clientName?: string;
    transactionType: 'Buy' | 'Sell';
    metal: string;
    metalName: string;
    grams: string;
    executionPrice: string;
    grossConsideration: string;
    executionTime: string;
    referenceId: string;
    language?: string;
  }
) {
  const lang = data.language || 'en';
  const name = data.clientName || 'Client';

  const t = lang === 'tr' ? {
    subject: `Takas Onay\u0131 — ${data.referenceId}`,
    greeting: `Say\u0131n ${name},`,
    intro: 'Son i\u015Fleminiz ba\u015Far\u0131yla ger\u00E7ekle\u015Ftirilmi\u015F ve Auxite defterine kaydedilmi\u015Ftir.',
    txType: '\u0130\u015Flem T\u00FCr\u00FC',
    metal: 'Metal',
    quantity: 'Miktar',
    execPrice: 'Ger\u00E7ekle\u015Ftirme Fiyat\u0131',
    grossConsideration: 'Br\u00FCt Tutar',
    execTime: 'Ger\u00E7ekle\u015Ftirme Zaman\u0131',
    refId: 'Referans No',
    settlement: 'Takas i\u015Flemi \u015Fu anda devam etmektedir. Tamamland\u0131\u011F\u0131nda, g\u00FCncellenmi\u015F bakiyeleriniz saklama hesab\u0131n\u0131za yans\u0131t\u0131lacakt\u0131r.',
    executionOnly: 'Auxite yaln\u0131zca emir ger\u00E7ekle\u015Ftirme modeliyle \u00E7al\u0131\u015F\u0131r ve m\u00FC\u015Fteri ak\u0131\u015F\u0131na kar\u015F\u0131 tescilli al\u0131m sat\u0131m yapmaz.',
    unauthorized: 'Bu i\u015Flemi siz yetkilendirmediyseniz, l\u00FCtfen derhal Auxite ile ileti\u015Fime ge\u00E7in.',
    viewLedger: 'M\u00FC\u015Fteri Defterinde G\u00F6r\u00FCnt\u00FCle',
    desk: 'Auxite Ger\u00E7ekle\u015Ftirme Masas\u0131',
  } : {
    subject: `Trade Execution Confirmation — ${data.referenceId}`,
    greeting: `Dear ${name},`,
    intro: 'Your recent transaction has been successfully executed and recorded within the Auxite ledger.',
    txType: 'Transaction Type',
    metal: 'Metal',
    quantity: 'Quantity',
    execPrice: 'Execution Price',
    grossConsideration: 'Gross Consideration',
    execTime: 'Execution Time',
    refId: 'Reference ID',
    settlement: 'Settlement is currently in progress. Once completed, your updated balances will be reflected within your custody account.',
    executionOnly: 'Auxite operates an execution-only model and does not engage in proprietary trading against client flow.',
    unauthorized: 'If you did not authorize this transaction, please contact Auxite immediately.',
    viewLedger: 'View in Client Ledger',
    desk: 'Auxite Execution Desk',
  };

  const content = `
    <p class="greeting">${t.greeting}</p>
    <p>${t.intro}</p>

    <div class="detail-card">
      <div class="detail-row">
        <span class="detail-label">${t.txType}</span>
        <span class="detail-value">${data.transactionType}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.metal}</span>
        <span class="detail-value">${data.metalName} (${data.metal})</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.quantity}</span>
        <span class="detail-value">${data.grams}g</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.execPrice}</span>
        <span class="detail-value">${data.executionPrice}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.grossConsideration}</span>
        <span class="detail-value">${data.grossConsideration}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.execTime}</span>
        <span class="detail-value">${data.executionTime}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.refId}</span>
        <span class="detail-value">${data.referenceId}</span>
      </div>
    </div>

    <p>${t.settlement}</p>
    <p style="font-size: 12px; color: #666;">${t.executionOnly}</p>

    <a href="${VAULT_URL}/vault" class="cta-button">${t.viewLedger}</a>

    <div class="notice">${t.unauthorized}</div>
  `;

  return sendEmail({
    to,
    subject: t.subject,
    html: institutionalEmailWrapper(content, t.desk),
  });
}


// ═══════════════════════════════════════════════════════════════
// 2. METAL ALLOCATION CONFIRMATION (CERTIFICATE EMAIL)
// ═══════════════════════════════════════════════════════════════

export async function sendCertificateEmail(
  to: string,
  certificateHtml: string,
  data: {
    certificateNumber: string;
    metal: string;
    metalName: string;
    grams: string;
    purity?: string;
    vaultLocation?: string;
    holderName?: string;
    language?: string;
  }
) {
  const lang = data.language || 'en';
  const name = data.holderName || 'Client';

  const t = lang === 'tr' ? {
    subject: `Metal Tahsis Onay\u0131 — ${data.certificateNumber}`,
    greeting: `Say\u0131n ${name},`,
    intro: 'Son i\u015Fleminize ba\u011Fl\u0131 metaller tam olarak tahsis edilmi\u015F ve menfaatiniz i\u00E7in ba\u011F\u0131ms\u0131z saklama yap\u0131lar\u0131 dahilinde tutulmaktad\u0131r.',
    metal: 'Metal',
    quantity: 'Miktar',
    purity: 'Safl\u0131k',
    vault: 'Kasa Lokasyonu',
    allocationType: 'Tahsis T\u00FCr\u00FC',
    fullyAllocated: 'Tam Tahsisli',
    encumbrance: 'Teminat Durumu',
    none: 'Yok',
    certId: 'Sertifika No',
    balanceSheet: 'Metallerin m\u00FClkiyeti sizin menfaatinize tutulmakta olup Auxite bilan\u00E7osunda kay\u0131tl\u0131 de\u011Fildir.',
    certAvailable: 'Tahsis sertifikan\u0131z art\u0131k belge kasan\u0131zda mevcuttur.',
    viewCert: 'Sertifikay\u0131 G\u00F6r\u00FCnt\u00FCle',
    desk: 'Auxite Saklama Operasyonlar\u0131',
  } : {
    subject: `Certificate of Metal Allocation — ${data.certificateNumber}`,
    greeting: `Dear ${name},`,
    intro: 'This is to confirm that the metals associated with your recent transaction have been fully allocated and are now held within independent custody structures for your benefit.',
    metal: 'Metal',
    quantity: 'Quantity',
    purity: 'Purity',
    vault: 'Vault Location',
    allocationType: 'Allocation Type',
    fullyAllocated: 'Fully Allocated',
    encumbrance: 'Encumbrance Status',
    none: 'None',
    certId: 'Certificate ID',
    balanceSheet: 'Title to the metals is held for your benefit and is not recorded on the balance sheet of Auxite.',
    certAvailable: 'Your allocation certificate is now available within your document vault.',
    viewCert: 'View Certificate',
    desk: 'Auxite Custody Operations',
  };

  const content = `
    <p class="greeting">${t.greeting}</p>
    <p>${t.intro}</p>

    <div class="detail-card">
      <div class="detail-row">
        <span class="detail-label">${t.metal}</span>
        <span class="detail-value">${data.metalName} (${data.metal})</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.quantity}</span>
        <span class="detail-value">${data.grams}g</span>
      </div>
      ${data.purity ? `
      <div class="detail-row">
        <span class="detail-label">${t.purity}</span>
        <span class="detail-value">${data.purity}</span>
      </div>
      ` : ''}
      ${data.vaultLocation ? `
      <div class="detail-row">
        <span class="detail-label">${t.vault}</span>
        <span class="detail-value">${data.vaultLocation}</span>
      </div>
      ` : ''}
      <div class="detail-row">
        <span class="detail-label">${t.allocationType}</span>
        <span class="detail-value">${t.fullyAllocated}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.encumbrance}</span>
        <span class="detail-value">${t.none}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.certId}</span>
        <span class="detail-value">${data.certificateNumber}</span>
      </div>
    </div>

    <p style="font-weight: 600; color: #1a1a1a;">${t.balanceSheet}</p>
    <p>${t.certAvailable}</p>

    <a href="${VAULT_URL}/api/certificates/pdf?certNumber=${data.certificateNumber}&metal=${data.metal}&format=html" class="cta-button">${t.viewCert}</a>

    <div class="notice">
      This certificate has been cryptographically hashed and anchored on the Base blockchain.
      This document is electronically issued and recorded within Auxite's custody ledger.
    </div>
  `;

  return sendEmail({ to, subject: t.subject, html: institutionalEmailWrapper(content, t.desk) });
}


// ═══════════════════════════════════════════════════════════════
// 3. YIELD ENROLLMENT CONFIRMATION (LEASING PARTICIPATION)
// ═══════════════════════════════════════════════════════════════

export async function sendStakingAgreementEmail(
  to: string,
  agreementHtml: string,
  data: {
    agreementNo: string;
    stakeId: string;
    metal: string;
    metalName: string;
    amount: string;
    termLabel: string;
    apy: string;
    startDate: string;
    endDate: string;
    holderName?: string;
    language?: string;
  }
) {
  const lang = data.language || 'en';
  const name = data.holderName || 'Client';

  const metalLabel = data.metalName ? `${data.metalName} (${data.metal})` : data.metal;

  const t = lang === 'tr' ? {
    subject: `Kiralama Kat\u0131l\u0131m Bildirimi — ${metalLabel}`,
    greeting: `Say\u0131n ${name},`,
    intro: 'Bu bildirim, Auxite de\u011Ferli metal kiralama facilitesine kat\u0131l\u0131m\u0131n\u0131z\u0131 teyit eder.',
    metal: 'Metal',
    quantity: 'Taahh\u00FCt Edilen Miktar',
    leaseRate: 'Kiralama Oran\u0131',
    effectiveDate: 'Y\u00FCr\u00FCrl\u00FCk Tarihi',
    maturityDate: 'Vade Tarihi',
    tenor: 'Kiralama Vadesi',
    returnSettlement: 'Getiri Uzla\u015Fmas\u0131',
    atMaturity: 'Vade Sonunda',
    encumbered: 'Kiralama s\u00FCresi boyunca, referans verilen metaller teminatl\u0131 kabul edilecek ve vadeye kadar transfer edilemez veya itfa edilemeyecektir.',
    noteIssued: 'Resmi bir Kat\u0131l\u0131m Notu d\u00FCzenlenmi\u015F olup belge kasan\u0131zda eri\u015Filebilir durumdad\u0131r.',
    viewNote: 'Kat\u0131l\u0131m Notunu G\u00F6r\u00FCnt\u00FCle',
    desk: 'Auxite Hazine ve Kiralama',
  } : {
    subject: `Leasing Participation Notice — ${metalLabel}`,
    greeting: `Dear ${name},`,
    intro: 'This notice confirms your participation in an Auxite precious metals leasing facility.',
    metal: 'Metal',
    quantity: 'Committed Quantity',
    leaseRate: 'Lease Rate',
    effectiveDate: 'Effective Date',
    maturityDate: 'Maturity Date',
    tenor: 'Lease Tenor',
    returnSettlement: 'Return Settlement',
    atMaturity: 'At Maturity',
    encumbered: 'During the lease tenor, the referenced metals will be considered encumbered and may not be transferred or redeemed until maturity.',
    noteIssued: 'A formal Participation Note has been issued and is accessible within your document vault.',
    viewNote: 'View Participation Note',
    desk: 'Auxite Treasury & Leasing',
  };

  const content = `
    <p class="greeting">${t.greeting}</p>
    <p>${t.intro}</p>

    <div class="detail-card">
      <div class="detail-row">
        <span class="detail-label">${t.metal}</span>
        <span class="detail-value">${data.metalName} (${data.metal})</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.quantity}</span>
        <span class="detail-value">${data.amount}g</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.leaseRate}</span>
        <span class="detail-value">${data.apy}%</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.effectiveDate}</span>
        <span class="detail-value">${data.startDate}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.maturityDate}</span>
        <span class="detail-value">${data.endDate}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.tenor}</span>
        <span class="detail-value">${data.termLabel}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.returnSettlement}</span>
        <span class="detail-value">${t.atMaturity}</span>
      </div>
    </div>

    <p>${t.encumbered}</p>
    <p>${t.noteIssued}</p>

    <a href="${VAULT_URL}/api/staking/agreement?stakeId=${data.stakeId}" class="cta-button">${t.viewNote}</a>

    <div class="notice">
      Metals committed to leasing facilities may be subject to counterparty and settlement risk.
      Auxite maintains strict counterparty selection and risk controls. This document is
      electronically issued and recorded within Auxite's custody ledger.
    </div>
  `;

  return sendEmail({ to, subject: t.subject, html: institutionalEmailWrapper(content, t.desk) });
}


// ═══════════════════════════════════════════════════════════════
// 4. YIELD DISTRIBUTION NOTICE
// Periodic yield credit — institutions love predictable income
// ═══════════════════════════════════════════════════════════════

export async function sendYieldDistributionEmail(
  to: string,
  data: {
    clientName?: string;
    metal: string;
    metalName: string;
    yieldRate: string;
    amountCredited: string;
    creditedAt: string;
    referenceId: string;
    language?: string;
  }
) {
  const lang = data.language || 'en';
  const name = data.clientName || 'Client';

  const t = lang === 'tr' ? {
    subject: `Kiralama Da\u011F\u0131t\u0131m Bildirimi — ${data.referenceId}`,
    greeting: `Say\u0131n ${name},`,
    intro: 'Planlanm\u0131\u015F kiralama da\u011F\u0131t\u0131m\u0131n\u0131z, metal kiralama kat\u0131l\u0131m\u0131n\u0131z do\u011Frultusunda i\u015Flenmi\u015Ftir.',
    metal: 'Metal',
    leaseRate: 'Kiralama Oran\u0131',
    amountCredited: 'Yat\u0131r\u0131lan Miktar',
    settlementDate: 'Uzla\u015Fma Tarihi',
    refId: 'Referans No',
    reflected: 'Yat\u0131r\u0131lan metaller art\u0131k tahsisli varl\u0131klar\u0131n\u0131za yans\u0131t\u0131lm\u0131\u015Ft\u0131r.',
    viewLedger: 'M\u00FC\u015Fteri Defterinde G\u00F6r\u00FCnt\u00FCle',
    desk: 'Auxite Hazine ve Kiralama',
  } : {
    subject: `Leasing Distribution Notice — ${data.referenceId}`,
    greeting: `Dear ${name},`,
    intro: 'Your scheduled leasing distribution has been processed in accordance with your metals leasing participation.',
    metal: 'Metal',
    leaseRate: 'Lease Rate',
    amountCredited: 'Amount Credited',
    settlementDate: 'Settlement Date',
    refId: 'Reference ID',
    reflected: 'The credited metals are now reflected within your allocated holdings.',
    viewLedger: 'View in Client Ledger',
    desk: 'Auxite Treasury & Leasing',
  };

  const content = `
    <p class="greeting">${t.greeting}</p>
    <p>${t.intro}</p>

    <div class="detail-card">
      <div class="detail-row">
        <span class="detail-label">${t.metal}</span>
        <span class="detail-value">${data.metalName} (${data.metal})</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.leaseRate}</span>
        <span class="detail-value">${data.yieldRate}%</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.amountCredited}</span>
        <span class="detail-value">${data.amountCredited}g</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.settlementDate}</span>
        <span class="detail-value">${data.creditedAt}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.refId}</span>
        <span class="detail-value">${data.referenceId}</span>
      </div>
    </div>

    <p>${t.reflected}</p>

    <a href="${VAULT_URL}/vault" class="cta-button">${t.viewLedger}</a>
  `;

  return sendEmail({ to, subject: t.subject, html: institutionalEmailWrapper(content, t.desk) });
}


// ═══════════════════════════════════════════════════════════════
// 5. PHYSICAL REDEMPTION INITIATED
// Very institutional — delivery request processing
// ═══════════════════════════════════════════════════════════════

export async function sendRedemptionInitiatedEmail(
  to: string,
  data: {
    clientName?: string;
    metal: string;
    metalName: string;
    grams: string;
    vaultLocation: string;
    deliveryMethod: string;
    referenceId: string;
    language?: string;
  }
) {
  const lang = data.language || 'en';
  const name = data.clientName || 'Client';

  const t = lang === 'tr' ? {
    subject: `Fiziksel \u0130tfa Ba\u015Flat\u0131ld\u0131 — ${data.referenceId}`,
    greeting: `Say\u0131n ${name},`,
    intro: 'Fiziksel itfa talebiniz al\u0131nm\u0131\u015F ve \u015Fu anda i\u015Fleme al\u0131nmaktad\u0131r.',
    metal: 'Metal',
    quantity: 'Miktar',
    vault: 'Kasa',
    deliveryMethod: 'Teslimat Y\u00F6ntemi',
    status: 'Durum',
    preparingRelease: 'Serbest B\u0131rakma Haz\u0131rlan\u0131yor',
    tracking: 'Sevk edildi\u011Finde, takip bilgileri sa\u011Flanacakt\u0131r.',
    encumbered: 'Referans verilen metaller teslimat tamamlanana kadar teminatl\u0131 kabul edilmektedir.',
    viewLedger: 'M\u00FC\u015Fteri Defterinde G\u00F6r\u00FCnt\u00FCle',
    desk: 'Auxite Saklama Operasyonlar\u0131',
  } : {
    subject: `Physical Redemption Initiated — ${data.referenceId}`,
    greeting: `Dear ${name},`,
    intro: 'Your request for physical redemption has been received and is currently being processed.',
    metal: 'Metal',
    quantity: 'Quantity',
    vault: 'Vault',
    deliveryMethod: 'Delivery Method',
    status: 'Status',
    preparingRelease: 'Preparing for Release',
    tracking: 'Once dispatched, tracking details will be provided.',
    encumbered: 'Please note that the referenced metals are now encumbered pending completion of delivery.',
    viewLedger: 'View in Client Ledger',
    desk: 'Auxite Custody Operations',
  };

  const content = `
    <p class="greeting">${t.greeting}</p>
    <p>${t.intro}</p>

    <div class="detail-card">
      <div class="detail-row">
        <span class="detail-label">${t.metal}</span>
        <span class="detail-value">${data.metalName} (${data.metal})</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.quantity}</span>
        <span class="detail-value">${data.grams}g</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.vault}</span>
        <span class="detail-value">${data.vaultLocation}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.deliveryMethod}</span>
        <span class="detail-value">${data.deliveryMethod}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.status}</span>
        <span class="detail-value">${t.preparingRelease}</span>
      </div>
    </div>

    <p>${t.tracking}</p>
    <p style="font-size: 12px; color: #666;">${t.encumbered}</p>

    <a href="${VAULT_URL}/vault" class="cta-button">${t.viewLedger}</a>
  `;

  return sendEmail({ to, subject: t.subject, html: institutionalEmailWrapper(content, t.desk) });
}


// ═══════════════════════════════════════════════════════════════
// 6. SECURITY ALERT — NON-NEGOTIABLE
// Whitelist addition, suspicious activity, etc.
// ═══════════════════════════════════════════════════════════════

export async function sendSecurityAlertEmail(
  to: string,
  data: {
    clientName?: string;
    event: string;
    asset?: string;
    address?: string;
    network?: string;
    timestamp: string;
    ipAddress?: string;
    language?: string;
  }
) {
  const lang = data.language || 'en';
  const name = data.clientName || 'Client';

  const t = lang === 'tr' ? {
    subject: `G\u00FCvenlik Bildirimi — Hesap Etkinli\u011Fi Tespit Edildi`,
    greeting: `Say\u0131n ${name},`,
    intro: 'Hesab\u0131n\u0131za yeni bir \u00E7ekim hedefi eklenmi\u015Ftir.',
    event: 'Olay',
    asset: 'Varl\u0131k',
    address: 'Adres',
    network: 'A\u011F',
    addedAt: 'Eklenme Zaman\u0131',
    ipAddress: 'IP Adresi',
    unauthorized: 'Bu de\u011Fi\u015Fikli\u011Fi siz yetkilendirmediyseniz, l\u00FCtfen derhal Auxite ile ileti\u015Fime ge\u00E7in.',
    delay: 'G\u00FCvenlik nedenlerinden dolay\u0131, yeni eklenen adreslere yap\u0131lacak \u00E7ekimler ge\u00E7ici bir gecikmeye tabi olabilir.',
    desk: 'Auxite G\u00FCvenlik Ekibi',
  } : {
    subject: `Security Notification — Account Activity Detected`,
    greeting: `Dear ${name},`,
    intro: 'A new withdrawal destination has been added to your account.',
    event: 'Event',
    asset: 'Asset',
    address: 'Address',
    network: 'Network',
    addedAt: 'Added At',
    ipAddress: 'IP Address',
    unauthorized: 'If you did not authorize this change, please contact Auxite immediately.',
    delay: 'For security reasons, withdrawals to newly added addresses may be subject to a temporary delay.',
    desk: 'Auxite Security Team',
  };

  const content = `
    <p class="greeting">${t.greeting}</p>
    <p>${t.intro}</p>

    <div class="security-alert-box">
      <div class="detail-row">
        <span class="detail-label">${t.event}</span>
        <span class="detail-value">${data.event}</span>
      </div>
      ${data.asset ? `
      <div class="detail-row">
        <span class="detail-label">${t.asset}</span>
        <span class="detail-value">${data.asset}</span>
      </div>
      ` : ''}
      ${data.address ? `
      <div class="detail-row">
        <span class="detail-label">${t.address}</span>
        <span class="detail-value" style="font-size: 10px;">${data.address}</span>
      </div>
      ` : ''}
      ${data.network ? `
      <div class="detail-row">
        <span class="detail-label">${t.network}</span>
        <span class="detail-value">${data.network}</span>
      </div>
      ` : ''}
      <div class="detail-row">
        <span class="detail-label">${t.addedAt}</span>
        <span class="detail-value">${data.timestamp}</span>
      </div>
      ${data.ipAddress ? `
      <div class="detail-row">
        <span class="detail-label">${t.ipAddress}</span>
        <span class="detail-value">${data.ipAddress}</span>
      </div>
      ` : ''}
    </div>

    <p style="font-weight: 600; color: #dc2626;">${t.unauthorized}</p>
    <p style="font-size: 12px; color: #666;">${t.delay}</p>
  `;

  return sendEmail({ to, subject: t.subject, html: institutionalEmailWrapper(content, t.desk) });
}
