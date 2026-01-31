// lib/email.ts
// Email service using Resend
import { Resend } from 'resend';

// Make Resend optional - only initialize if API key exists
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
      console.warn('⚠️ Resend API key not configured - email not sent');
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

    console.log(`✅ Email sent to ${to}: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error('Email service error:', err);
    throw err;
  }
}

// Send Allocation Certificate Email
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
  const subject = `Your Auxite ${data.metalName} Allocation Certificate - ${data.certificateNumber}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #fff; padding: 30px; text-align: center; }
    .logo { font-size: 28px; font-weight: bold; }
    .logo span { color: #10b981; }
    .content { padding: 30px; }
    .highlight-box { background: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .highlight-box h3 { color: #166534; margin: 0 0 10px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-label { color: #6b7280; }
    .detail-value { color: #111827; font-weight: 600; }
    .cta-button { display: inline-block; background: #10b981; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px 30px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">AUX<span>ITE</span></div>
      <p style="margin: 10px 0 0 0; color: #94a3b8;">Digital Allocated Metal Certificate</p>
    </div>
    <div class="content">
      <h2 style="color: #111827; margin-bottom: 10px;">Your Allocation is Confirmed! ✓</h2>
      <p style="color: #6b7280;">Dear ${data.holderName || 'Valued Holder'},</p>
      <p style="color: #6b7280;">Your physical metal allocation has been successfully recorded and your digital certificate has been issued.</p>
      
      <div class="highlight-box">
        <h3>Certificate Details</h3>
        <div class="detail-row">
          <span class="detail-label">Certificate Number</span>
          <span class="detail-value">${data.certificateNumber}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Metal</span>
          <span class="detail-value">${data.metalName} (${data.metal})</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Weight</span>
          <span class="detail-value">${data.grams}g</span>
        </div>
        <div class="detail-row" style="border-bottom: none;">
          <span class="detail-label">Status</span>
          <span class="detail-value" style="color: #10b981;">✓ Blockchain Anchored</span>
        </div>
      </div>

      <p style="color: #6b7280;">You can view and verify your certificate at any time:</p>
      <a href="https://auxite-wallet.vercel.app/verify?cert=${data.certificateNumber}" class="cta-button">View Certificate</a>
      
      <p style="color: #9ca3af; font-size: 13px; margin-top: 30px;">
        Your certificate has been cryptographically hashed and anchored on the Base blockchain for immutable verification.
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Auxite Precious Metals AG. All rights reserved.</p>
      <p style="margin-top: 10px;">This is an automated message. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
`;

  return sendEmail({ to, subject, html });
}

// Send Staking Agreement Email
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
  const subject = `Your Auxite Staking Agreement - ${data.agreementNo}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #fff; padding: 30px; text-align: center; }
    .logo { font-size: 28px; font-weight: bold; }
    .logo span { color: #f59e0b; }
    .content { padding: 30px; }
    .highlight-box { background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .highlight-box h3 { color: #92400e; margin: 0 0 10px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-label { color: #6b7280; }
    .detail-value { color: #111827; font-weight: 600; }
    .apy-badge { background: #10b981; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 14px; }
    .cta-button { display: inline-block; background: #f59e0b; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; font-size: 13px; color: #92400e; }
    .footer { background: #f9fafb; padding: 20px 30px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">AUX<span>ITE</span> EARN</div>
      <p style="margin: 10px 0 0 0; color: #94a3b8;">Staking Agreement Confirmation</p>
    </div>
    <div class="content">
      <h2 style="color: #111827; margin-bottom: 10px;">Your Stake is Active! 🔒</h2>
      <p style="color: #6b7280;">Dear ${data.holderName || 'Valued Holder'},</p>
      <p style="color: #6b7280;">Your staking agreement has been successfully created and your metal is now earning rewards.</p>
      
      <div class="highlight-box">
        <h3>Stake Details</h3>
        <div class="detail-row">
          <span class="detail-label">Agreement No</span>
          <span class="detail-value">${data.agreementNo}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Stake ID</span>
          <span class="detail-value">${data.stakeId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Metal</span>
          <span class="detail-value">${data.metalName} (${data.metal})</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Staked Amount</span>
          <span class="detail-value">${data.amount} ${data.metal}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Term</span>
          <span class="detail-value">${data.termLabel}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">APY</span>
          <span class="apy-badge">${data.apy}%</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Start Date</span>
          <span class="detail-value">${data.startDate}</span>
        </div>
        <div class="detail-row" style="border-bottom: none;">
          <span class="detail-label">Maturity Date</span>
          <span class="detail-value">${data.endDate}</span>
        </div>
      </div>

      <div class="warning-box">
        <strong>⚠️ Important:</strong> This is a fixed-term stake. Early unstaking is not permitted. Rewards will be credited within 24 hours after the maturity date.
      </div>

      <p style="color: #6b7280;">View your full staking agreement:</p>
      <a href="https://auxite-wallet.vercel.app/api/staking/agreement?stakeId=${data.stakeId}" class="cta-button">View Agreement</a>
      
      <p style="color: #9ca3af; font-size: 13px; margin-top: 30px;">
        By participating in the Auxite Earn program, you agree to the terms outlined in the staking agreement.
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Auxite Precious Metals AG. All rights reserved.</p>
      <p style="margin-top: 10px;">This is an automated message. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
`;

  return sendEmail({ to, subject, html });
}
