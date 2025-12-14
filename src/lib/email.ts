// lib/email.ts
// Email Service - Resend API ile email gönderme

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

// Resend API ile email gönder
export async function sendEmail(options: EmailOptions): Promise<SendEmailResult> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@auxite.com";

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to send email");
    }

    return { success: true, id: data.id };
  } catch (error: any) {
    console.error("Email send error:", error);
    return { success: false, error: error.message };
  }
}

// ==================== EMAIL TEMPLATES ====================

// Base template wrapper
function baseTemplate(content: string, lang: "tr" | "en" = "en"): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auxite</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #e2e8f0; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: bold; color: #10b981; }
    .content { background: #1e293b; border-radius: 12px; padding: 30px; border: 1px solid #334155; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #64748b; }
    h1 { color: #f8fafc; font-size: 24px; margin: 0 0 20px 0; }
    p { color: #cbd5e1; line-height: 1.6; margin: 0 0 15px 0; }
    .button { display: inline-block; background: #10b981; color: white !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .highlight { background: #0f172a; border-radius: 8px; padding: 15px; margin: 15px 0; }
    .amount { font-size: 32px; font-weight: bold; color: #10b981; }
    .label { font-size: 12px; color: #94a3b8; text-transform: uppercase; }
    .divider { border-top: 1px solid #334155; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #334155; }
    .info-label { color: #94a3b8; }
    .info-value { color: #f8fafc; font-weight: 500; }
    .warning { background: #78350f; border: 1px solid #92400e; border-radius: 8px; padding: 15px; margin: 15px 0; }
    .warning p { color: #fcd34d; margin: 0; }
    .success { background: #064e3b; border: 1px solid #059669; border-radius: 8px; padding: 15px; margin: 15px 0; }
    .success p { color: #6ee7b7; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">◈ AUXITE</div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>${lang === "tr" ? "Bu email Auxite tarafından gönderilmiştir." : "This email was sent by Auxite."}</p>
      <p>© ${new Date().getFullYear()} Auxite. ${lang === "tr" ? "Tüm hakları saklıdır." : "All rights reserved."}</p>
    </div>
  </div>
</body>
</html>
`;
}

// Trade Completed Email
export function tradeCompletedEmail(data: {
  type: "buy" | "sell";
  fromAsset: string;
  toAsset: string;
  fromAmount: number;
  toAmount: number;
  price: number;
  fee: number;
  txHash?: string;
  lang?: "tr" | "en";
}): { subject: string; html: string } {
  const { type, fromAsset, toAsset, fromAmount, toAmount, price, fee, txHash, lang = "en" } = data;

  const isTr = lang === "tr";
  const subject = isTr
    ? `${type === "buy" ? "Alım" : "Satım"} İşlemi Tamamlandı - ${toAmount.toFixed(4)} ${toAsset}`
    : `${type === "buy" ? "Buy" : "Sell"} Order Completed - ${toAmount.toFixed(4)} ${toAsset}`;

  const content = `
    <h1>${isTr ? "İşlem Tamamlandı" : "Trade Completed"} ✓</h1>
    <p>${isTr ? "İşleminiz başarıyla gerçekleştirildi." : "Your trade has been successfully executed."}</p>
    
    <div class="highlight" style="text-align: center;">
      <div class="label">${isTr ? "Aldığınız" : "You Received"}</div>
      <div class="amount">${toAmount.toFixed(4)} ${toAsset}</div>
    </div>
    
    <div class="divider"></div>
    
    <div style="margin: 15px 0;">
      <div class="info-row">
        <span class="info-label">${isTr ? "İşlem Tipi" : "Trade Type"}</span>
        <span class="info-value">${type === "buy" ? (isTr ? "Alım" : "Buy") : (isTr ? "Satım" : "Sell")}</span>
      </div>
      <div class="info-row">
        <span class="info-label">${isTr ? "Ödenen" : "Paid"}</span>
        <span class="info-value">${fromAmount.toFixed(4)} ${fromAsset}</span>
      </div>
      <div class="info-row">
        <span class="info-label">${isTr ? "Fiyat" : "Price"}</span>
        <span class="info-value">$${price.toFixed(2)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">${isTr ? "İşlem Ücreti" : "Fee"}</span>
        <span class="info-value">$${fee.toFixed(2)}</span>
      </div>
      ${txHash ? `
      <div class="info-row">
        <span class="info-label">${isTr ? "İşlem Hash" : "Transaction Hash"}</span>
        <span class="info-value" style="font-size: 11px; font-family: monospace;">${txHash.slice(0, 20)}...</span>
      </div>
      ` : ""}
    </div>
    
    <a href="https://auxite.com/wallet" class="button">${isTr ? "Cüzdanı Görüntüle" : "View Wallet"}</a>
  `;

  return { subject, html: baseTemplate(content, lang) };
}

// Deposit Received Email
export function depositReceivedEmail(data: {
  asset: string;
  amount: number;
  txHash: string;
  from?: string;
  lang?: "tr" | "en";
}): { subject: string; html: string } {
  const { asset, amount, txHash, from, lang = "en" } = data;

  const isTr = lang === "tr";
  const subject = isTr
    ? `Yatırım Alındı - ${amount} ${asset}`
    : `Deposit Received - ${amount} ${asset}`;

  const content = `
    <h1>${isTr ? "Yatırım Alındı" : "Deposit Received"} 💰</h1>
    <p>${isTr ? "Hesabınıza yatırım yapıldı." : "A deposit has been credited to your account."}</p>
    
    <div class="success">
      <p>✓ ${isTr ? "İşlem başarıyla tamamlandı" : "Transaction completed successfully"}</p>
    </div>
    
    <div class="highlight" style="text-align: center;">
      <div class="label">${isTr ? "Yatırılan Miktar" : "Amount Deposited"}</div>
      <div class="amount">+${amount} ${asset}</div>
    </div>
    
    <div class="divider"></div>
    
    <div style="margin: 15px 0;">
      ${from ? `
      <div class="info-row">
        <span class="info-label">${isTr ? "Gönderen" : "From"}</span>
        <span class="info-value" style="font-size: 11px; font-family: monospace;">${from.slice(0, 10)}...${from.slice(-8)}</span>
      </div>
      ` : ""}
      <div class="info-row">
        <span class="info-label">${isTr ? "İşlem Hash" : "Transaction Hash"}</span>
        <span class="info-value" style="font-size: 11px; font-family: monospace;">${txHash.slice(0, 20)}...</span>
      </div>
    </div>
    
    <a href="https://auxite.com/wallet" class="button">${isTr ? "Cüzdanı Görüntüle" : "View Wallet"}</a>
  `;

  return { subject, html: baseTemplate(content, lang) };
}

// Withdrawal Sent Email
export function withdrawalSentEmail(data: {
  asset: string;
  amount: number;
  toAddress: string;
  txHash: string;
  fee: number;
  lang?: "tr" | "en";
}): { subject: string; html: string } {
  const { asset, amount, toAddress, txHash, fee, lang = "en" } = data;

  const isTr = lang === "tr";
  const subject = isTr
    ? `Çekim Gönderildi - ${amount} ${asset}`
    : `Withdrawal Sent - ${amount} ${asset}`;

  const content = `
    <h1>${isTr ? "Çekim Gönderildi" : "Withdrawal Sent"} 📤</h1>
    <p>${isTr ? "Çekim işleminiz başarıyla gerçekleştirildi." : "Your withdrawal has been successfully processed."}</p>
    
    <div class="highlight" style="text-align: center;">
      <div class="label">${isTr ? "Gönderilen Miktar" : "Amount Sent"}</div>
      <div class="amount">-${amount} ${asset}</div>
    </div>
    
    <div class="divider"></div>
    
    <div style="margin: 15px 0;">
      <div class="info-row">
        <span class="info-label">${isTr ? "Alıcı Adres" : "To Address"}</span>
        <span class="info-value" style="font-size: 11px; font-family: monospace;">${toAddress.slice(0, 10)}...${toAddress.slice(-8)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">${isTr ? "Ağ Ücreti" : "Network Fee"}</span>
        <span class="info-value">${fee} ${asset}</span>
      </div>
      <div class="info-row">
        <span class="info-label">${isTr ? "İşlem Hash" : "Transaction Hash"}</span>
        <span class="info-value" style="font-size: 11px; font-family: monospace;">${txHash.slice(0, 20)}...</span>
      </div>
    </div>
    
    <a href="https://auxite.com/wallet" class="button">${isTr ? "Cüzdanı Görüntüle" : "View Wallet"}</a>
  `;

  return { subject, html: baseTemplate(content, lang) };
}

// Staking Started Email
export function stakingStartedEmail(data: {
  asset: string;
  amount: number;
  duration: number; // months
  apy: number;
  endDate: Date;
  lang?: "tr" | "en";
}): { subject: string; html: string } {
  const { asset, amount, duration, apy, endDate, lang = "en" } = data;

  const isTr = lang === "tr";
  const subject = isTr
    ? `Stake Başladı - ${amount} ${asset}`
    : `Staking Started - ${amount} ${asset}`;

  const content = `
    <h1>${isTr ? "Stake Başladı" : "Staking Started"} 🔒</h1>
    <p>${isTr ? "Varlıklarınız başarıyla stake edildi." : "Your assets have been successfully staked."}</p>
    
    <div class="highlight" style="text-align: center;">
      <div class="label">${isTr ? "Stake Edilen" : "Staked Amount"}</div>
      <div class="amount">${amount} ${asset}</div>
    </div>
    
    <div class="divider"></div>
    
    <div style="margin: 15px 0;">
      <div class="info-row">
        <span class="info-label">${isTr ? "Süre" : "Duration"}</span>
        <span class="info-value">${duration} ${isTr ? "Ay" : "Months"}</span>
      </div>
      <div class="info-row">
        <span class="info-label">${isTr ? "Yıllık Getiri" : "APY"}</span>
        <span class="info-value" style="color: #10b981;">${apy}%</span>
      </div>
      <div class="info-row">
        <span class="info-label">${isTr ? "Bitiş Tarihi" : "End Date"}</span>
        <span class="info-value">${endDate.toLocaleDateString(isTr ? "tr-TR" : "en-US")}</span>
      </div>
    </div>
    
    <a href="https://auxite.com/earn" class="button">${isTr ? "Stake'leri Görüntüle" : "View Stakes"}</a>
  `;

  return { subject, html: baseTemplate(content, lang) };
}

// Staking Ending Soon Email
export function stakingEndingSoonEmail(data: {
  asset: string;
  amount: number;
  daysRemaining: number;
  endDate: Date;
  rewards: number;
  lang?: "tr" | "en";
}): { subject: string; html: string } {
  const { asset, amount, daysRemaining, endDate, rewards, lang = "en" } = data;

  const isTr = lang === "tr";
  const subject = isTr
    ? `⏰ Stake Sona Eriyor - ${daysRemaining} Gün Kaldı`
    : `⏰ Staking Ending Soon - ${daysRemaining} Days Left`;

  const content = `
    <h1>${isTr ? "Stake Sona Eriyor" : "Staking Ending Soon"} ⏰</h1>
    <p>${isTr ? `Stake işleminizin sona ermesine ${daysRemaining} gün kaldı.` : `Your staking period ends in ${daysRemaining} days.`}</p>
    
    <div class="warning">
      <p>⚠️ ${isTr ? "Süre dolduğunda ödüllerinizi almayı unutmayın!" : "Don't forget to claim your rewards when the period ends!"}</p>
    </div>
    
    <div class="highlight" style="text-align: center;">
      <div class="label">${isTr ? "Stake Edilen" : "Staked Amount"}</div>
      <div class="amount">${amount} ${asset}</div>
      <div style="margin-top: 10px;">
        <span class="label">${isTr ? "Tahmini Ödül" : "Estimated Reward"}</span>
        <span style="color: #10b981; font-weight: bold; margin-left: 8px;">+${rewards.toFixed(4)} ${asset}</span>
      </div>
    </div>
    
    <div class="divider"></div>
    
    <div style="margin: 15px 0;">
      <div class="info-row">
        <span class="info-label">${isTr ? "Kalan Süre" : "Time Remaining"}</span>
        <span class="info-value" style="color: #fbbf24;">${daysRemaining} ${isTr ? "gün" : "days"}</span>
      </div>
      <div class="info-row">
        <span class="info-label">${isTr ? "Bitiş Tarihi" : "End Date"}</span>
        <span class="info-value">${endDate.toLocaleDateString(isTr ? "tr-TR" : "en-US")}</span>
      </div>
    </div>
    
    <a href="https://auxite.com/earn" class="button">${isTr ? "Stake'leri Yönet" : "Manage Stakes"}</a>
  `;

  return { subject, html: baseTemplate(content, lang) };
}

// Staking Ended Email
export function stakingEndedEmail(data: {
  asset: string;
  amount: number;
  rewards: number;
  totalReturn: number;
  lang?: "tr" | "en";
}): { subject: string; html: string } {
  const { asset, amount, rewards, totalReturn, lang = "en" } = data;

  const isTr = lang === "tr";
  const subject = isTr
    ? `🎉 Stake Tamamlandı - Ödülleriniz Hazır!`
    : `🎉 Staking Completed - Rewards Ready!`;

  const content = `
    <h1>${isTr ? "Stake Tamamlandı!" : "Staking Completed!"} 🎉</h1>
    <p>${isTr ? "Stake süreniz doldu ve ödülleriniz hesabınıza yatırıldı." : "Your staking period has ended and rewards have been credited."}</p>
    
    <div class="success">
      <p>✓ ${isTr ? "Ödüller başarıyla alındı" : "Rewards successfully claimed"}</p>
    </div>
    
    <div class="highlight" style="text-align: center;">
      <div class="label">${isTr ? "Toplam Getiri" : "Total Return"}</div>
      <div class="amount">${totalReturn.toFixed(4)} ${asset}</div>
      <div style="margin-top: 10px; color: #10b981;">
        +${rewards.toFixed(4)} ${asset} ${isTr ? "ödül" : "rewards"}
      </div>
    </div>
    
    <div class="divider"></div>
    
    <div style="margin: 15px 0;">
      <div class="info-row">
        <span class="info-label">${isTr ? "Ana Para" : "Principal"}</span>
        <span class="info-value">${amount} ${asset}</span>
      </div>
      <div class="info-row">
        <span class="info-label">${isTr ? "Kazanılan Ödül" : "Rewards Earned"}</span>
        <span class="info-value" style="color: #10b981;">+${rewards.toFixed(4)} ${asset}</span>
      </div>
    </div>
    
    <a href="https://auxite.com/earn" class="button">${isTr ? "Tekrar Stake Et" : "Stake Again"}</a>
  `;

  return { subject, html: baseTemplate(content, lang) };
}

// Security Alert Email
export function securityAlertEmail(data: {
  alertType: "new_login" | "password_changed" | "2fa_enabled" | "2fa_disabled" | "withdrawal_attempt";
  ip?: string;
  device?: string;
  location?: string;
  lang?: "tr" | "en";
}): { subject: string; html: string } {
  const { alertType, ip, device, location, lang = "en" } = data;

  const isTr = lang === "tr";
  
  const alertMessages: Record<string, { title: string; message: string }> = {
    new_login: {
      title: isTr ? "Yeni Giriş Tespit Edildi" : "New Login Detected",
      message: isTr ? "Hesabınıza yeni bir cihazdan giriş yapıldı." : "A new device logged into your account.",
    },
    password_changed: {
      title: isTr ? "Şifre Değiştirildi" : "Password Changed",
      message: isTr ? "Hesap şifreniz değiştirildi." : "Your account password was changed.",
    },
    "2fa_enabled": {
      title: isTr ? "2FA Aktifleştirildi" : "2FA Enabled",
      message: isTr ? "İki faktörlü doğrulama etkinleştirildi." : "Two-factor authentication was enabled.",
    },
    "2fa_disabled": {
      title: isTr ? "2FA Devre Dışı" : "2FA Disabled",
      message: isTr ? "İki faktörlü doğrulama devre dışı bırakıldı." : "Two-factor authentication was disabled.",
    },
    withdrawal_attempt: {
      title: isTr ? "Çekim Denemesi" : "Withdrawal Attempt",
      message: isTr ? "Hesabınızdan çekim denemesi yapıldı." : "A withdrawal was attempted from your account.",
    },
  };

  const alert = alertMessages[alertType] || alertMessages.new_login;
  const subject = `🔐 ${alert.title}`;

  const content = `
    <h1>${alert.title} 🔐</h1>
    <p>${alert.message}</p>
    
    <div class="warning">
      <p>⚠️ ${isTr ? "Bu siz değilseniz, hemen şifrenizi değiştirin!" : "If this wasn't you, change your password immediately!"}</p>
    </div>
    
    <div class="divider"></div>
    
    <div style="margin: 15px 0;">
      ${ip ? `
      <div class="info-row">
        <span class="info-label">${isTr ? "IP Adresi" : "IP Address"}</span>
        <span class="info-value">${ip}</span>
      </div>
      ` : ""}
      ${device ? `
      <div class="info-row">
        <span class="info-label">${isTr ? "Cihaz" : "Device"}</span>
        <span class="info-value">${device}</span>
      </div>
      ` : ""}
      ${location ? `
      <div class="info-row">
        <span class="info-label">${isTr ? "Konum" : "Location"}</span>
        <span class="info-value">${location}</span>
      </div>
      ` : ""}
      <div class="info-row">
        <span class="info-label">${isTr ? "Tarih" : "Date"}</span>
        <span class="info-value">${new Date().toLocaleString(isTr ? "tr-TR" : "en-US")}</span>
      </div>
    </div>
    
    <a href="https://auxite.com/profile?tab=security" class="button">${isTr ? "Güvenlik Ayarları" : "Security Settings"}</a>
  `;

  return { subject, html: baseTemplate(content, lang) };
}
