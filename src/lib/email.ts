// lib/email.ts
// Institutional Email Service — Auxite Precious Metals AG
// Clean, minimal, Swiss private bank style — NO crypto vibes
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@auxite.io';

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

// ═══════════════════════════════════════════════
// INSTITUTIONAL EMAIL WRAPPER
// Swiss private bank style — minimal, dense, structured
// ═══════════════════════════════════════════════

function institutionalEmailWrapper(content: string): string {
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
    </div>
    <div class="footer">
      <p>Auxite Precious Metals AG &middot; Zurich, Switzerland</p>
      <p>This is an automated notification. Please do not reply.</p>
    </div>
    <div class="footer-gold"></div>
  </div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════
// ALLOCATION CERTIFICATE EMAIL
// ═══════════════════════════════════════════════

export async function sendCertificateEmail(
  to: string,
  certificateHtml: string,
  data: {
    certificateNumber: string;
    metal: string;
    metalName: string;
    grams: string;
    holderName?: string;
  }
) {
  const subject = `Certificate of Metal Allocation — ${data.certificateNumber}`;

  const content = `
    <h2>Allocation Confirmed</h2>
    <p>Your physical metal allocation has been recorded and your certificate of allocation has been issued.</p>

    <div class="detail-card">
      <div class="detail-row">
        <span class="detail-label">Certificate No.</span>
        <span class="detail-value">${data.certificateNumber}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Metal</span>
        <span class="detail-value">${data.metalName} (${data.metal})</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Quantity</span>
        <span class="detail-value">${data.grams}g</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Allocation Type</span>
        <span class="detail-value">Fully Allocated</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Custody Structure</span>
        <span class="detail-value">Bankruptcy-Remote Bailment</span>
      </div>
    </div>

    <p>Title to the above metals is held for your benefit and is not recorded on the balance sheet of Auxite or any affiliated entity.</p>

    <a href="https://vault.auxite.io/verify?cert=${data.certificateNumber}" class="cta-button">Verify Certificate</a>

    <div class="notice">
      This certificate has been cryptographically hashed and anchored on the Base blockchain.
      This document is electronically issued and recorded within Auxite's custody ledger.
    </div>
  `;

  return sendEmail({ to, subject, html: institutionalEmailWrapper(content) });
}

// ═══════════════════════════════════════════════
// LEASING PARTICIPATION NOTE EMAIL
// ═══════════════════════════════════════════════

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
  }
) {
  const subject = `Precious Metals Leasing Participation Note — ${data.agreementNo}`;

  const content = `
    <h2>Leasing Position Confirmed</h2>
    <p>Your metals leasing participation has been recorded. Allocated metals have been temporarily deployed to approved institutional counterparties.</p>

    <div class="detail-card">
      <div class="detail-row">
        <span class="detail-label">Note ID</span>
        <span class="detail-value">${data.agreementNo}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Metal</span>
        <span class="detail-value">${data.metalName} (${data.metal})</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Amount</span>
        <span class="detail-value">${data.amount} ${data.metal}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Term</span>
        <span class="detail-value">${data.termLabel}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Lease Rate</span>
        <span class="detail-value">${data.apy}%</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Effective Date</span>
        <span class="detail-value">${data.startDate}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Maturity Date</span>
        <span class="detail-value">${data.endDate}</span>
      </div>
    </div>

    <p>During the lease term, the metals referenced herein are considered encumbered and may not be transferred or redeemed until maturity.</p>

    <a href="https://vault.auxite.io/api/staking/agreement?stakeId=${data.stakeId}" class="cta-button">View Participation Note</a>

    <div class="notice">
      Leased metals may be subject to counterparty and settlement risk. Auxite maintains strict
      counterparty selection and risk controls. This document is electronically issued and recorded
      within Auxite's custody ledger.
    </div>
  `;

  return sendEmail({ to, subject, html: institutionalEmailWrapper(content) });
}
