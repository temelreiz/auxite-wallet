// src/lib/email-service.ts
// Email Service using Resend

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
  // VERIFICATION EMAIL
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
      de: {
        subject: 'Bestätigen Sie Ihr Auxite-Konto',
        title: 'E-Mail-Verifizierung',
        greeting: `Hallo ${name},`,
        message: 'Vielen Dank für die Erstellung eines Auxite-Kontos. Bitte bestätigen Sie Ihre E-Mail-Adresse:',
        buttonText: 'E-Mail bestätigen',
        expiry: 'Dieser Link läuft in 24 Stunden ab.',
        ignore: 'Falls Sie kein Konto erstellt haben, ignorieren Sie diese E-Mail.',
      },
      ar: {
        subject: 'تأكيد حساب Auxite الخاص بك',
        title: 'التحقق من البريد الإلكتروني',
        greeting: `مرحباً ${name}،`,
        message: 'شكراً لإنشاء حساب Auxite. يرجى تأكيد عنوان بريدك الإلكتروني:',
        buttonText: 'تأكيد البريد',
        expiry: 'ستنتهي صلاحية هذا الرابط خلال 24 ساعة.',
        ignore: 'إذا لم تقم بإنشاء حساب، يرجى تجاهل هذا البريد.',
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
            <a href="${verificationUrl}" style="background-color: #10B981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">${t.buttonText}</a>
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
          'Buy and sell tokenized precious metals',
          'Trade cryptocurrencies securely',
          'Earn staking rewards',
          'Store your digital assets safely',
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
          'Tokenize edilmiş değerli metaller alın ve satın',
          'Kripto paralarınızı güvenle işlem yapın',
          'Staking ödülleri kazanın',
          'Dijital varlıklarınızı güvenle saklayın',
        ],
        cta: 'Başlayın',
        support: 'Sorularınız varsa, destek ekibimiz size yardımcı olmak için burada.',
      },
      de: {
        subject: 'Willkommen bei Auxite!',
        title: 'Willkommen bei Auxite',
        greeting: `Hallo ${name},`,
        message: 'Ihre E-Mail wurde verifiziert und Ihr Auxite-Konto ist jetzt aktiv!',
        features: [
          'Kaufen und verkaufen Sie tokenisierte Edelmetalle',
          'Handeln Sie Kryptowährungen sicher',
          'Verdienen Sie Staking-Belohnungen',
          'Speichern Sie Ihre digitalen Vermögenswerte sicher',
        ],
        cta: 'Loslegen',
        support: 'Bei Fragen steht Ihnen unser Support-Team zur Verfügung.',
      },
      ar: {
        subject: 'مرحباً بك في Auxite!',
        title: 'مرحباً بك في Auxite',
        greeting: `مرحباً ${name}،`,
        message: 'تم التحقق من بريدك الإلكتروني وحسابك نشط الآن!',
        features: [
          'شراء وبيع المعادن الثمينة المرمزة',
          'تداول العملات المشفرة بأمان',
          'احصل على مكافآت الستاكينغ',
          'احفظ أصولك الرقمية بأمان',
        ],
        cta: 'ابدأ الآن',
        support: 'إذا كانت لديك أي أسئلة، فريق الدعم هنا للمساعدة.',
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
            <a href="https://wallet.auxite.io" style="background-color: #10B981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">${t.cta}</a>
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
        message: 'We received a request to reset your password. Click the button below to choose a new password:',
        buttonText: 'Reset Password',
        expiry: `This link will expire in ${expiryMinutes} minutes.`,
        ignore: 'If you did not request a password reset, please ignore this email. Your password will remain unchanged.',
      },
      tr: {
        subject: 'Auxite şifrenizi sıfırlayın',
        title: 'Şifre Sıfırlama',
        greeting: `Merhaba ${name},`,
        message: 'Şifrenizi sıfırlamak için bir talep aldık. Yeni bir şifre belirlemek için aşağıdaki butona tıklayın:',
        buttonText: 'Şifreyi Sıfırla',
        expiry: `Bu bağlantı ${expiryMinutes} dakika içinde geçerliliğini yitirecektir.`,
        ignore: 'Şifre sıfırlama talebinde bulunmadıysanız, bu e-postayı görmezden gelin. Şifreniz değişmeyecektir.',
      },
      de: {
        subject: 'Setzen Sie Ihr Auxite-Passwort zurück',
        title: 'Passwort zurücksetzen',
        greeting: `Hallo ${name},`,
        message: 'Wir haben eine Anfrage zum Zurücksetzen Ihres Passworts erhalten:',
        buttonText: 'Passwort zurücksetzen',
        expiry: `Dieser Link läuft in ${expiryMinutes} Minuten ab.`,
        ignore: 'Falls Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail.',
      },
      ar: {
        subject: 'إعادة تعيين كلمة مرور Auxite',
        title: 'إعادة تعيين كلمة المرور',
        greeting: `مرحباً ${name}،`,
        message: 'تلقينا طلباً لإعادة تعيين كلمة المرور. انقر على الزر أدناه:',
        buttonText: 'إعادة تعيين',
        expiry: `ستنتهي صلاحية هذا الرابط خلال ${expiryMinutes} دقيقة.`,
        ignore: 'إذا لم تطلب ذلك، تجاهل هذا البريد.',
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
            <a href="${resetUrl}" style="background-color: #EF4444; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">${t.buttonText}</a>
          </div>
          <p style="color: #64748b; font-size: 14px;">${t.expiry}</p>
          <p style="color: #94a3b8; font-size: 12px;">${t.ignore}</p>
        `,
      }),
    };
  },

  // ────────────────────────────────────────────────────────────────────────────
  // PASSWORD CHANGED CONFIRMATION
  // ────────────────────────────────────────────────────────────────────────────
  'password-changed': (data: EmailData) => {
    const { name, timestamp, language = 'en' } = data;
    
    const content = {
      en: {
        subject: 'Your Auxite password has been changed',
        title: 'Password Changed',
        greeting: `Hi ${name},`,
        message: 'Your Auxite password was successfully changed.',
        time: `Time: ${new Date(timestamp).toLocaleString('en-US')}`,
        warning: 'If you did not make this change, please contact our support team immediately and secure your account.',
      },
      tr: {
        subject: 'Auxite şifreniz değiştirildi',
        title: 'Şifre Değiştirildi',
        greeting: `Merhaba ${name},`,
        message: 'Auxite şifreniz başarıyla değiştirildi.',
        time: `Zaman: ${new Date(timestamp).toLocaleString('tr-TR')}`,
        warning: 'Bu değişikliği siz yapmadıysanız, lütfen hemen destek ekibimizle iletişime geçin ve hesabınızı güvence altına alın.',
      },
      de: {
        subject: 'Ihr Auxite-Passwort wurde geändert',
        title: 'Passwort geändert',
        greeting: `Hallo ${name},`,
        message: 'Ihr Auxite-Passwort wurde erfolgreich geändert.',
        time: `Zeit: ${new Date(timestamp).toLocaleString('de-DE')}`,
        warning: 'Falls Sie diese Änderung nicht vorgenommen haben, kontaktieren Sie sofort unser Support-Team.',
      },
      ar: {
        subject: 'تم تغيير كلمة مرور Auxite الخاصة بك',
        title: 'تم تغيير كلمة المرور',
        greeting: `مرحباً ${name}،`,
        message: 'تم تغيير كلمة مرور Auxite بنجاح.',
        time: `الوقت: ${new Date(timestamp).toLocaleString('ar-SA')}`,
        warning: 'إذا لم تقم بهذا التغيير، اتصل بفريق الدعم فوراً.',
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
          <p style="color: #64748b; font-size: 14px;">${t.time}</p>
          <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0;">⚠️ ${t.warning}</p>
          </div>
        `,
      }),
    };
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 2FA CODE EMAIL (for login verification)
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
        ignore: 'If you did not request this code, please ignore this email and ensure your account is secure.',
      },
      tr: {
        subject: 'Auxite doğrulama kodunuz',
        title: 'Doğrulama Kodu',
        greeting: `Merhaba ${name},`,
        message: 'Doğrulama kodunuz:',
        expiry: 'Bu kod 10 dakika içinde geçerliliğini yitirecektir.',
        ignore: 'Bu kodu talep etmediyseniz, bu e-postayı görmezden gelin ve hesabınızın güvenliğini kontrol edin.',
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
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #10B981;">${code}</span>
            </div>
          </div>
          <p style="color: #64748b; font-size: 14px;">${t.expiry}</p>
          <p style="color: #94a3b8; font-size: 12px;">${t.ignore}</p>
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
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">AUXITE</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Tokenized Precious Metals</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">${title}</h2>
              <div style="color: #334155; font-size: 16px; line-height: 1.6;">
                ${content}
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 30px; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 12px; margin: 0; text-align: center;">
                © ${new Date().getFullYear()} Auxite. All rights reserved.<br>
                <a href="https://wallet.auxite.io" style="color: #10B981; text-decoration: none;">wallet.auxite.io</a>
              </p>
            </td>
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
// DIRECT SEND FUNCTION (without queue)
// ══════════════════════════════════════════════════════════════════════════════

export async function sendVerificationEmail(email: string, name: string, verificationUrl: string, language: string = 'en') {
  return sendEmail({
    type: 'verification',
    to: email,
    data: { name, verificationUrl, language },
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

export async function sendPasswordChangedEmail(email: string, name: string, language: string = 'en') {
  return sendEmail({
    type: 'password-changed',
    to: email,
    data: { name, timestamp: new Date().toISOString(), language },
  });
}

export async function send2FACodeEmail(email: string, name: string, code: string, language: string = 'en') {
  return sendEmail({
    type: '2fa-code',
    to: email,
    data: { name, code, language },
  });
}
