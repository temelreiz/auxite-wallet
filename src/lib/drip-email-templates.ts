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

export type DripStage = "day3_kyc" | "day5_market" | "day7_demo" | "day14_urgency";

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
    subject: "Complete Verification — Earn 10 AUXS",
    title: "You're Almost There",
    body: `<p>You registered with Auxite but haven't completed your verification yet.</p>
${highlight("Complete KYC verification and deposit <strong>$100 or more</strong> to receive your <strong>10 AUXS Welcome Bonus</strong>. Liquidity Credits unlock after 30 days or 5x trading volume.")}
<p>The process takes less than 2 minutes. All you need is a valid ID document.</p>`,
    ctaText: "VERIFY NOW",
    ctaUrl: VAULT_URL,
  },
  tr: {
    subject: "Doğrulamayı Tamamlayın — 10 AUXS Kazanın",
    title: "Neredeyse Tamam",
    body: `<p>Auxite'e kayıt oldunuz ancak doğrulamanızı henüz tamamlamadınız.</p>
${highlight("KYC doğrulamasını tamamlayın ve <strong>100$ veya üzeri</strong> yatırım yaparak <strong>10 AUXS Hoş Geldin Bonusu</strong> kazanın. Likidite Kredileri 30 gün sonra veya 5x işlem hacmiyle açılır.")}
<p>İşlem 2 dakikadan kısa sürer. Tek ihtiyacınız geçerli bir kimlik belgesi.</p>`,
    ctaText: "ŞİMDİ DOĞRULA",
    ctaUrl: VAULT_URL,
  },
  de: {
    subject: "Verifizierung abschließen — 10 AUXS verdienen",
    title: "Fast geschafft",
    body: `<p>Sie haben sich bei Auxite registriert, aber Ihre Verifizierung noch nicht abgeschlossen.</p>
${highlight("Schließen Sie die KYC-Verifizierung ab und zahlen Sie <strong>100$ oder mehr</strong> ein, um Ihren <strong>10 AUXS Willkommensbonus</strong> zu erhalten. Liquiditätsguthaben werden nach 30 Tagen oder 5-fachem Handelsvolumen freigeschaltet.")}
<p>Der Vorgang dauert weniger als 2 Minuten. Sie benötigen lediglich ein gültiges Ausweisdokument.</p>`,
    ctaText: "JETZT VERIFIZIEREN",
    ctaUrl: VAULT_URL,
  },
  fr: {
    subject: "Complétez la vérification — Gagnez 10 AUXS",
    title: "Vous y êtes presque",
    body: `<p>Vous vous êtes inscrit sur Auxite mais n'avez pas encore complété votre vérification.</p>
${highlight("Complétez la vérification KYC et déposez <strong>100$ ou plus</strong> pour recevoir votre <strong>Bonus de Bienvenue de 10 AUXS</strong>. Les Crédits de Liquidité se débloquent après 30 jours ou 5x volume de trading.")}
<p>Le processus prend moins de 2 minutes. Il vous suffit d'un document d'identité valide.</p>`,
    ctaText: "VÉRIFIER MAINTENANT",
    ctaUrl: VAULT_URL,
  },
  ar: {
    subject: "أكمل التحقق — اربح 10 AUXS",
    title: "أنت على وشك الانتهاء",
    body: `<p>لقد سجلت في Auxite ولكنك لم تكمل التحقق بعد.</p>
${highlight("أكمل التحقق من هويتك (KYC) وأودع <strong>100$ أو أكثر</strong> للحصول على <strong>مكافأة ترحيبية 10 AUXS</strong>. تُفتح اعتمادات السيولة بعد 30 يوماً أو 5 أضعاف حجم التداول.")}
<p>العملية تستغرق أقل من دقيقتين. كل ما تحتاجه هو وثيقة هوية صالحة.</p>`,
    ctaText: "تحقق الآن",
    ctaUrl: VAULT_URL,
  },
  ru: {
    subject: "Завершите верификацию — Получите 10 AUXS",
    title: "Почти готово",
    body: `<p>Вы зарегистрировались в Auxite, но ещё не прошли верификацию.</p>
${highlight("Пройдите KYC-верификацию и внесите депозит от <strong>100$</strong> для получения <strong>Приветственного бонуса 10 AUXS</strong>. Кредиты ликвидности разблокируются через 30 дней или при 5-кратном торговом объёме.")}
<p>Процесс занимает менее 2 минут. Вам понадобится только действующий документ, удостоверяющий личность.</p>`,
    ctaText: "ВЕРИФИЦИРОВАТЬ",
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
    subject: "Your Welcome Bonus Is Expiring Soon",
    title: "Don't Miss Your Bonus",
    body: `<p>It's been two weeks since you joined Auxite. Your <strong>10 AUXS Welcome Bonus</strong> offer is expiring soon.</p>
${highlight("Complete KYC verification and make your first deposit of <strong>$100 or more</strong> before the offer expires. This is a limited-time offer for new members.")}
<p>Once verified, you'll also unlock:</p>
<ul style="color:#444;font-size:13px;line-height:2">
  <li><strong>2% deposit bonus</strong> in metal credits</li>
  <li><strong>0.5% referral bonus</strong> on referred deposits</li>
  <li><strong>Structured Yield</strong> — lease metals to institutions</li>
</ul>`,
    ctaText: "CLAIM BONUS",
    ctaUrl: VAULT_URL,
  },
  tr: {
    subject: "Hoş Geldin Bonusunuzun Süresi Doluyor",
    title: "Bonusunuzu Kaçırmayın",
    body: `<p>Auxite'e katılmanızın üzerinden iki hafta geçti. <strong>10 AUXS Hoş Geldin Bonusu</strong> teklifinizin süresi yakında doluyor.</p>
${highlight("Teklif sona ermeden önce KYC doğrulamasını tamamlayın ve <strong>100$ veya üzeri</strong> ilk yatırımınızı yapın. Bu, yeni üyeler için sınırlı süreli bir tekliftir.")}
<p>Doğrulandıktan sonra ayrıca şunların kilidini açarsınız:</p>
<ul style="color:#444;font-size:13px;line-height:2">
  <li>Metal kredilerinde <strong>%2 yatırım bonusu</strong></li>
  <li>Yönlendirilen yatırımlarda <strong>%0,5 referans bonusu</strong></li>
  <li><strong>Yapılandırılmış Getiri</strong> — metalleri kurumlara kiralayın</li>
</ul>`,
    ctaText: "BONUSU AL",
    ctaUrl: VAULT_URL,
  },
  de: {
    subject: "Ihr Willkommensbonus läuft bald ab",
    title: "Verpassen Sie Ihren Bonus nicht",
    body: `<p>Es sind zwei Wochen seit Ihrer Registrierung bei Auxite vergangen. Ihr Angebot für den <strong>10 AUXS Willkommensbonus</strong> läuft bald ab.</p>
${highlight("Schließen Sie die KYC-Verifizierung ab und tätigen Sie Ihre erste Einzahlung von <strong>100$ oder mehr</strong>, bevor das Angebot abläuft. Dies ist ein zeitlich begrenztes Angebot für neue Mitglieder.")}
<p>Nach der Verifizierung schalten Sie außerdem frei:</p>
<ul style="color:#444;font-size:13px;line-height:2">
  <li><strong>2% Einzahlungsbonus</strong> in Metallguthaben</li>
  <li><strong>0,5% Empfehlungsbonus</strong> auf empfohlene Einzahlungen</li>
  <li><strong>Strukturierte Rendite</strong> — Metalle an Institutionen leasen</li>
</ul>`,
    ctaText: "BONUS SICHERN",
    ctaUrl: VAULT_URL,
  },
  fr: {
    subject: "Votre bonus de bienvenue expire bientôt",
    title: "Ne manquez pas votre bonus",
    body: `<p>Cela fait deux semaines que vous avez rejoint Auxite. Votre offre de <strong>Bonus de Bienvenue de 10 AUXS</strong> expire bientôt.</p>
${highlight("Complétez la vérification KYC et effectuez votre premier dépôt de <strong>100$ ou plus</strong> avant l'expiration de l'offre. C'est une offre limitée pour les nouveaux membres.")}
<p>Une fois vérifié, vous débloquerez également :</p>
<ul style="color:#444;font-size:13px;line-height:2">
  <li><strong>Bonus de dépôt de 2%</strong> en crédits métal</li>
  <li><strong>Bonus de parrainage de 0,5%</strong> sur les dépôts parrainés</li>
  <li><strong>Rendement Structuré</strong> — louez vos métaux à des institutions</li>
</ul>`,
    ctaText: "RÉCLAMER LE BONUS",
    ctaUrl: VAULT_URL,
  },
  ar: {
    subject: "مكافأة الترحيب الخاصة بك ستنتهي قريباً",
    title: "لا تفوّت مكافأتك",
    body: `<p>مرّ أسبوعان منذ انضمامك إلى Auxite. عرض <strong>مكافأة الترحيب 10 AUXS</strong> سينتهي قريباً.</p>
${highlight("أكمل التحقق من هويتك وقم بأول إيداع بقيمة <strong>100$ أو أكثر</strong> قبل انتهاء العرض. هذا عرض محدود المدة للأعضاء الجدد.")}
<p>بعد التحقق، ستفتح أيضاً:</p>
<ul style="color:#444;font-size:13px;line-height:2;direction:rtl;text-align:right">
  <li><strong>مكافأة إيداع 2%</strong> في اعتمادات المعادن</li>
  <li><strong>مكافأة إحالة 0.5%</strong> على الإيداعات المُحالة</li>
  <li><strong>العائد المهيكل</strong> — أجّر المعادن للمؤسسات</li>
</ul>`,
    ctaText: "احصل على المكافأة",
    ctaUrl: VAULT_URL,
  },
  ru: {
    subject: "Ваш приветственный бонус скоро истекает",
    title: "Не упустите бонус",
    body: `<p>Прошло две недели с момента вашей регистрации в Auxite. Срок действия предложения <strong>Приветственного бонуса 10 AUXS</strong> скоро истечёт.</p>
${highlight("Пройдите KYC-верификацию и внесите первый депозит от <strong>100$</strong> до истечения предложения. Это предложение ограничено по времени для новых участников.")}
<p>После верификации вы также разблокируете:</p>
<ul style="color:#444;font-size:13px;line-height:2">
  <li><strong>2% бонус на депозит</strong> в металлических кредитах</li>
  <li><strong>0,5% реферальный бонус</strong> от депозитов рефералов</li>
  <li><strong>Структурированная доходность</strong> — сдавайте металлы институциям</li>
</ul>`,
    ctaText: "ПОЛУЧИТЬ БОНУС",
    ctaUrl: VAULT_URL,
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// STAGE CONFIG & EXPORT
// ══════════════════════════════════════════════════════════════════════════════

const stageContentMap: Record<DripStage, Record<string, DripContent>> = {
  day3_kyc: day3Content,
  day5_market: day5Content,
  day7_demo: day7Content,
  day14_urgency: day14Content,
};

export const DRIP_SCHEDULE: { stage: DripStage; daysSinceRegistration: number }[] = [
  { stage: "day3_kyc", daysSinceRegistration: 3 },
  { stage: "day5_market", daysSinceRegistration: 5 },
  { stage: "day7_demo", daysSinceRegistration: 7 },
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
