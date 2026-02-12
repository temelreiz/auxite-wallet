// src/lib/email-service.ts
// Email Service using Resend

import { Resend } from 'resend';

// Make Resend optional - only initialize if API key exists
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@auxite.io';
const FROM_NAME = process.env.FROM_NAME || 'Auxite';

// ══════════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ══════════════════════════════════════════════════════════════════════════════

interface EmailData {
  name: string;
  language?: string;
  [key: string]: any;
}

const templates = {
  // ────────────────────────────────────────────────────────────────────────────
  // VERIFICATION EMAIL WITH CODE (for mobile)
  // ────────────────────────────────────────────────────────────────────────────
  'verification-code': (data: EmailData) => {
    const { name, code, verificationUrl, language = 'en' } = data;
    
    const content = {
      en: {
        subject: 'Verify your Auxite account',
        title: 'Email Verification',
        greeting: `Hi ${name},`,
        message: 'Thank you for creating an Auxite account. Use the code below to verify your email:',
        codeLabel: 'Your verification code:',
        orUseLink: 'Or click the button below:',
        buttonText: 'Verify Email',
        expiry: 'This code will expire in 10 minutes.',
        ignore: 'If you did not create an account, please ignore this email.',
      },
      tr: {
        subject: 'Auxite hesabınızı doğrulayın',
        title: 'E-posta Doğrulama',
        greeting: `Merhaba ${name},`,
        message: 'Auxite hesabı oluşturduğunuz için teşekkürler. E-postanızı doğrulamak için aşağıdaki kodu kullanın:',
        codeLabel: 'Doğrulama kodunuz:',
        orUseLink: 'Veya aşağıdaki butona tıklayın:',
        buttonText: 'E-postayı Doğrula',
        expiry: 'Bu kod 10 dakika içinde geçerliliğini yitirecektir.',
        ignore: 'Hesap oluşturmadıysanız, bu e-postayı görmezden gelebilirsiniz.',
      },
      de: {
        subject: 'Bestätigen Sie Ihr Auxite-Konto',
        title: 'E-Mail-Verifizierung',
        greeting: `Hallo ${name},`,
        message: 'Vielen Dank für die Erstellung eines Auxite-Kontos. Verwenden Sie den folgenden Code:',
        codeLabel: 'Ihr Bestätigungscode:',
        orUseLink: 'Oder klicken Sie auf den Button:',
        buttonText: 'E-Mail bestätigen',
        expiry: 'Dieser Code läuft in 10 Minuten ab.',
        ignore: 'Falls Sie kein Konto erstellt haben, ignorieren Sie diese E-Mail.',
      },
      ar: {
        subject: 'تأكيد حساب Auxite الخاص بك',
        title: 'التحقق من البريد الإلكتروني',
        greeting: `مرحباً ${name}،`,
        message: 'شكراً لإنشاء حساب Auxite. استخدم الرمز أدناه للتحقق:',
        codeLabel: 'رمز التحقق الخاص بك:',
        orUseLink: 'أو انقر على الزر أدناه:',
        buttonText: 'تأكيد البريد',
        expiry: 'ستنتهي صلاحية هذا الرمز خلال 10 دقائق.',
        ignore: 'إذا لم تقم بإنشاء حساب، يرجى تجاهل هذا البريد.',
      },
      ru: {
        subject: 'Подтвердите ваш аккаунт Auxite',
        title: 'Подтверждение email',
        greeting: `Привет ${name},`,
        message: 'Спасибо за создание аккаунта Auxite. Используйте код ниже для подтверждения:',
        codeLabel: 'Ваш код подтверждения:',
        orUseLink: 'Или нажмите на кнопку:',
        buttonText: 'Подтвердить email',
        expiry: 'Этот код истечет через 10 минут.',
        ignore: 'Если вы не создавали аккаунт, проигнорируйте это письмо.',
      },
      fr: {
        subject: 'Vérifiez votre compte Auxite',
        title: 'Vérification de l\'email',
        greeting: `Bonjour ${name},`,
        message: 'Merci d\'avoir créé un compte Auxite. Utilisez le code ci-dessous:',
        codeLabel: 'Votre code de vérification:',
        orUseLink: 'Ou cliquez sur le bouton:',
        buttonText: 'Vérifier l\'email',
        expiry: 'Ce code expirera dans 10 minutes.',
        ignore: 'Si vous n\'avez pas créé de compte, ignorez cet email.',
      },
    };

    const t = content[language as keyof typeof content] || content.en;

    return {
      subject: t.subject,
      html: generateEmailHTML({
        title: t.title,
        content: `
          <p>${t.greeting}</p>
          <p>${t.message}</p>
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #64748b; font-size: 14px; margin-bottom: 10px;">${t.codeLabel}</p>
            <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; display: inline-block;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #C5A55A;">${code}</span>
            </div>
          </div>
          <p style="color: #64748b; font-size: 14px; text-align: center;">${t.orUseLink}</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${verificationUrl}" style="background-color: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; display: inline-block;">${t.buttonText}</a>
          </div>
          <p style="color: #64748b; font-size: 14px;">${t.expiry}</p>
          <p style="color: #94a3b8; font-size: 12px;">${t.ignore}</p>
        `,
      }),
    };
  },

  // ────────────────────────────────────────────────────────────────────────────
  // VERIFICATION EMAIL (link only - for web)
  // ────────────────────────────────────────────────────────────────────────────
  verification: (data: EmailData) => {
    const { name, verificationUrl, language = 'en' } = data;
    
    const content = {
      en: {
        subject: 'Verify your Auxite account',
        title: 'Email Verification',
        greeting: `Hi ${name},`,
        message: 'Thank you for creating an Auxite account. Please verify your email address by clicking the button below:',
        buttonText: 'Verify Email',
        expiry: 'This link will expire in 24 hours.',
        ignore: 'If you did not create an account, please ignore this email.',
      },
      tr: {
        subject: 'Auxite hesabınızı doğrulayın',
        title: 'E-posta Doğrulama',
        greeting: `Merhaba ${name},`,
        message: 'Auxite hesabı oluşturduğunuz için teşekkürler. Lütfen aşağıdaki butona tıklayarak e-posta adresinizi doğrulayın:',
        buttonText: 'E-postayı Doğrula',
        expiry: 'Bu bağlantı 24 saat içinde geçerliliğini yitirecektir.',
        ignore: 'Hesap oluşturmadıysanız, bu e-postayı görmezden gelebilirsiniz.',
      },
    };

    const t = content[language as keyof typeof content] || content.en;

    return {
      subject: t.subject,
      html: generateEmailHTML({
        title: t.title,
        content: `
          <p>${t.greeting}</p>
          <p>${t.message}</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; display: inline-block;">${t.buttonText}</a>
          </div>
          <p style="color: #64748b; font-size: 14px;">${t.expiry}</p>
          <p style="color: #94a3b8; font-size: 12px;">${t.ignore}</p>
        `,
      }),
    };
  },

  // ────────────────────────────────────────────────────────────────────────────
  // WELCOME EMAIL
  // ────────────────────────────────────────────────────────────────────────────
  welcome: (data: EmailData) => {
    const { name, language = 'en' } = data;
    
    const content = {
      en: {
        subject: 'Welcome to Auxite!',
        title: 'Welcome to Auxite',
        greeting: `Hi ${name},`,
        message: 'Your email has been verified and your Auxite account is now active!',
        features: [
          'Allocate and hold physical precious metals in secure custody',
          'Settlement and execution services for precious metals',
          'Participate in structured metals leasing programs',
          'Independent custody with full allocation transparency',
        ],
        cta: 'Get Started',
        support: 'If you have any questions, our support team is here to help.',
      },
      tr: {
        subject: 'Auxite\'a Hoş Geldiniz!',
        title: 'Auxite\'a Hoş Geldiniz',
        greeting: `Merhaba ${name},`,
        message: 'E-postanız doğrulandı ve Auxite hesabınız artık aktif!',
        features: [
          'Fiziksel değerli metalleri güvenli saklamada tahsis edin',
          'Değerli metaller için takas ve gerçekleştirme hizmetleri',
          'Yapılandırılmış metal kiralama programlarına katılın',
          'Tam tahsis şeffaflığı ile bağımsız saklama',
        ],
        cta: 'Başlayın',
        support: 'Sorularınız varsa, destek ekibimiz size yardımcı olmak için burada.',
      },
    };

    const t = content[language as keyof typeof content] || content.en;

    return {
      subject: t.subject,
      html: generateEmailHTML({
        title: t.title,
        content: `
          <p>${t.greeting}</p>
          <p>${t.message}</p>
          <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="font-weight: bold; margin-bottom: 10px;">What you can do with Auxite:</p>
            <ul style="margin: 0; padding-left: 20px;">
              ${t.features.map(f => `<li style="margin: 8px 0;">${f}</li>`).join('')}
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://vault.auxite.io" style="background-color: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; display: inline-block;">${t.cta}</a>
          </div>
          <p style="color: #64748b; font-size: 14px;">${t.support}</p>
        `,
      }),
    };
  },

  // ────────────────────────────────────────────────────────────────────────────
  // PASSWORD RESET EMAIL
  // ────────────────────────────────────────────────────────────────────────────
  'password-reset': (data: EmailData) => {
    const { name, resetUrl, expiryMinutes = 60, language = 'en' } = data;
    
    const content = {
      en: {
        subject: 'Reset your Auxite password',
        title: 'Password Reset',
        greeting: `Hi ${name},`,
        message: 'We received a request to reset your password. Click the button below:',
        buttonText: 'Reset Password',
        expiry: `This link will expire in ${expiryMinutes} minutes.`,
        ignore: 'If you did not request this, please ignore this email.',
      },
      tr: {
        subject: 'Auxite şifrenizi sıfırlayın',
        title: 'Şifre Sıfırlama',
        greeting: `Merhaba ${name},`,
        message: 'Şifrenizi sıfırlamak için bir talep aldık. Aşağıdaki butona tıklayın:',
        buttonText: 'Şifreyi Sıfırla',
        expiry: `Bu bağlantı ${expiryMinutes} dakika içinde geçerliliğini yitirecektir.`,
        ignore: 'Bu talebi siz yapmadıysanız, bu e-postayı görmezden gelin.',
      },
    };

    const t = content[language as keyof typeof content] || content.en;

    return {
      subject: t.subject,
      html: generateEmailHTML({
        title: t.title,
        content: `
          <p>${t.greeting}</p>
          <p>${t.message}</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; display: inline-block;">${t.buttonText}</a>
          </div>
          <p style="color: #64748b; font-size: 14px;">${t.expiry}</p>
          <p style="color: #94a3b8; font-size: 12px;">${t.ignore}</p>
        `,
      }),
    };
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 2FA CODE EMAIL
  // ────────────────────────────────────────────────────────────────────────────
  '2fa-code': (data: EmailData) => {
    const { name, code, language = 'en' } = data;

    const content = {
      en: {
        subject: 'Your Auxite verification code',
        title: 'Verification Code',
        greeting: `Hi ${name},`,
        message: 'Your verification code is:',
        expiry: 'This code will expire in 10 minutes.',
        ignore: 'If you did not request this code, please ignore this email.',
      },
      tr: {
        subject: 'Auxite doğrulama kodunuz',
        title: 'Doğrulama Kodu',
        greeting: `Merhaba ${name},`,
        message: 'Doğrulama kodunuz:',
        expiry: 'Bu kod 10 dakika içinde geçerliliğini yitirecektir.',
        ignore: 'Bu kodu talep etmediyseniz, bu e-postayı görmezden gelin.',
      },
    };

    const t = content[language as keyof typeof content] || content.en;

    return {
      subject: t.subject,
      html: generateEmailHTML({
        title: t.title,
        content: `
          <p>${t.greeting}</p>
          <p>${t.message}</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; display: inline-block;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #C5A55A;">${code}</span>
            </div>
          </div>
          <p style="color: #64748b; font-size: 14px;">${t.expiry}</p>
          <p style="color: #94a3b8; font-size: 12px;">${t.ignore}</p>
        `,
      }),
    };
  },

  // ────────────────────────────────────────────────────────────────────────────
  // DEPOSIT CONFIRMED EMAIL
  // ────────────────────────────────────────────────────────────────────────────
  'deposit-confirmed': (data: EmailData) => {
    const { name, amount, token, txHash, language = 'en' } = data;

    const content = {
      en: {
        subject: `Deposit Confirmed: ${amount} ${token}`,
        title: 'Deposit Confirmed',
        greeting: `Hi ${name},`,
        message: 'Your deposit has been confirmed and credited to your account.',
        amountLabel: 'Amount',
        txLabel: 'Transaction',
        viewWallet: 'View in Client Ledger',
      },
      tr: {
        subject: `Yatırma Onaylandı: ${amount} ${token}`,
        title: 'Yatırma Onaylandı',
        greeting: `Merhaba ${name},`,
        message: 'Yatırmanız onaylandı ve hesabınıza eklendi.',
        amountLabel: 'Miktar',
        txLabel: 'İşlem',
        viewWallet: 'Müşteri Defterinde Görüntüle',
      },
    };

    const t = content[language as keyof typeof content] || content.en;

    return {
      subject: t.subject,
      html: generateEmailHTML({
        title: t.title,
        content: `
          <p>${t.greeting}</p>
          <p>${t.message}</p>
          <div style="background: #fafafa; border-left: 3px solid #C5A55A; padding: 16px 18px; margin: 18px 0;">
            <p style="margin: 0 0 10px 0;"><strong>${t.amountLabel}:</strong> <span style="color: #C5A55A; font-size: 18px; font-weight: 600;">${amount} ${token}</span></p>
            ${txHash ? `<p style="margin: 0; font-size: 12px; color: #64748b;"><strong>${t.txLabel}:</strong> ${txHash.substring(0, 20)}...</p>` : ''}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://vault.auxite.io/vault" style="background-color: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; display: inline-block;">${t.viewWallet}</a>
          </div>
        `,
      }),
    };
  },

  // ────────────────────────────────────────────────────────────────────────────
  // WITHDRAW CONFIRMED EMAIL
  // ────────────────────────────────────────────────────────────────────────────
  'withdraw-confirmed': (data: EmailData) => {
    const { name, amount, token, toAddress, txHash, fee, language = 'en' } = data;

    const content = {
      en: {
        subject: `Withdrawal Completed: ${amount} ${token}`,
        title: 'Withdrawal Completed',
        greeting: `Hi ${name},`,
        message: 'Your withdrawal has been processed successfully.',
        amountLabel: 'Amount',
        toLabel: 'To Address',
        feeLabel: 'Network Fee',
        txLabel: 'Transaction',
        viewHistory: 'View in Client Ledger',
      },
      tr: {
        subject: `Çekim Tamamlandı: ${amount} ${token}`,
        title: 'Çekim Tamamlandı',
        greeting: `Merhaba ${name},`,
        message: 'Çekim işleminiz başarıyla tamamlandı.',
        amountLabel: 'Miktar',
        toLabel: 'Hedef Adres',
        feeLabel: 'Ağ Ücreti',
        txLabel: 'İşlem',
        viewHistory: 'Müşteri Defterinde Görüntüle',
      },
    };

    const t = content[language as keyof typeof content] || content.en;

    return {
      subject: t.subject,
      html: generateEmailHTML({
        title: t.title,
        content: `
          <p>${t.greeting}</p>
          <p>${t.message}</p>
          <div style="background: #fafafa; border-left: 3px solid #C5A55A; padding: 16px 18px; margin: 18px 0;">
            <p style="margin: 0 0 10px 0;"><strong>${t.amountLabel}:</strong> <span style="color: #C5A55A; font-size: 18px; font-weight: 600;">${amount} ${token}</span></p>
            <p style="margin: 0 0 10px 0; font-size: 12px; color: #64748b;"><strong>${t.toLabel}:</strong> ${toAddress}</p>
            ${fee ? `<p style="margin: 0 0 10px 0; font-size: 12px; color: #64748b;"><strong>${t.feeLabel}:</strong> ${fee}</p>` : ''}
            ${txHash ? `<p style="margin: 0; font-size: 12px; color: #64748b;"><strong>${t.txLabel}:</strong> ${txHash.substring(0, 20)}...</p>` : ''}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://vault.auxite.io/vault" style="background-color: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; display: inline-block;">${t.viewHistory}</a>
          </div>
        `,
      }),
    };
  },

  // ────────────────────────────────────────────────────────────────────────────
  // TRANSFER SENT EMAIL
  // ────────────────────────────────────────────────────────────────────────────
  'transfer-sent': (data: EmailData) => {
    const { name, amount, token, toAddress, language = 'en' } = data;

    const content = {
      en: {
        subject: `Transfer Sent: ${amount} ${token}`,
        title: 'Transfer Sent',
        greeting: `Hi ${name},`,
        message: 'Your transfer has been sent successfully.',
        amountLabel: 'Amount',
        toLabel: 'To',
        viewWallet: 'View in Client Ledger',
      },
      tr: {
        subject: `Transfer Gönderildi: ${amount} ${token}`,
        title: 'Transfer Gönderildi',
        greeting: `Merhaba ${name},`,
        message: 'Transferiniz başarıyla gönderildi.',
        amountLabel: 'Miktar',
        toLabel: 'Alıcı',
        viewWallet: 'Müşteri Defterinde Görüntüle',
      },
    };

    const t = content[language as keyof typeof content] || content.en;

    return {
      subject: t.subject,
      html: generateEmailHTML({
        title: t.title,
        content: `
          <p>${t.greeting}</p>
          <p>${t.message}</p>
          <div style="background: #fafafa; border-left: 3px solid #C5A55A; padding: 16px 18px; margin: 18px 0;">
            <p style="margin: 0 0 10px 0;"><strong>${t.amountLabel}:</strong> <span style="color: #C5A55A; font-size: 18px; font-weight: 600;">${amount} ${token}</span></p>
            <p style="margin: 0; font-size: 12px; color: #64748b;"><strong>${t.toLabel}:</strong> ${toAddress}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://vault.auxite.io/vault" style="background-color: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; display: inline-block;">${t.viewWallet}</a>
          </div>
        `,
      }),
    };
  },

  // ────────────────────────────────────────────────────────────────────────────
  // TRANSFER RECEIVED EMAIL
  // ────────────────────────────────────────────────────────────────────────────
  'transfer-received': (data: EmailData) => {
    const { name, amount, token, fromAddress, language = 'en' } = data;

    const content = {
      en: {
        subject: `You received ${amount} ${token}`,
        title: 'Transfer Received',
        greeting: `Hi ${name},`,
        message: 'You have received a transfer to your wallet.',
        amountLabel: 'Amount',
        fromLabel: 'From',
        viewWallet: 'View in Client Ledger',
      },
      tr: {
        subject: `${amount} ${token} aldınız`,
        title: 'Transfer Alındı',
        greeting: `Merhaba ${name},`,
        message: 'Cüzdanınıza bir transfer aldınız.',
        amountLabel: 'Miktar',
        fromLabel: 'Gönderen',
        viewWallet: 'Müşteri Defterinde Görüntüle',
      },
    };

    const t = content[language as keyof typeof content] || content.en;

    return {
      subject: t.subject,
      html: generateEmailHTML({
        title: t.title,
        content: `
          <p>${t.greeting}</p>
          <p>${t.message}</p>
          <div style="background: #fafafa; border-left: 3px solid #C5A55A; padding: 16px 18px; margin: 18px 0;">
            <p style="margin: 0 0 10px 0;"><strong>${t.amountLabel}:</strong> <span style="color: #C5A55A; font-size: 18px; font-weight: 600;">+${amount} ${token}</span></p>
            ${fromAddress ? `<p style="margin: 0; font-size: 12px; color: #64748b;"><strong>${t.fromLabel}:</strong> ${fromAddress.substring(0, 10)}...${fromAddress.substring(fromAddress.length - 6)}</p>` : ''}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://vault.auxite.io/vault" style="background-color: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; display: inline-block;">${t.viewWallet}</a>
          </div>
        `,
      }),
    };
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// HTML EMAIL WRAPPER
// ══════════════════════════════════════════════════════════════════════════════

function generateEmailHTML({ title, content }: { title: string; content: string }): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Georgia, 'Times New Roman', serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff;">
          <tr>
            <td style="height: 3px; background: #C5A55A;"></td>
          </tr>
          <tr>
            <td style="padding: 24px 30px 16px; border-bottom: 1px solid #e5e5e5;">
              <h1 style="font-size: 13px; letter-spacing: 5px; color: #1a1a1a; font-weight: 700; text-transform: uppercase; margin: 0 0 2px 0;">Auxite</h1>
              <p style="font-size: 11px; color: #888; margin: 0;">Custody &amp; Settlement Services</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 30px;">
              <h2 style="font-size: 16px; color: #1a1a1a; font-weight: 400; margin: 0 0 16px 0;">${title}</h2>
              <div style="color: #444; font-size: 13px; line-height: 1.7;">
                ${content}
              </div>
              <p style="font-size: 10px; color: #999; margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; font-style: italic;">This message serves as an operational confirmation and should be retained for your financial records.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 30px; border-top: 1px solid #e5e5e5; text-align: center;">
              <p style="font-size: 9px; color: #aaa; margin: 4px 0;">Auxite Precious Metals AG &middot; Zurich, Switzerland</p>
              <p style="font-size: 9px; color: #aaa; margin: 4px 0;">This is an automated notification. Please do not reply.</p>
            </td>
          </tr>
          <tr>
            <td style="height: 2px; background: #C5A55A;"></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// ══════════════════════════════════════════════════════════════════════════════
// SEND EMAIL FUNCTION
// ══════════════════════════════════════════════════════════════════════════════

export interface SendEmailOptions {
  type: keyof typeof templates;
  to: string;
  subject?: string;
  data: EmailData;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    if (!resend) {
      console.warn('⚠️ Resend API key not configured - email not sent');
      return { success: false, error: 'Email service not configured' };
    }

    const template = templates[options.type];

    if (!template) {
      throw new Error(`Unknown email template: ${options.type}`);
    }

    const { subject, html } = template(options.data);

    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject || subject,
      html,
    });

    if (error) {
      console.error(`❌ Email error: ${options.type} to ${options.to}`, error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Email sent: ${options.type} to ${options.to} (ID: ${data?.id})`);
    return { success: true, id: data?.id };

  } catch (error: any) {
    console.error(`❌ Email error: ${options.type} to ${options.to}`, error.message);
    return { success: false, error: error.message };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DIRECT SEND FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

export async function sendVerificationEmail(email: string, name: string, verificationUrl: string, language: string = 'en') {
  return sendEmail({
    type: 'verification',
    to: email,
    data: { name, verificationUrl, language },
  });
}

export async function sendVerificationCodeEmail(email: string, name: string, code: string, verificationUrl: string, language: string = 'en') {
  return sendEmail({
    type: 'verification-code',
    to: email,
    data: { name, code, verificationUrl, language },
  });
}

export async function sendWelcomeEmail(email: string, name: string, language: string = 'en') {
  return sendEmail({
    type: 'welcome',
    to: email,
    data: { name, language },
  });
}

export async function sendPasswordResetEmail(email: string, name: string, resetUrl: string, language: string = 'en') {
  return sendEmail({
    type: 'password-reset',
    to: email,
    data: { name, resetUrl, expiryMinutes: 60, language },
  });
}

export async function send2FACodeEmail(email: string, name: string, code: string, language: string = 'en') {
  return sendEmail({
    type: '2fa-code',
    to: email,
    data: { name, code, language },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// TRANSACTION EMAIL FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

export async function sendDepositConfirmedEmail(email: string, name: string, amount: string, token: string, txHash?: string, language: string = 'en') {
  return sendEmail({
    type: 'deposit-confirmed',
    to: email,
    data: { name, amount, token, txHash, language },
  });
}

export async function sendWithdrawConfirmedEmail(email: string, name: string, amount: string, token: string, toAddress: string, txHash?: string, fee?: string, language: string = 'en') {
  return sendEmail({
    type: 'withdraw-confirmed',
    to: email,
    data: { name, amount, token, toAddress, txHash, fee, language },
  });
}

export async function sendTransferSentEmail(email: string, name: string, amount: string, token: string, toAddress: string, language: string = 'en') {
  return sendEmail({
    type: 'transfer-sent',
    to: email,
    data: { name, amount, token, toAddress, language },
  });
}

export async function sendTransferReceivedEmail(email: string, name: string, amount: string, token: string, fromAddress: string, language: string = 'en') {
  return sendEmail({
    type: 'transfer-received',
    to: email,
    data: { name, amount, token, fromAddress, language },
  });
}
