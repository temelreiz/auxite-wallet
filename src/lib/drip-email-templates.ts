// src/lib/drip-email-templates.ts
// Email Drip Campaign Templates — 6 languages (en, tr, de, fr, ar, ru)
// Matches the institutional design of existing Auxite emails

const VAULT_URL = "https://vault.auxite.io";

// ══════════════════════════════════════════════════════════════════════════════
// HTML HELPERS (same style as email-templates.ts)
// ══════════════════════════════════════════════════════════════════════════════

function cta(url: string, text: string): string {
  return `<div style="text-align:center;margin:24px 0"><a href="${url}" style="display:inline-block;background:#1a1a1a;color:#fff!important;padding:12px 28px;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase">${text}</a></div>`;
}

function highlight(text: string): string {
  return `<div style="background:#fafafa;border-left:3px solid #C5A55A;padding:14px 18px;margin:18px 0"><p style="font-size:13px;color:#444;margin:0;line-height:1.7">${text}</p></div>`;
}

function generateDripEmailHTML({
  title,
  content,
  language,
}: {
  title: string;
  content: string;
  language: string;
}): string {
  const dir = language === "ar" ? "rtl" : "ltr";
  return `<!DOCTYPE html>
<html dir="${dir}" lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;">
          <tr><td style="height:3px;background:#C5A55A;"></td></tr>
          <tr>
            <td style="padding:24px 30px 16px;border-bottom:1px solid #e5e5e5;">
              <h1 style="font-size:13px;letter-spacing:5px;color:#1a1a1a;font-weight:700;text-transform:uppercase;margin:0 0 2px 0;">Auxite</h1>
              <p style="font-size:11px;color:#888;margin:0;">Custody &amp; Settlement Services</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 30px;">
              <h2 style="font-size:16px;color:#1a1a1a;font-weight:400;margin:0 0 16px 0;">${title}</h2>
              <div style="color:#444;font-size:13px;line-height:1.7;">
                ${content}
              </div>
              <p style="font-size:10px;color:#999;margin-top:24px;padding-top:16px;border-top:1px solid #eee;font-style:italic;">This message serves as an operational communication. Please do not reply.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 30px;border-top:1px solid #e5e5e5;text-align:center;">
              <p style="font-size:9px;color:#aaa;margin:4px 0;">Aurum Ledger Ltd &middot; Hong Kong</p>
              <p style="font-size:9px;color:#aaa;margin:4px 0;">This is an automated notification. Please do not reply.</p>
            </td>
          </tr>
          <tr><td style="height:2px;background:#C5A55A;"></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// DRIP EMAIL TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type DripStage = "day3_kyc" | "day5_market" | "day14_urgency";

export interface DripEmail {
  subject: string;
  html: string;
}

interface DripContent {
  subject: string;
  title: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// DAY 3 — KYC REMINDER
// ══════════════════════════════════════════════════════════════════════════════

const day3Content: Record<string, DripContent> = {
  en: {
    subject: "Activate Your Welcome Gold — 5g AUXG Waiting",
    title: "Your Gold Is Waiting",
    body: `<p>You registered with Auxite and unlocked your Welcome Gold.</p>
${highlight("Complete KYC verification to <strong>activate your 5 AUXG Welcome Gold</strong> and unlock full platform access. Your gold is available for use within the platform.")}
<p>Verification takes less than 2 minutes. All you need is a valid ID document.</p>`,
    ctaText: "ACTIVATE GOLD",
    ctaUrl: VAULT_URL,
  },
  tr: {
    subject: "Hoş Geldin Altınınızı Aktive Edin — 5g AUXG Bekliyor",
    title: "Altınınız Sizi Bekliyor",
    body: `<p>Auxite'e kayıt oldunuz ve Hoş Geldin Altınınızı açtınız.</p>
${highlight("KYC doğrulamasını tamamlayarak <strong>5 AUXG Hoş Geldin Altınınızı aktive edin</strong> ve platform özelliklerinin tamamına erişin. Altınınız platform içi kullanım için hazır.")}
<p>Doğrulama işlemi 2 dakikadan kısa sürer. Tek ihtiyacınız geçerli bir kimlik belgesi.</p>`,
    ctaText: "ALTINI AKTİVE ET",
    ctaUrl: VAULT_URL,
  },
  de: {
    subject: "Aktivieren Sie Ihr Willkommensgold — 5g AUXG wartet",
    title: "Ihr Gold wartet",
    body: `<p>Sie haben sich bei Auxite registriert und Ihr Willkommensgold freigeschaltet.</p>
${highlight("Schließen Sie die KYC-Verifizierung ab, um <strong>Ihre 5 AUXG Willkommensgold zu aktivieren</strong> und vollen Zugang zur Plattform zu erhalten. Ihr Gold ist für die Nutzung innerhalb der Plattform verfügbar.")}
<p>Die Verifizierung dauert weniger als 2 Minuten. Sie benötigen lediglich ein gültiges Ausweisdokument.</p>`,
    ctaText: "GOLD AKTIVIEREN",
    ctaUrl: VAULT_URL,
  },
  fr: {
    subject: "Activez votre Or de Bienvenue — 5g AUXG en attente",
    title: "Votre Or vous attend",
    body: `<p>Vous vous êtes inscrit sur Auxite et avez débloqué votre Or de Bienvenue.</p>
${highlight("Complétez la vérification KYC pour <strong>activer vos 5 AUXG d'Or de Bienvenue</strong> et débloquer l'accès complet à la plateforme. Votre or est disponible pour utilisation au sein de la plateforme.")}
<p>La vérification prend moins de 2 minutes. Il vous suffit d'un document d'identité valide.</p>`,
    ctaText: "ACTIVER L'OR",
    ctaUrl: VAULT_URL,
  },
  ar: {
    subject: "فعّل ذهب الترحيب — 5غ AUXG في انتظارك",
    title: "ذهبك في انتظارك",
    body: `<p>لقد سجلت في Auxite وفتحت ذهب الترحيب الخاص بك.</p>
${highlight("أكمل التحقق من هويتك (KYC) لـ<strong>تفعيل 5 AUXG ذهب الترحيب</strong> وفتح الوصول الكامل للمنصة. ذهبك متاح للاستخدام داخل المنصة.")}
<p>التحقق يستغرق أقل من دقيقتين. كل ما تحتاجه هو وثيقة هوية صالحة.</p>`,
    ctaText: "فعّل الذهب",
    ctaUrl: VAULT_URL,
  },
  ru: {
    subject: "Активируйте приветственное золото — 5г AUXG ждёт",
    title: "Ваше золото ждёт",
    body: `<p>Вы зарегистрировались в Auxite и разблокировали приветственное золото.</p>
${highlight("Пройдите KYC-верификацию, чтобы <strong>активировать ваши 5 AUXG приветственного золота</strong> и получить полный доступ к платформе. Ваше золото доступно для использования внутри платформы.")}
<p>Верификация занимает менее 2 минут. Вам понадобится только действующий документ.</p>`,
    ctaText: "АКТИВИРОВАТЬ ЗОЛОТО",
    ctaUrl: VAULT_URL,
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// DAY 5 — MARKET HOOK
// ══════════════════════════════════════════════════════════════════════════════

const day5Content: Record<string, DripContent> = {
  en: {
    subject: "Gold Prices Are Moving — Start Your Vault",
    title: "The Market Is Moving",
    body: `<p>Precious metals markets are active. Gold, Silver, Platinum and Palladium are available for allocation 24/7 on Auxite.</p>
${highlight("Start with any amount. Each token represents <strong>1 gram of physically allocated, insured bullion</strong> stored in secure custody.")}
<p>Fund your vault with crypto (ETH, BTC, USDT, USDC) and allocate to metals in seconds.</p>`,
    ctaText: "START NOW",
    ctaUrl: VAULT_URL,
  },
  tr: {
    subject: "Altın Fiyatları Hareket Ediyor — Kasanızı Başlatın",
    title: "Piyasa Hareket Halinde",
    body: `<p>Kıymetli metal piyasaları aktif. Altın, Gümüş, Platin ve Paladyum Auxite'de 7/24 tahsis için hazır.</p>
${highlight("Herhangi bir miktarla başlayın. Her token, güvenli saklama koşullarında tutulan <strong>1 gram fiziksel, sigortalı külçeyi</strong> temsil eder.")}
<p>Kasanızı kripto ile (ETH, BTC, USDT, USDC) fonlayın ve saniyeler içinde metallere tahsis edin.</p>`,
    ctaText: "ŞİMDİ BAŞLA",
    ctaUrl: VAULT_URL,
  },
  de: {
    subject: "Goldpreise bewegen sich — Starten Sie Ihren Tresor",
    title: "Der Markt bewegt sich",
    body: `<p>Die Edelmetallmärkte sind aktiv. Gold, Silber, Platin und Palladium stehen auf Auxite rund um die Uhr zur Verfügung.</p>
${highlight("Beginnen Sie mit jedem Betrag. Jeder Token repräsentiert <strong>1 Gramm physisch zugewiesenes, versichertes Edelmetall</strong> in sicherer Verwahrung.")}
<p>Finanzieren Sie Ihren Tresor mit Krypto (ETH, BTC, USDT, USDC) und weisen Sie in Sekunden Metalle zu.</p>`,
    ctaText: "JETZT STARTEN",
    ctaUrl: VAULT_URL,
  },
  fr: {
    subject: "Les prix de l'or bougent — Ouvrez votre coffre",
    title: "Le marché est en mouvement",
    body: `<p>Les marchés des métaux précieux sont actifs. Or, Argent, Platine et Palladium sont disponibles 24h/24 sur Auxite.</p>
${highlight("Commencez avec n'importe quel montant. Chaque token représente <strong>1 gramme de lingot physiquement alloué et assuré</strong> en dépôt sécurisé.")}
<p>Alimentez votre coffre en crypto (ETH, BTC, USDT, USDC) et allouez aux métaux en quelques secondes.</p>`,
    ctaText: "COMMENCER",
    ctaUrl: VAULT_URL,
  },
  ar: {
    subject: "أسعار الذهب تتحرك — ابدأ خزنتك",
    title: "السوق يتحرك",
    body: `<p>أسواق المعادن الثمينة نشطة. الذهب والفضة والبلاتين والبلاديوم متاحة على مدار الساعة في Auxite.</p>
${highlight("ابدأ بأي مبلغ. كل رمز يمثل <strong>غرام واحد من السبائك المخصصة فعلياً والمؤمن عليها</strong> في حفظ آمن.")}
<p>موّل خزنتك بالعملات المشفرة (ETH، BTC، USDT، USDC) وخصص للمعادن في ثوانٍ.</p>`,
    ctaText: "ابدأ الآن",
    ctaUrl: VAULT_URL,
  },
  ru: {
    subject: "Цены на золото меняются — Откройте хранилище",
    title: "Рынок в движении",
    body: `<p>Рынки драгоценных металлов активны. Золото, Серебро, Платина и Палладий доступны для распределения 24/7 на Auxite.</p>
${highlight("Начните с любой суммы. Каждый токен представляет <strong>1 грамм физически выделенного, застрахованного слитка</strong> в безопасном хранилище.")}
<p>Пополните хранилище криптовалютой (ETH, BTC, USDT, USDC) и распределяйте в металлы за секунды.</p>`,
    ctaText: "НАЧАТЬ",
    ctaUrl: VAULT_URL,
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// DAY 7 — DEMO MODE
// ══════════════════════════════════════════════════════════════════════════════

const day7Content: Record<string, DripContent> = {
  en: {
    subject: "Try Auxite Risk-Free — $10,000 Virtual Balance",
    title: "Trade Risk-Free",
    body: `<p>Not ready to commit? Try Auxite Demo Mode with a <strong>$10,000 virtual balance</strong>.</p>
${highlight("Trade with <strong>real-time market prices</strong>. Buy and sell Gold, Silver, Platinum and Palladium — all with zero risk. No deposit required.")}
<p>When you're ready, switch to Live Mode and start building your precious metals portfolio.</p>`,
    ctaText: "TRY DEMO",
    ctaUrl: VAULT_URL,
  },
  tr: {
    subject: "Auxite'i Risksiz Deneyin — 10.000$ Sanal Bakiye",
    title: "Risksiz İşlem Yapın",
    body: `<p>Henüz hazır değil misiniz? <strong>10.000$ sanal bakiye</strong> ile Auxite Demo Modunu deneyin.</p>
${highlight("<strong>Gerçek zamanlı piyasa fiyatlarıyla</strong> işlem yapın. Altın, Gümüş, Platin ve Paladyum alın satın — tamamen risksiz. Yatırım gerekmez.")}
<p>Hazır olduğunuzda Canlı Moda geçin ve kıymetli metal portföyünüzü oluşturmaya başlayın.</p>`,
    ctaText: "DEMOYU DENE",
    ctaUrl: VAULT_URL,
  },
  de: {
    subject: "Testen Sie Auxite risikofrei — 10.000$ virtuelles Guthaben",
    title: "Risikofrei handeln",
    body: `<p>Noch nicht bereit? Testen Sie den Auxite Demo-Modus mit einem <strong>virtuellen Guthaben von 10.000$</strong>.</p>
${highlight("Handeln Sie mit <strong>Echtzeit-Marktpreisen</strong>. Kaufen und verkaufen Sie Gold, Silber, Platin und Palladium — völlig risikofrei. Keine Einzahlung erforderlich.")}
<p>Wenn Sie bereit sind, wechseln Sie in den Live-Modus und beginnen Sie mit dem Aufbau Ihres Edelmetall-Portfolios.</p>`,
    ctaText: "DEMO TESTEN",
    ctaUrl: VAULT_URL,
  },
  fr: {
    subject: "Essayez Auxite sans risque — 10 000$ de solde virtuel",
    title: "Tradez sans risque",
    body: `<p>Pas encore prêt ? Essayez le Mode Démo d'Auxite avec un <strong>solde virtuel de 10 000$</strong>.</p>
${highlight("Tradez avec les <strong>prix du marché en temps réel</strong>. Achetez et vendez Or, Argent, Platine et Palladium — sans aucun risque. Aucun dépôt requis.")}
<p>Quand vous serez prêt, passez en Mode Live et commencez à construire votre portefeuille de métaux précieux.</p>`,
    ctaText: "ESSAYER LA DÉMO",
    ctaUrl: VAULT_URL,
  },
  ar: {
    subject: "جرّب Auxite بدون مخاطر — رصيد افتراضي 10,000$",
    title: "تداول بدون مخاطر",
    body: `<p>لست مستعداً بعد؟ جرّب وضع العرض التوضيحي في Auxite برصيد افتراضي <strong>10,000$</strong>.</p>
${highlight("تداول بـ<strong>أسعار السوق في الوقت الفعلي</strong>. اشترِ وبع الذهب والفضة والبلاتين والبلاديوم — بدون أي مخاطر. لا يلزم إيداع.")}
<p>عندما تكون مستعداً، انتقل إلى الوضع المباشر وابدأ ببناء محفظتك من المعادن الثمينة.</p>`,
    ctaText: "جرّب العرض",
    ctaUrl: VAULT_URL,
  },
  ru: {
    subject: "Попробуйте Auxite без риска — Виртуальный баланс $10,000",
    title: "Торгуйте без риска",
    body: `<p>Не готовы? Попробуйте демо-режим Auxite с <strong>виртуальным балансом $10,000</strong>.</p>
${highlight("Торгуйте по <strong>рыночным ценам в реальном времени</strong>. Покупайте и продавайте Золото, Серебро, Платину и Палладий — без риска. Депозит не требуется.")}
<p>Когда будете готовы, переключитесь на Live-режим и начните формировать портфель драгоценных металлов.</p>`,
    ctaText: "ПОПРОБОВАТЬ ДЕМО",
    ctaUrl: VAULT_URL,
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// DAY 14 — URGENCY / BONUS EXPIRING
// ══════════════════════════════════════════════════════════════════════════════

const day14Content: Record<string, DripContent> = {
  en: {
    subject: "Your Welcome Gold Expires Soon — Activate Now",
    title: "Don't Miss Your Gold",
    body: `<p>It's been two weeks since you joined Auxite. Your <strong>5 AUXG Welcome Gold</strong> is waiting to be activated.</p>
${highlight("Complete KYC verification to <strong>activate your Welcome Gold</strong> and unlock full platform access. Add funds to grow your position beyond your welcome gold.")}
<p>Once verified, you'll also unlock:</p>
<ul style="color:#444;font-size:13px;line-height:2">
  <li><strong>2% deposit bonus</strong> in metal credits</li>
  <li><strong>Structured Yield</strong> — earn on your metals</li>
  <li><strong>Full trading</strong> — buy, sell, convert all metals</li>
</ul>`,
    ctaText: "ACTIVATE GOLD",
    ctaUrl: VAULT_URL,
  },
  tr: {
    subject: "Hoş Geldin Altınınızın Süresi Doluyor — Şimdi Aktive Edin",
    title: "Altınınızı Kaçırmayın",
    body: `<p>Auxite'e katılmanızın üzerinden iki hafta geçti. <strong>5 AUXG Hoş Geldin Altınız</strong> aktive edilmeyi bekliyor.</p>
${highlight("KYC doğrulamasını tamamlayarak <strong>Hoş Geldin Altınınızı aktive edin</strong> ve platformun tüm özelliklerine erişin. Yatırım yaparak pozisyonunuzu büyütün.")}
<p>Doğrulandıktan sonra ayrıca şunların kilidini açarsınız:</p>
<ul style="color:#444;font-size:13px;line-height:2">
  <li>Metal kredilerinde <strong>%2 yatırım bonusu</strong></li>
  <li><strong>Yapılandırılmış Getiri</strong> — metallerinizden kazanç elde edin</li>
  <li><strong>Tam ticaret</strong> — tüm metalleri alın, satın, dönüştürün</li>
</ul>`,
    ctaText: "ALTINI AKTİVE ET",
    ctaUrl: VAULT_URL,
  },
  de: {
    subject: "Ihr Willkommensgold läuft bald ab — Jetzt aktivieren",
    title: "Verpassen Sie Ihr Gold nicht",
    body: `<p>Es sind zwei Wochen seit Ihrer Registrierung bei Auxite vergangen. Ihre <strong>5 AUXG Willkommensgold</strong> wartet auf Aktivierung.</p>
${highlight("Schließen Sie die KYC-Verifizierung ab, um <strong>Ihr Willkommensgold zu aktivieren</strong> und vollen Zugang zur Plattform zu erhalten. Zahlen Sie ein, um Ihre Position auszubauen.")}
<p>Nach der Verifizierung schalten Sie außerdem frei:</p>
<ul style="color:#444;font-size:13px;line-height:2">
  <li><strong>2% Einzahlungsbonus</strong> in Metallguthaben</li>
  <li><strong>Strukturierte Rendite</strong> — verdienen Sie mit Ihren Metallen</li>
  <li><strong>Voller Handel</strong> — kaufen, verkaufen, konvertieren Sie alle Metalle</li>
</ul>`,
    ctaText: "GOLD AKTIVIEREN",
    ctaUrl: VAULT_URL,
  },
  fr: {
    subject: "Votre Or de Bienvenue expire bientôt — Activez maintenant",
    title: "Ne manquez pas votre Or",
    body: `<p>Cela fait deux semaines que vous avez rejoint Auxite. Vos <strong>5 AUXG d'Or de Bienvenue</strong> attendent d'être activés.</p>
${highlight("Complétez la vérification KYC pour <strong>activer votre Or de Bienvenue</strong> et débloquer l'accès complet à la plateforme. Ajoutez des fonds pour développer votre position.")}
<p>Une fois vérifié, vous débloquerez également :</p>
<ul style="color:#444;font-size:13px;line-height:2">
  <li><strong>Bonus de dépôt de 2%</strong> en crédits métal</li>
  <li><strong>Rendement Structuré</strong> — gagnez sur vos métaux</li>
  <li><strong>Trading complet</strong> — achetez, vendez, convertissez tous les métaux</li>
</ul>`,
    ctaText: "ACTIVER L'OR",
    ctaUrl: VAULT_URL,
  },
  ar: {
    subject: "ذهب الترحيب سينتهي قريباً — فعّله الآن",
    title: "لا تفوّت ذهبك",
    body: `<p>مرّ أسبوعان منذ انضمامك إلى Auxite. <strong>5 AUXG ذهب الترحيب</strong> في انتظار التفعيل.</p>
${highlight("أكمل التحقق من هويتك لـ<strong>تفعيل ذهب الترحيب</strong> وفتح الوصول الكامل للمنصة. أضف الأموال لتوسيع مركزك.")}
<p>بعد التحقق، ستفتح أيضاً:</p>
<ul style="color:#444;font-size:13px;line-height:2;direction:rtl;text-align:right">
  <li><strong>مكافأة إيداع 2%</strong> في اعتمادات المعادن</li>
  <li><strong>العائد المهيكل</strong> — اربح من معادنك</li>
  <li><strong>تداول كامل</strong> — اشترِ وبع وحوّل جميع المعادن</li>
</ul>`,
    ctaText: "فعّل الذهب",
    ctaUrl: VAULT_URL,
  },
  ru: {
    subject: "Ваше приветственное золото скоро истечёт — Активируйте сейчас",
    title: "Не упустите золото",
    body: `<p>Прошло две недели с момента вашей регистрации в Auxite. Ваши <strong>5 AUXG приветственного золота</strong> ждут активации.</p>
${highlight("Пройдите KYC-верификацию, чтобы <strong>активировать приветственное золото</strong> и получить полный доступ к платформе. Пополните счёт, чтобы расширить свою позицию.")}
<p>После верификации вы также разблокируете:</p>
<ul style="color:#444;font-size:13px;line-height:2">
  <li><strong>2% бонус на депозит</strong> в металлических кредитах</li>
  <li><strong>Структурированная доходность</strong> — зарабатывайте на металлах</li>
  <li><strong>Полный трейдинг</strong> — покупайте, продавайте, конвертируйте все металлы</li>
</ul>`,
    ctaText: "АКТИВИРОВАТЬ ЗОЛОТО",
    ctaUrl: VAULT_URL,
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// STAGE CONFIG & EXPORT
// ══════════════════════════════════════════════════════════════════════════════

const stageContentMap: Record<DripStage, Record<string, DripContent>> = {
  day3_kyc: day3Content,
  day5_market: day5Content,
  day14_urgency: day14Content,
};

export const DRIP_SCHEDULE: { stage: DripStage; daysSinceRegistration: number }[] = [
  { stage: "day3_kyc", daysSinceRegistration: 3 },
  { stage: "day5_market", daysSinceRegistration: 5 },
  { stage: "day14_urgency", daysSinceRegistration: 14 },
];

/**
 * Get a drip email for a given stage and language.
 */
export function getDripEmail(stage: DripStage, language: string): DripEmail {
  const contentMap = stageContentMap[stage];
  const content = contentMap[language] || contentMap.en;

  const html = generateDripEmailHTML({
    title: content.title,
    content: content.body + cta(content.ctaUrl, content.ctaText),
    language: language || "en",
  });

  return {
    subject: content.subject,
    html,
  };
}
