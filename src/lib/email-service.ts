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
        language,
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
      de: {
        subject: 'Bestätigen Sie Ihr Auxite-Konto',
        title: 'E-Mail-Verifizierung',
        greeting: `Hallo ${name},`,
        message: 'Vielen Dank für die Erstellung eines Auxite-Kontos. Bitte bestätigen Sie Ihre E-Mail-Adresse:',
        buttonText: 'E-Mail bestätigen',
        expiry: 'Dieser Link läuft in 24 Stunden ab.',
        ignore: 'Falls Sie kein Konto erstellt haben, ignorieren Sie diese E-Mail.',
      },
      fr: {
        subject: 'Vérifiez votre compte Auxite',
        title: 'Vérification de l\'email',
        greeting: `Bonjour ${name},`,
        message: 'Merci d\'avoir créé un compte Auxite. Veuillez vérifier votre adresse email en cliquant ci-dessous:',
        buttonText: 'Vérifier l\'email',
        expiry: 'Ce lien expirera dans 24 heures.',
        ignore: 'Si vous n\'avez pas créé de compte, ignorez cet email.',
      },
      ar: {
        subject: 'تأكيد حساب Auxite الخاص بك',
        title: 'التحقق من البريد الإلكتروني',
        greeting: `مرحباً ${name}،`,
        message: 'شكراً لإنشاء حساب Auxite. يرجى التحقق من بريدك الإلكتروني بالنقر أدناه:',
        buttonText: 'تأكيد البريد',
        expiry: 'ستنتهي صلاحية هذا الرابط خلال 24 ساعة.',
        ignore: 'إذا لم تقم بإنشاء حساب، يرجى تجاهل هذا البريد.',
      },
      ru: {
        subject: 'Подтвердите ваш аккаунт Auxite',
        title: 'Подтверждение email',
        greeting: `Привет ${name},`,
        message: 'Спасибо за создание аккаунта Auxite. Пожалуйста, подтвердите ваш email, нажав на кнопку ниже:',
        buttonText: 'Подтвердить email',
        expiry: 'Эта ссылка истечет через 24 часа.',
        ignore: 'Если вы не создавали аккаунт, проигнорируйте это письмо.',
      },
    };

    const t = content[language as keyof typeof content] || content.en;

    return {
      subject: t.subject,
      html: generateEmailHTML({
        title: t.title,
        language,
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
      de: {
        subject: 'Willkommen bei Auxite!',
        title: 'Willkommen bei Auxite',
        greeting: `Hallo ${name},`,
        message: 'Ihre E-Mail wurde verifiziert und Ihr Auxite-Konto ist jetzt aktiv!',
        features: [
          'Physische Edelmetalle in sicherer Verwahrung zuweisen und halten',
          'Abwicklungs- und Ausführungsdienste für Edelmetalle',
          'An strukturierten Metallleasing-Programmen teilnehmen',
          'Unabhängige Verwahrung mit voller Zuweisungstransparenz',
        ],
        cta: 'Jetzt starten',
        support: 'Bei Fragen steht Ihnen unser Support-Team gerne zur Verfügung.',
      },
      fr: {
        subject: 'Bienvenue chez Auxite !',
        title: 'Bienvenue chez Auxite',
        greeting: `Bonjour ${name},`,
        message: 'Votre email a été vérifié et votre compte Auxite est maintenant actif !',
        features: [
          'Allouer et détenir des métaux précieux physiques en garde sécurisée',
          'Services de règlement et d\'exécution pour les métaux précieux',
          'Participer à des programmes structurés de leasing de métaux',
          'Garde indépendante avec transparence totale de l\'allocation',
        ],
        cta: 'Commencer',
        support: 'Si vous avez des questions, notre équipe de support est là pour vous aider.',
      },
      ar: {
        subject: 'مرحباً بك في Auxite!',
        title: 'مرحباً بك في Auxite',
        greeting: `مرحباً ${name}،`,
        message: 'تم التحقق من بريدك الإلكتروني وحسابك في Auxite نشط الآن!',
        features: [
          'تخصيص والاحتفاظ بالمعادن الثمينة المادية في حفظ آمن',
          'خدمات التسوية والتنفيذ للمعادن الثمينة',
          'المشاركة في برامج تأجير المعادن المهيكلة',
          'حفظ مستقل مع شفافية كاملة في التخصيص',
        ],
        cta: 'ابدأ الآن',
        support: 'إذا كانت لديك أي أسئلة، فريق الدعم لدينا هنا لمساعدتك.',
      },
      ru: {
        subject: 'Добро пожаловать в Auxite!',
        title: 'Добро пожаловать в Auxite',
        greeting: `Привет ${name},`,
        message: 'Ваш email подтвержден, и ваш аккаунт Auxite теперь активен!',
        features: [
          'Размещение и хранение физических драгоценных металлов в надежном хранилище',
          'Услуги расчетов и исполнения по драгоценным металлам',
          'Участие в структурированных программах лизинга металлов',
          'Независимое хранение с полной прозрачностью размещения',
        ],
        cta: 'Начать',
        support: 'Если у вас есть вопросы, наша команда поддержки готова помочь.',
      },
    };

    const t = content[language as keyof typeof content] || content.en;

    return {
      subject: t.subject,
      html: generateEmailHTML({
        title: t.title,
        language,
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
      de: {
        subject: 'Setzen Sie Ihr Auxite-Passwort zurück',
        title: 'Passwort zurücksetzen',
        greeting: `Hallo ${name},`,
        message: 'Wir haben eine Anfrage zum Zurücksetzen Ihres Passworts erhalten. Klicken Sie auf den Button:',
        buttonText: 'Passwort zurücksetzen',
        expiry: `Dieser Link läuft in ${expiryMinutes} Minuten ab.`,
        ignore: 'Falls Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail.',
      },
      fr: {
        subject: 'Réinitialisez votre mot de passe Auxite',
        title: 'Réinitialisation du mot de passe',
        greeting: `Bonjour ${name},`,
        message: 'Nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous :',
        buttonText: 'Réinitialiser le mot de passe',
        expiry: `Ce lien expirera dans ${expiryMinutes} minutes.`,
        ignore: 'Si vous n\'avez pas fait cette demande, veuillez ignorer cet email.',
      },
      ar: {
        subject: 'إعادة تعيين كلمة مرور Auxite',
        title: 'إعادة تعيين كلمة المرور',
        greeting: `مرحباً ${name}،`,
        message: 'تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك. انقر على الزر أدناه:',
        buttonText: 'إعادة تعيين كلمة المرور',
        expiry: `ستنتهي صلاحية هذا الرابط خلال ${expiryMinutes} دقيقة.`,
        ignore: 'إذا لم تقم بهذا الطلب، يرجى تجاهل هذا البريد.',
      },
      ru: {
        subject: 'Сбросьте пароль Auxite',
        title: 'Сброс пароля',
        greeting: `Привет ${name},`,
        message: 'Мы получили запрос на сброс вашего пароля. Нажмите на кнопку ниже:',
        buttonText: 'Сбросить пароль',
        expiry: `Эта ссылка истечет через ${expiryMinutes} минут.`,
        ignore: 'Если вы не запрашивали сброс, проигнорируйте это письмо.',
      },
    };

    const t = content[language as keyof typeof content] || content.en;

    return {
      subject: t.subject,
      html: generateEmailHTML({
        title: t.title,
        language,
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
      de: {
        subject: 'Ihr Auxite-Bestätigungscode',
        title: 'Bestätigungscode',
        greeting: `Hallo ${name},`,
        message: 'Ihr Bestätigungscode lautet:',
        expiry: 'Dieser Code läuft in 10 Minuten ab.',
        ignore: 'Falls Sie diesen Code nicht angefordert haben, ignorieren Sie diese E-Mail.',
      },
      fr: {
        subject: 'Votre code de vérification Auxite',
        title: 'Code de vérification',
        greeting: `Bonjour ${name},`,
        message: 'Votre code de vérification est :',
        expiry: 'Ce code expirera dans 10 minutes.',
        ignore: 'Si vous n\'avez pas demandé ce code, veuillez ignorer cet email.',
      },
      ar: {
        subject: 'رمز التحقق الخاص بك من Auxite',
        title: 'رمز التحقق',
        greeting: `مرحباً ${name}،`,
        message: 'رمز التحقق الخاص بك هو:',
        expiry: 'ستنتهي صلاحية هذا الرمز خلال 10 دقائق.',
        ignore: 'إذا لم تطلب هذا الرمز، يرجى تجاهل هذا البريد.',
      },
      ru: {
        subject: 'Ваш код подтверждения Auxite',
        title: 'Код подтверждения',
        greeting: `Привет ${name},`,
        message: 'Ваш код подтверждения:',
        expiry: 'Этот код истечет через 10 минут.',
        ignore: 'Если вы не запрашивали этот код, проигнорируйте это письмо.',
      },
    };

    const t = content[language as keyof typeof content] || content.en;

    return {
      subject: t.subject,
      html: generateEmailHTML({
        title: t.title,
        language,
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
      de: {
        subject: `Einzahlung bestätigt: ${amount} ${token}`,
        title: 'Einzahlung bestätigt',
        greeting: `Hallo ${name},`,
        message: 'Ihre Einzahlung wurde bestätigt und Ihrem Konto gutgeschrieben.',
        amountLabel: 'Betrag',
        txLabel: 'Transaktion',
        viewWallet: 'Im Kundenbuch anzeigen',
      },
      fr: {
        subject: `Dépôt confirmé : ${amount} ${token}`,
        title: 'Dépôt confirmé',
        greeting: `Bonjour ${name},`,
        message: 'Votre dépôt a été confirmé et crédité sur votre compte.',
        amountLabel: 'Montant',
        txLabel: 'Transaction',
        viewWallet: 'Voir dans le registre client',
      },
      ar: {
        subject: `تم تأكيد الإيداع: ${amount} ${token}`,
        title: 'تم تأكيد الإيداع',
        greeting: `مرحباً ${name}،`,
        message: 'تم تأكيد إيداعك وإضافته إلى حسابك.',
        amountLabel: 'المبلغ',
        txLabel: 'المعاملة',
        viewWallet: 'عرض في دفتر العميل',
      },
      ru: {
        subject: `Депозит подтвержден: ${amount} ${token}`,
        title: 'Депозит подтвержден',
        greeting: `Привет ${name},`,
        message: 'Ваш депозит подтвержден и зачислен на ваш счет.',
        amountLabel: 'Сумма',
        txLabel: 'Транзакция',
        viewWallet: 'Посмотреть в клиентском реестре',
      },
    };

    const t = content[language as keyof typeof content] || content.en;

    return {
      subject: t.subject,
      html: generateEmailHTML({
        title: t.title,
        language,
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
  // EXTERNAL SETTLEMENT TRANSFER REQUESTED EMAIL
  // ────────────────────────────────────────────────────────────────────────────
  'withdraw-requested': (data: EmailData) => {
    const { name, amount, token, toAddress, fee, language = 'en' } = data;

    const content = {
      en: {
        subject: `External Settlement Transfer Requested: ${amount} ${token}`,
        title: 'External Settlement Transfer Requested',
        greeting: `Hi ${name},`,
        message: 'Your external settlement transfer has been submitted and is being processed.',
        amountLabel: 'Amount',
        toLabel: 'Destination',
        feeLabel: 'Settlement Network Fee',
        statusLabel: 'Status',
        statusValue: 'Processing',
        notice: 'Assets transferred externally will no longer be held within Auxite custody structures.',
        viewHistory: 'View in Client Ledger',
      },
      tr: {
        subject: `Harici Takas Transferi Talep Edildi: ${amount} ${token}`,
        title: 'Harici Takas Transferi Talep Edildi',
        greeting: `Merhaba ${name},`,
        message: 'Harici takas transfer talebiniz alındı ve işleniyor.',
        amountLabel: 'Miktar',
        toLabel: 'Hedef',
        feeLabel: 'Takas Ağı Ücreti',
        statusLabel: 'Durum',
        statusValue: 'İşleniyor',
        notice: 'Harici olarak transfer edilen varlıklar artık Auxite saklama yapıları altında tutulmayacaktır.',
        viewHistory: 'Müşteri Defterinde Görüntüle',
      },
      de: {
        subject: `Externe Abwicklung angefordert: ${amount} ${token}`,
        title: 'Externe Abwicklung angefordert',
        greeting: `Hallo ${name},`,
        message: 'Ihr externer Abwicklungstransfer wurde eingereicht und wird bearbeitet.',
        amountLabel: 'Betrag',
        toLabel: 'Ziel',
        feeLabel: 'Abwicklungsnetzwerkgebühr',
        statusLabel: 'Status',
        statusValue: 'In Bearbeitung',
        notice: 'Extern transferierte Vermögenswerte werden nicht mehr innerhalb der Auxite-Verwahrungsstrukturen gehalten.',
        viewHistory: 'Im Kundenbuch anzeigen',
      },
      fr: {
        subject: `Transfert de règlement externe demandé : ${amount} ${token}`,
        title: 'Transfert de règlement externe demandé',
        greeting: `Bonjour ${name},`,
        message: 'Votre transfert de règlement externe a été soumis et est en cours de traitement.',
        amountLabel: 'Montant',
        toLabel: 'Destination',
        feeLabel: 'Frais de réseau de règlement',
        statusLabel: 'Statut',
        statusValue: 'En cours de traitement',
        notice: 'Les actifs transférés en externe ne seront plus détenus dans les structures de garde Auxite.',
        viewHistory: 'Voir dans le registre client',
      },
      ar: {
        subject: `طلب تحويل تسوية خارجي: ${amount} ${token}`,
        title: 'طلب تحويل تسوية خارجي',
        greeting: `مرحباً ${name}،`,
        message: 'تم تقديم طلب التحويل الخارجي الخاص بك وهو قيد المعالجة.',
        amountLabel: 'المبلغ',
        toLabel: 'الوجهة',
        feeLabel: 'رسوم شبكة التسوية',
        statusLabel: 'الحالة',
        statusValue: 'قيد المعالجة',
        notice: 'الأصول المحولة خارجياً لن تكون محتفظ بها ضمن هياكل حفظ Auxite.',
        viewHistory: 'عرض في دفتر العميل',
      },
      ru: {
        subject: `Запрос на внешний расчетный перевод: ${amount} ${token}`,
        title: 'Запрос на внешний расчетный перевод',
        greeting: `Привет ${name},`,
        message: 'Ваш запрос на внешний расчетный перевод отправлен и обрабатывается.',
        amountLabel: 'Сумма',
        toLabel: 'Назначение',
        feeLabel: 'Комиссия расчетной сети',
        statusLabel: 'Статус',
        statusValue: 'Обработка',
        notice: 'Активы, переведенные на внешние адреса, больше не будут храниться в структурах хранения Auxite.',
        viewHistory: 'Посмотреть в клиентском реестре',
      },
    };

    const t = content[language as keyof typeof content] || content.en;

    return {
      subject: t.subject,
      html: generateEmailHTML({
        title: t.title,
        language,
        content: `
          <p>${t.greeting}</p>
          <p>${t.message}</p>
          <div style="background: #fafafa; border-left: 3px solid #C5A55A; padding: 16px 18px; margin: 18px 0;">
            <p style="margin: 0 0 10px 0;"><strong>${t.amountLabel}:</strong> <span style="color: #C5A55A; font-size: 18px; font-weight: 600;">${amount} ${token}</span></p>
            <p style="margin: 0 0 10px 0; font-size: 12px; color: #64748b;"><strong>${t.toLabel}:</strong> ${toAddress}</p>
            ${fee ? `<p style="margin: 0 0 10px 0; font-size: 12px; color: #64748b;"><strong>${t.feeLabel}:</strong> ${fee}</p>` : ''}
            <p style="margin: 0; font-size: 12px; color: #C5A55A;"><strong>${t.statusLabel}:</strong> ${t.statusValue}</p>
          </div>
          <p style="color: #94a3b8; font-size: 12px; font-style: italic;">${t.notice}</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://vault.auxite.io/vault" style="background-color: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; display: inline-block;">${t.viewHistory}</a>
          </div>
        `,
      }),
    };
  },

  // ────────────────────────────────────────────────────────────────────────────
  // EXTERNAL SETTLEMENT TRANSFER BROADCAST EMAIL (tx submitted)
  // ────────────────────────────────────────────────────────────────────────────
  'withdraw-confirmed': (data: EmailData) => {
    const { name, amount, token, toAddress, txHash, fee, language = 'en' } = data;

    const content = {
      en: {
        subject: `External Settlement Transfer Broadcast: ${amount} ${token}`,
        title: 'External Settlement Transfer Broadcast',
        greeting: `Hi ${name},`,
        message: 'Your external settlement transfer has been broadcast to the settlement network.',
        amountLabel: 'Amount',
        toLabel: 'Destination',
        feeLabel: 'Settlement Network Fee',
        txLabel: 'Transaction Hash',
        notice: 'Assets transferred externally will no longer be held within Auxite custody structures.',
        viewHistory: 'View in Client Ledger',
      },
      tr: {
        subject: `Harici Takas Transferi Yayınlandı: ${amount} ${token}`,
        title: 'Harici Takas Transferi Yayınlandı',
        greeting: `Merhaba ${name},`,
        message: 'Harici takas transferiniz takas ağına yayınlandı.',
        amountLabel: 'Miktar',
        toLabel: 'Hedef',
        feeLabel: 'Takas Ağı Ücreti',
        txLabel: 'İşlem Hash',
        notice: 'Harici olarak transfer edilen varlıklar artık Auxite saklama yapıları altında tutulmayacaktır.',
        viewHistory: 'Müşteri Defterinde Görüntüle',
      },
      de: {
        subject: `Externe Abwicklung gesendet: ${amount} ${token}`,
        title: 'Externe Abwicklung gesendet',
        greeting: `Hallo ${name},`,
        message: 'Ihr externer Abwicklungstransfer wurde an das Abwicklungsnetzwerk übermittelt.',
        amountLabel: 'Betrag',
        toLabel: 'Ziel',
        feeLabel: 'Abwicklungsnetzwerkgebühr',
        txLabel: 'Transaktions-Hash',
        notice: 'Extern transferierte Vermögenswerte werden nicht mehr innerhalb der Auxite-Verwahrungsstrukturen gehalten.',
        viewHistory: 'Im Kundenbuch anzeigen',
      },
      fr: {
        subject: `Transfert de règlement externe diffusé : ${amount} ${token}`,
        title: 'Transfert de règlement externe diffusé',
        greeting: `Bonjour ${name},`,
        message: 'Votre transfert de règlement externe a été diffusé sur le réseau de règlement.',
        amountLabel: 'Montant',
        toLabel: 'Destination',
        feeLabel: 'Frais de réseau de règlement',
        txLabel: 'Hash de transaction',
        notice: 'Les actifs transférés en externe ne seront plus détenus dans les structures de garde Auxite.',
        viewHistory: 'Voir dans le registre client',
      },
      ar: {
        subject: `تم بث تحويل التسوية الخارجي: ${amount} ${token}`,
        title: 'تم بث تحويل التسوية الخارجي',
        greeting: `مرحباً ${name}،`,
        message: 'تم بث تحويل التسوية الخارجي الخاص بك إلى شبكة التسوية.',
        amountLabel: 'المبلغ',
        toLabel: 'الوجهة',
        feeLabel: 'رسوم شبكة التسوية',
        txLabel: 'هاش المعاملة',
        notice: 'الأصول المحولة خارجياً لن تكون محتفظ بها ضمن هياكل حفظ Auxite.',
        viewHistory: 'عرض في دفتر العميل',
      },
      ru: {
        subject: `Внешний расчетный перевод отправлен: ${amount} ${token}`,
        title: 'Внешний расчетный перевод отправлен',
        greeting: `Привет ${name},`,
        message: 'Ваш внешний расчетный перевод отправлен в расчетную сеть.',
        amountLabel: 'Сумма',
        toLabel: 'Назначение',
        feeLabel: 'Комиссия расчетной сети',
        txLabel: 'Хэш транзакции',
        notice: 'Активы, переведенные на внешние адреса, больше не будут храниться в структурах хранения Auxite.',
        viewHistory: 'Посмотреть в клиентском реестре',
      },
    };

    const t = content[language as keyof typeof content] || content.en;

    return {
      subject: t.subject,
      html: generateEmailHTML({
        title: t.title,
        language,
        content: `
          <p>${t.greeting}</p>
          <p>${t.message}</p>
          <div style="background: #fafafa; border-left: 3px solid #C5A55A; padding: 16px 18px; margin: 18px 0;">
            <p style="margin: 0 0 10px 0;"><strong>${t.amountLabel}:</strong> <span style="color: #C5A55A; font-size: 18px; font-weight: 600;">${amount} ${token}</span></p>
            <p style="margin: 0 0 10px 0; font-size: 12px; color: #64748b;"><strong>${t.toLabel}:</strong> ${toAddress}</p>
            ${fee ? `<p style="margin: 0 0 10px 0; font-size: 12px; color: #64748b;"><strong>${t.feeLabel}:</strong> ${fee}</p>` : ''}
            ${txHash ? `<p style="margin: 0; font-size: 12px; color: #64748b;"><strong>${t.txLabel}:</strong> ${txHash.substring(0, 20)}...</p>` : ''}
          </div>
          <p style="color: #94a3b8; font-size: 12px; font-style: italic;">${t.notice}</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://vault.auxite.io/vault" style="background-color: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; display: inline-block;">${t.viewHistory}</a>
          </div>
        `,
      }),
    };
  },

  // ────────────────────────────────────────────────────────────────────────────
  // INTERNAL CUSTODY TRANSFER CONFIRMED EMAIL
  // ────────────────────────────────────────────────────────────────────────────
  'transfer-sent': (data: EmailData) => {
    const { name, amount, token, toAddress, language = 'en' } = data;

    const content = {
      en: {
        subject: `Internal Custody Transfer Confirmed: ${amount} ${token}`,
        title: 'Internal Custody Transfer Confirmed',
        greeting: `Hi ${name},`,
        message: 'Your internal custody transfer has been recorded in the Auxite custody ledger.',
        amountLabel: 'Amount',
        toLabel: 'Recipient',
        viewWallet: 'View in Client Ledger',
      },
      tr: {
        subject: `Dahili Saklama Transferi Onaylandı: ${amount} ${token}`,
        title: 'Dahili Saklama Transferi Onaylandı',
        greeting: `Merhaba ${name},`,
        message: 'Dahili saklama transferiniz Auxite saklama defterine kaydedildi.',
        amountLabel: 'Miktar',
        toLabel: 'Alıcı',
        viewWallet: 'Müşteri Defterinde Görüntüle',
      },
      de: {
        subject: `Interne Verwahrungsübertragung bestätigt: ${amount} ${token}`,
        title: 'Interne Verwahrungsübertragung bestätigt',
        greeting: `Hallo ${name},`,
        message: 'Ihre interne Verwahrungsübertragung wurde im Auxite-Verwahrungsbuch erfasst.',
        amountLabel: 'Betrag',
        toLabel: 'Empfänger',
        viewWallet: 'Im Kundenbuch anzeigen',
      },
      fr: {
        subject: `Transfert de garde interne confirmé : ${amount} ${token}`,
        title: 'Transfert de garde interne confirmé',
        greeting: `Bonjour ${name},`,
        message: 'Votre transfert de garde interne a été enregistré dans le registre de garde Auxite.',
        amountLabel: 'Montant',
        toLabel: 'Destinataire',
        viewWallet: 'Voir dans le registre client',
      },
      ar: {
        subject: `تم تأكيد التحويل الداخلي: ${amount} ${token}`,
        title: 'تم تأكيد التحويل الداخلي',
        greeting: `مرحباً ${name}،`,
        message: 'تم تسجيل التحويل الداخلي الخاص بك في دفتر حفظ Auxite.',
        amountLabel: 'المبلغ',
        toLabel: 'المستلم',
        viewWallet: 'عرض في دفتر العميل',
      },
      ru: {
        subject: `Внутренний перевод подтвержден: ${amount} ${token}`,
        title: 'Внутренний перевод подтвержден',
        greeting: `Привет ${name},`,
        message: 'Ваш внутренний перевод записан в реестр хранения Auxite.',
        amountLabel: 'Сумма',
        toLabel: 'Получатель',
        viewWallet: 'Посмотреть в клиентском реестре',
      },
    };

    const t = content[language as keyof typeof content] || content.en;

    return {
      subject: t.subject,
      html: generateEmailHTML({
        title: t.title,
        language,
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
  // INTERNAL CUSTODY TRANSFER RECEIVED EMAIL
  // ────────────────────────────────────────────────────────────────────────────
  'transfer-received': (data: EmailData) => {
    const { name, amount, token, fromAddress, language = 'en' } = data;

    const content = {
      en: {
        subject: `Internal Custody Transfer Received: ${amount} ${token}`,
        title: 'Internal Custody Transfer Received',
        greeting: `Hi ${name},`,
        message: 'An internal custody transfer has been recorded to your account in the Auxite custody ledger.',
        amountLabel: 'Amount',
        fromLabel: 'From',
        viewWallet: 'View in Client Ledger',
      },
      tr: {
        subject: `Dahili Saklama Transferi Alındı: ${amount} ${token}`,
        title: 'Dahili Saklama Transferi Alındı',
        greeting: `Merhaba ${name},`,
        message: 'Auxite saklama defterinde hesabınıza bir dahili saklama transferi kaydedildi.',
        amountLabel: 'Miktar',
        fromLabel: 'Gönderen',
        viewWallet: 'Müşteri Defterinde Görüntüle',
      },
      de: {
        subject: `Interne Verwahrungsübertragung erhalten: ${amount} ${token}`,
        title: 'Interne Verwahrungsübertragung erhalten',
        greeting: `Hallo ${name},`,
        message: 'Eine interne Verwahrungsübertragung wurde in Ihrem Konto im Auxite-Verwahrungsbuch erfasst.',
        amountLabel: 'Betrag',
        fromLabel: 'Von',
        viewWallet: 'Im Kundenbuch anzeigen',
      },
      fr: {
        subject: `Transfert de garde interne reçu : ${amount} ${token}`,
        title: 'Transfert de garde interne reçu',
        greeting: `Bonjour ${name},`,
        message: 'Un transfert de garde interne a été enregistré sur votre compte dans le registre de garde Auxite.',
        amountLabel: 'Montant',
        fromLabel: 'De',
        viewWallet: 'Voir dans le registre client',
      },
      ar: {
        subject: `تم استلام تحويل داخلي: ${amount} ${token}`,
        title: 'تم استلام تحويل داخلي',
        greeting: `مرحباً ${name}،`,
        message: 'تم تسجيل تحويل داخلي إلى حسابك في دفتر حفظ Auxite.',
        amountLabel: 'المبلغ',
        fromLabel: 'من',
        viewWallet: 'عرض في دفتر العميل',
      },
      ru: {
        subject: `Получен внутренний перевод: ${amount} ${token}`,
        title: 'Получен внутренний перевод',
        greeting: `Привет ${name},`,
        message: 'Внутренний перевод был записан на ваш счет в реестре хранения Auxite.',
        amountLabel: 'Сумма',
        fromLabel: 'От',
        viewWallet: 'Посмотреть в клиентском реестре',
      },
    };

    const t = content[language as keyof typeof content] || content.en;

    return {
      subject: t.subject,
      html: generateEmailHTML({
        title: t.title,
        language,
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

function generateEmailHTML({ title, content, language }: { title: string; content: string; language?: string }): string {
  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const align = language === 'ar' ? 'right' : 'left';
  return `
<!DOCTYPE html>
<html dir="${dir}" lang="${language || 'en'}">
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
              <p style="font-size: 9px; color: #aaa; margin: 4px 0;">Aurum Ledger Ltd &middot; Hong Kong</p>
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

export async function sendWithdrawRequestedEmail(email: string, name: string, amount: string, token: string, toAddress: string, fee?: string, language: string = 'en') {
  return sendEmail({
    type: 'withdraw-requested',
    to: email,
    data: { name, amount, token, toAddress, fee, language },
  });
}
