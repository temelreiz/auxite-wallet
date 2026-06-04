// src/lib/email-templates.ts
// Email campaign templates in all supported languages

const HEADER = `<div style="font-family:Georgia,serif;background:#f5f5f5;padding:20px;color:#1a1a1a"><div style="max-width:600px;margin:0 auto;background:#fff"><div style="height:3px;background:#C5A55A"></div><div style="padding:28px 30px"><img src="https://vault.auxite.io/auxite-logo-new.png" alt="Auxite" width="120" style="display:block;width:120px;height:auto;margin-bottom:20px"/>`;
const FOOTER = `<p style="font-size:10px;color:#999;margin-top:20px;font-style:italic">This message serves as an operational communication. Please do not reply.</p></div><div style="padding:16px 30px;border-top:1px solid #e5e5e5;text-align:center"><p style="font-size:9px;color:#aaa;margin:4px 0">Aurum Ledger Ltd &middot; Hong Kong</p></div><div style="height:2px;background:#C5A55A"></div></div></div>`;

function wrap(body: string): string {
  return HEADER + body + FOOTER;
}

function step(num: string, title: string, desc: string) {
  return `<tr><td style="padding:8px 0;vertical-align:top;width:30px;font-size:13px;font-weight:700;color:#C5A55A">${num}.</td><td style="padding:8px 0;font-size:13px;color:#444;line-height:1.7"><strong>${title}</strong> — ${desc}</td></tr>`;
}

function cta(url: string, text: string) {
  return `<a href="${url}" style="display:inline-block;background:#1a1a1a;color:#fff!important;padding:12px 24px;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:1px;margin:16px 0">${text}</a>`;
}

function bonus(title: string, text: string) {
  return `<div style="background:#fafafa;border-left:3px solid #C5A55A;padding:14px 18px;margin:18px 0"><p style="font-size:11px;letter-spacing:1px;color:#888;margin:0 0 6px">${title}</p><p style="font-size:13px;color:#444;margin:0;line-height:1.7">${text}</p></div>`;
}

// ── Yield promo visual ───────────────────────────────────────────────────────
function yieldHero(sub: string, headline: string) {
  return `<div style="background:linear-gradient(135deg,#C5A55A 0%,#9c7d39 100%);border-radius:6px;padding:32px 24px;text-align:center;margin:4px 0 20px">
    <p style="font-size:11px;letter-spacing:2px;color:#fff;opacity:.9;margin:0 0 8px;text-transform:uppercase">${sub}</p>
    <p style="font-size:40px;line-height:1.05;color:#fff;font-weight:700;margin:0">${headline}</p>
  </div>`;
}
function metalCell(sym: string, name: string, apy: string) {
  return `<td style="padding:12px 6px;border:1px solid #eee;width:25%;text-align:center;vertical-align:top">
    <div style="font-size:20px;font-weight:700;color:#C5A55A">${sym}</div>
    <div style="font-size:10px;color:#999;letter-spacing:.5px">${name}</div>
    <div style="font-size:15px;font-weight:700;color:#1a1a1a;margin-top:5px">${apy}</div></td>`;
}
const METAL_GRID = `<table role="presentation" width="100%" style="border-collapse:collapse;margin:14px 0 18px"><tr>
  ${metalCell("Au", "Gold", "2.53%")}${metalCell("Ag", "Silver", "2.23%")}${metalCell("Pt", "Platinum", "3.03%")}${metalCell("Pd", "Palladium", "2.83%")}
</tr></table>`;

const YIELD_PROMO: Record<string, { subject: string; sub: string; headline: string; intro: string; gridLabel: string; note: string; cta: string }> = {
  en: { subject: "Earn up to ~3% a year on your precious metals", sub: "Earn on your metals", headline: "Up to ~3% APY", intro: "Your gold, silver, platinum and palladium can now work for you. Stake your metals on Auxite for fixed-term yield — paid in additional metal.", gridLabel: "Current annual yield (12-month term)", note: "Yields are lease-rate based and vary by metal and term (3 / 6 / 12 months). Simply holding does not accrue yield — staking does.", cta: "START EARNING" },
  tr: { subject: "Değerli metallerinizden yılda ~%3'e varan getiri", sub: "Metalleriniz kazansın", headline: "~%3'e varan getiri", intro: "Altın, gümüş, platin ve paladyumunuz artık size çalışabilir. Auxite'te metallerinizi stake ederek sabit vadeli getiri kazanın — ek metal olarak ödenir.", gridLabel: "Güncel yıllık getiri (12 aylık vade)", note: "Getiriler lease-rate bazlıdır; metale ve vadeye (3 / 6 / 12 ay) göre değişir. Sadece tutmak getiri vermez — stake etmek verir.", cta: "GETİRİ KAZAN" },
  de: { subject: "Bis zu ~3% Jahresrendite auf Ihre Edelmetalle", sub: "Mit Ihren Metallen verdienen", headline: "Bis zu ~3% p.a.", intro: "Ihr Gold, Silber, Platin und Palladium kann jetzt für Sie arbeiten. Staken Sie Ihre Metalle auf Auxite für eine feste Rendite — ausgezahlt in zusätzlichem Metall.", gridLabel: "Aktuelle Jahresrendite (12 Monate)", note: "Renditen sind lease-rate-basiert und variieren je nach Metall und Laufzeit (3 / 6 / 12 Monate). Reines Halten bringt keine Rendite — Staken schon.", cta: "JETZT VERDIENEN" },
  fr: { subject: "Jusqu'à ~3% par an sur vos métaux précieux", sub: "Faites fructifier vos métaux", headline: "Jusqu'à ~3% / an", intro: "Votre or, argent, platine et palladium peuvent désormais travailler pour vous. Stakez vos métaux sur Auxite pour un rendement à terme fixe — versé en métal supplémentaire.", gridLabel: "Rendement annuel actuel (terme 12 mois)", note: "Les rendements sont basés sur les taux de lease et varient selon le métal et le terme (3 / 6 / 12 mois). La simple détention ne génère pas de rendement — le staking oui.", cta: "COMMENCER" },
  ar: { subject: "اربح حتى ~3% سنويًا على معادنك الثمينة", sub: "اربح من معادنك", headline: "حتى ~3% سنويًا", intro: "ذهبك وفضتك وبلاتينك وبالاديومك يمكن أن تعمل لصالحك الآن. قم بعمل ستيك لمعادنك على Auxite للحصول على عائد بأجل ثابت — يُدفع بمعدن إضافي.", gridLabel: "العائد السنوي الحالي (مدة 12 شهرًا)", note: "العوائد مبنية على معدلات الـ lease وتختلف حسب المعدن والمدة (3 / 6 / 12 شهرًا). مجرد الاحتفاظ لا يحقق عائدًا — الستيك يحقق.", cta: "ابدأ الربح" },
  ru: { subject: "До ~3% годовых на ваши драгоценные металлы", sub: "Зарабатывайте на металлах", headline: "До ~3% годовых", intro: "Ваше золото, серебро, платина и палладий теперь могут работать на вас. Стейкайте металлы на Auxite для фиксированного дохода — выплачивается дополнительным металлом.", gridLabel: "Текущая годовая доходность (срок 12 мес.)", note: "Доходность основана на lease-ставках и зависит от металла и срока (3 / 6 / 12 мес.). Простое хранение не приносит доход — стейкинг приносит.", cta: "НАЧАТЬ" },
};

export function getYieldPromoTemplate(lang: string): { subject: string; html: string } {
  const c = YIELD_PROMO[(lang || "en").toLowerCase()] || YIELD_PROMO.en;
  const rtl = (lang || "").toLowerCase() === "ar";
  const align = rtl ? "right" : "left";
  const html = wrap(
    yieldHero(c.sub, c.headline) +
    `<p style="font-size:14px;color:#1a1a1a;font-weight:600;margin:0 0 12px;text-align:${align}"${rtl ? ' dir="rtl"' : ""}>${c.intro}</p>` +
    `<p style="font-size:10px;letter-spacing:1px;color:#888;text-transform:uppercase;margin:0 0 4px;text-align:center">${c.gridLabel}</p>` +
    METAL_GRID +
    `<p style="font-size:12px;color:#666;line-height:1.7;margin:0 0 4px;text-align:${align}"${rtl ? ' dir="rtl"' : ""}>${c.note}</p>` +
    `<div style="text-align:center">${cta("https://vault.auxite.io/open?to=yield", c.cta)}</div>`
  );
  return { subject: c.subject, html };
}

export const emailTemplates: Record<string, { subject: string; html: string }> = {
  // ═══════════════════════════════════════════════════════════════
  // EXISTING TEMPLATES
  // ═══════════════════════════════════════════════════════════════
  kycReminder: {
    subject: "Complete Your Verification — Earn 5 AUXG Bonus",
    html: wrap(`<p style="font-size:13px;color:#444;line-height:1.7">Complete your identity verification (KYC) and make your first deposit of $100 or more to receive <strong>5 AUXG Welcome Bonus</strong>.</p><p style="font-size:13px;color:#444;line-height:1.7">Your bonus credits will unlock after 30 days or upon reaching 5x trading volume.</p>${cta("https://vault.auxite.io", "VERIFY NOW")}`),
  },
  welcomeBonus: {
    subject: "Welcome to Auxite — Your 5 AUXG Bonus Awaits",
    html: wrap(`<p style="font-size:13px;color:#444;line-height:1.7">Thank you for joining Auxite. You are now enrolled in our <strong>Liquidity Credits Programme</strong>.</p><p style="font-size:13px;color:#444;line-height:1.7"><strong>Welcome Bonus:</strong> 5 AUXG upon KYC + $100 deposit<br/><strong>Deposit Bonus:</strong> 2% in metal credits<br/><strong>Referral Bonus:</strong> 0.5% of referred deposit</p>${cta("https://vault.auxite.io", "ACCESS YOUR VAULT")}`),
  },
  marketUpdate: {
    subject: "Precious Metals Market Update — Auxite",
    html: wrap(`<h2 style="font-size:16px;color:#1a1a1a;font-weight:400;margin:0 0 16px">Market Update</h2><p style="font-size:13px;color:#444;line-height:1.7">Check the latest precious metals prices on Auxite. Gold, Silver, Platinum and Palladium are available 24/7 for allocation.</p>${cta("https://vault.auxite.io", "VIEW PRICES")}`),
  },

  // ═══════════════════════════════════════════════════════════════
  // WELCOME EMAILS - ALL LANGUAGES
  // ═══════════════════════════════════════════════════════════════
  welcomeEN: {
    subject: "Welcome to Auxite — Your Precious Metals Vault",
    html: wrap(`
      <p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 16px">Welcome to Auxite</p>
      <p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 20px">Your gateway to institutional-grade precious metals investment.</p>
      <p style="font-size:12px;letter-spacing:1.5px;color:#888;margin:0 0 12px;font-weight:600">HOW IT WORKS</p>
      <table style="width:100%;border-collapse:collapse">
        ${step("1", "Deposit", "Fund your vault with crypto (ETH, BTC, USDT, USDC).")}
        ${step("2", "Allocate", "Convert to tokenized precious metals: Gold (AUXG), Silver (AUXS), Platinum (AUXPT), Palladium (AUXPD). Each token = 1 gram of physically allocated, insured bullion.")}
        ${step("3", "Trade", "Buy and sell metals 24/7. All trades settle instantly against live market prices.")}
        ${step("4", "Structured Yield", "Lease your allocated metals to verified institutional counterparties through our Yield Architecture. Earn periodic returns (paid in the same metal or USD equivalent) while your metal remains fully allocated and insured in custody. Lease terms range from 90 to 365 days.")}
        ${step("5", "Redeem", "Convert back to crypto or request physical delivery at any time.")}
      </table>
      ${bonus("LIMITED TIME OFFER", "Complete KYC verification + deposit $100 minimum to receive <strong>5 AUXG Welcome Bonus</strong>. Liquidity Credits unlock after 30 days or 5x trading volume.")}
      ${cta("https://vault.auxite.io", "GET STARTED")}
    `),
  },

  welcomeTR: {
    subject: "Auxite'e Hoş Geldiniz — Kıymetli Metal Kasanız",
    html: wrap(`
      <p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 16px">Auxite'e Hoş Geldiniz</p>
      <p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 20px">Kurumsal düzeyde kıymetli metal yatırımının kapısı.</p>
      <p style="font-size:12px;letter-spacing:1.5px;color:#888;margin:0 0 12px;font-weight:600">NASIL ÇALIŞIR</p>
      <table style="width:100%;border-collapse:collapse">
        ${step("1", "Yatırım Yapın", "Kasanızı kripto ile (ETH, BTC, USDT, USDC) fonlayın.")}
        ${step("2", "Tahsis Edin", "Tokenize kıymetli metallere dönüştürün: Altın (AUXG), Gümüş (AUXS), Platin (AUXPT), Paladyum (AUXPD). Her token = 1 gram sigortalı külçe.")}
        ${step("3", "İşlem Yapın", "7/24 metal alın ve satın. Tüm işlemler canlı piyasa fiyatlarından anında gerçekleşir.")}
        ${step("4", "Yapılandırılmış Getiri", "Tahsis edilmiş metallerinizi doğrulanmış kurumsal karşı taraflara Getiri Mimarisi aracılığıyla kiralayın. Metaliniz tam tahsisli ve sigortalı olarak saklamada kalırken periyodik getiri (aynı metal veya USD eşdeğeri) kazanın. Kiralama süreleri 90 ile 365 gün arasındadır.")}
        ${step("5", "Geri Alım", "İstediğiniz zaman kriptoya dönüştürün veya fiziksel teslimat talep edin.")}
      </table>
      ${bonus("SINIRLI SÜRE TEKLİFİ", "KYC doğrulamasını tamamlayın + minimum 100$ yatırım yaparak <strong>5 AUXG Hoş Geldin Bonusu</strong> kazanın. Likidite Kredileri 30 gün sonra veya 5x işlem hacmiyle açılır.")}
      ${cta("https://vault.auxite.io", "BAŞLAYIN")}
    `),
  },

  welcomeFR: {
    subject: "Bienvenue sur Auxite — Votre Coffre-Fort de Métaux Précieux",
    html: wrap(`
      <p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 16px">Bienvenue sur Auxite</p>
      <p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 20px">Votre passerelle vers l'investissement institutionnel en métaux précieux.</p>
      <p style="font-size:12px;letter-spacing:1.5px;color:#888;margin:0 0 12px;font-weight:600">COMMENT ÇA FONCTIONNE</p>
      <table style="width:100%;border-collapse:collapse">
        ${step("1", "Déposez", "Alimentez votre coffre avec des cryptomonnaies (ETH, BTC, USDT, USDC).")}
        ${step("2", "Allouez", "Convertissez en métaux précieux tokenisés : Or (AUXG), Argent (AUXS), Platine (AUXPT), Palladium (AUXPD). Chaque token = 1 gramme de lingot alloué et assuré.")}
        ${step("3", "Négociez", "Achetez et vendez des métaux 24h/24. Toutes les transactions sont réglées instantanément aux prix du marché.")}
        ${step("4", "Rendement Structuré", "Louez vos métaux alloués à des contreparties institutionnelles vérifiées via notre Architecture de Rendement. Percevez des rendements périodiques (payés dans le même métal ou en équivalent USD) pendant que votre métal reste entièrement alloué et assuré en dépôt. Durées de location de 90 à 365 jours.")}
        ${step("5", "Rachat", "Convertissez en crypto ou demandez une livraison physique à tout moment.")}
      </table>
      ${bonus("OFFRE LIMITÉE", "Complétez votre vérification KYC + dépôt minimum de 100$ pour recevoir un <strong>Bonus de Bienvenue de 5 AUXG</strong>. Les Crédits de Liquidité se débloquent après 30 jours ou 5x volume de trading.")}
      ${cta("https://vault.auxite.io", "COMMENCEZ")}
    `),
  },

  welcomeDE: {
    subject: "Willkommen bei Auxite — Ihr Edelmetall-Tresor",
    html: wrap(`
      <p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 16px">Willkommen bei Auxite</p>
      <p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 20px">Ihr Zugang zu institutionellen Edelmetallinvestitionen.</p>
      <p style="font-size:12px;letter-spacing:1.5px;color:#888;margin:0 0 12px;font-weight:600">SO FUNKTIONIERT ES</p>
      <table style="width:100%;border-collapse:collapse">
        ${step("1", "Einzahlen", "Finanzieren Sie Ihren Tresor mit Krypto (ETH, BTC, USDT, USDC).")}
        ${step("2", "Zuweisen", "Konvertieren Sie in tokenisierte Edelmetalle: Gold (AUXG), Silber (AUXS), Platin (AUXPT), Palladium (AUXPD). Jeder Token = 1 Gramm versichertes Edelmetall.")}
        ${step("3", "Handeln", "Kaufen und verkaufen Sie Metalle rund um die Uhr. Alle Transaktionen werden sofort zu Live-Marktpreisen abgewickelt.")}
        ${step("4", "Strukturierte Rendite", "Leasen Sie Ihre zugewiesenen Metalle an verifizierte institutionelle Gegenparteien über unsere Rendite-Architektur. Erzielen Sie periodische Erträge (ausgezahlt im gleichen Metall oder USD-Äquivalent), während Ihr Metall vollständig zugewiesen und versichert in Verwahrung bleibt. Laufzeiten von 90 bis 365 Tagen.")}
        ${step("5", "Einlösung", "Jederzeit in Krypto umwandeln oder physische Lieferung anfordern.")}
      </table>
      ${bonus("ZEITLICH BEGRENZTES ANGEBOT", "KYC-Verifizierung abschließen + Mindesteinzahlung von 100$ für einen <strong>Willkommensbonus von 5 AUXG</strong>. Liquiditätsguthaben werden nach 30 Tagen oder 5-fachem Handelsvolumen freigeschaltet.")}
      ${cta("https://vault.auxite.io", "LOSLEGEN")}
    `),
  },

  welcomeAR: {
    subject: "مرحباً بكم في Auxite — خزنة المعادن الثمينة",
    html: wrap(`
      <p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 16px;direction:rtl;text-align:right">مرحباً بكم في Auxite</p>
      <p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 20px;direction:rtl;text-align:right">بوابتكم للاستثمار المؤسسي في المعادن الثمينة.</p>
      <p style="font-size:12px;letter-spacing:1.5px;color:#888;margin:0 0 12px;font-weight:600;direction:rtl;text-align:right">كيف يعمل النظام</p>
      <table style="width:100%;border-collapse:collapse;direction:rtl;text-align:right">
        ${step("1", "الإيداع", "قم بتمويل خزنتك بالعملات المشفرة (ETH، BTC، USDT، USDC).")}
        ${step("2", "التخصيص", "حوّل إلى معادن ثمينة مرمزة: الذهب (AUXG)، الفضة (AUXS)، البلاتين (AUXPT)، البلاديوم (AUXPD). كل رمز = غرام واحد من السبائك المؤمن عليها.")}
        ${step("3", "التداول", "اشترِ وبع المعادن على مدار الساعة. جميع الصفقات تُنفذ فوراً بأسعار السوق.")}
        ${step("4", "العائد المهيكل", "أجّر معادنك المخصصة لأطراف مؤسسية معتمدة عبر هندسة العوائد. احصل على عوائد دورية (تُدفع بنفس المعدن أو ما يعادله بالدولار) بينما يبقى معدنك مخصصاً بالكامل ومؤمناً عليه في الحفظ. فترات الإيجار من 90 إلى 365 يوماً.")}
        ${step("5", "الاسترداد", "حوّل إلى عملات مشفرة أو اطلب التسليم الفعلي في أي وقت.")}
      </table>
      ${bonus("عرض لفترة محدودة", "أكمل التحقق من هويتك (KYC) + إيداع 100$ كحد أدنى للحصول على <strong>مكافأة ترحيبية 5 AUXG</strong>. تُفتح اعتمادات السيولة بعد 30 يوماً أو 5 أضعاف حجم التداول.")}
      ${cta("https://vault.auxite.io", "ابدأ الآن")}
    `),
  },

  welcomeRU: {
    subject: "Добро пожаловать в Auxite — Ваше хранилище драгоценных металлов",
    html: wrap(`
      <p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 16px">Добро пожаловать в Auxite</p>
      <p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 20px">Ваша платформа для институционального инвестирования в драгоценные металлы.</p>
      <p style="font-size:12px;letter-spacing:1.5px;color:#888;margin:0 0 12px;font-weight:600">КАК ЭТО РАБОТАЕТ</p>
      <table style="width:100%;border-collapse:collapse">
        ${step("1", "Пополнение", "Пополните хранилище криптовалютой (ETH, BTC, USDT, USDC).")}
        ${step("2", "Распределение", "Конвертируйте в токенизированные металлы: Золото (AUXG), Серебро (AUXS), Платина (AUXPT), Палладий (AUXPD). Каждый токен = 1 грамм застрахованного слитка.")}
        ${step("3", "Торговля", "Покупайте и продавайте металлы круглосуточно. Все сделки исполняются мгновенно по рыночным ценам.")}
        ${step("4", "Структурированная доходность", "Сдавайте выделенные металлы верифицированным институциональным контрагентам через нашу Архитектуру Доходности. Получайте периодический доход (выплачиваемый тем же металлом или эквивалентом в USD), пока ваш металл остаётся полностью выделенным и застрахованным на хранении. Сроки аренды от 90 до 365 дней.")}
        ${step("5", "Выкуп", "Конвертируйте обратно в криптовалюту или запросите физическую доставку.")}
      </table>
      ${bonus("ОГРАНИЧЕННОЕ ПРЕДЛОЖЕНИЕ", "Пройдите верификацию KYC + внесите депозит от 100$ для получения <strong>Приветственного бонуса 5 AUXG</strong>. Кредиты ликвидности разблокируются через 30 дней или при 5-кратном торговом объёме.")}
      ${cta("https://vault.auxite.io", "НАЧНИТЕ")}
    `),
  },
};

// Get welcome template by language code
export function getWelcomeTemplate(lang: string): { subject: string; html: string } {
  const langMap: Record<string, string> = {
    en: "welcomeEN",
    tr: "welcomeTR",
    fr: "welcomeFR",
    de: "welcomeDE",
    ar: "welcomeAR",
    ru: "welcomeRU",
  };
  return emailTemplates[langMap[lang] || "welcomeEN"];
}

// ═══════════════════════════════════════════════════════════════
// KYC + AUXG PROMO — multi-language broadcast for stuck-funnel users
// ═══════════════════════════════════════════════════════════════

const kycAuxgPromoEN = {
  subject: "Your vault is ready — 5 AUXG Welcome Bonus awaits",
  html: wrap(`
    <p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 12px">Your vault is open. One step remains.</p>
    <p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 20px">Verify your identity to claim <strong>5 AUXG Welcome Bonus</strong> — 5 grams of physically allocated, LBMA-certified gold.</p>
    <p style="font-size:12px;letter-spacing:1.5px;color:#888;margin:0 0 12px;font-weight:600">VERIFICATION — 60 SECONDS</p>
    <table style="width:100%;border-collapse:collapse">
      ${step("1", "Snap your ID or passport", "Camera-based capture, no upload required.")}
      ${step("2", "Selfie + liveness check", "Quick face scan to verify it's you.")}
      ${step("3", "Approval email", "Typical wait 5-10 minutes.")}
    </table>
    ${bonus("WHY VERIFY", "5 AUXG bonus unlocks on first allocation or $100+ deposit. Plus: $50K/month withdrawal limit, right to physical metal redemption, monthly holding statements.")}
    ${cta("https://vault.auxite.io/kyc-verification", "VERIFY MY IDENTITY")}
    <p style="font-size:11px;color:#888;line-height:1.6;margin:20px 0 0">Limited-time welcome campaign. Bonus credits unlock per programme terms.</p>
  `),
};

const kycAuxgPromoTR = {
  subject: "Kasanız hazır — 5 AUXG Hoş Geldin Bonusu sizi bekliyor",
  html: wrap(`
    <p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 12px">Kasanız açıldı. Bir adım kaldı.</p>
    <p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 20px">Kimliğinizi doğrulayın ve <strong>5 AUXG Hoş Geldin Bonusu</strong> kazanın — 5 gram fiziksel olarak tahsis edilmiş, LBMA sertifikalı altın.</p>
    <p style="font-size:12px;letter-spacing:1.5px;color:#888;margin:0 0 12px;font-weight:600">DOĞRULAMA — 60 SANİYE</p>
    <table style="width:100%;border-collapse:collapse">
      ${step("1", "Kimlik veya pasaport fotoğrafı", "Kameradan çekim, yükleme gerekmez.")}
      ${step("2", "Selfie + canlılık kontrolü", "Sizin olduğunuzu doğrulamak için hızlı yüz tarama.")}
      ${step("3", "Onay e-postası", "Tipik bekleme 5-10 dakika.")}
    </table>
    ${bonus("NEDEN DOĞRULAYIN", "5 AUXG bonus, ilk allocation veya $100+ yatırımda açılır. Ayrıca: aylık $50K withdrawal limiti, fiziksel altın talep hakkı, aylık varlık raporları.")}
    ${cta("https://vault.auxite.io/kyc-verification", "KİMLİĞİMİ DOĞRULA")}
    <p style="font-size:11px;color:#888;line-height:1.6;margin:20px 0 0">Sınırlı süreli hoş geldin kampanyası. Bonus kredileri program koşullarına göre açılır.</p>
  `),
};

const kycAuxgPromoDE = {
  subject: "Ihr Tresor ist bereit — 5 AUXG Willkommensbonus wartet",
  html: wrap(`
    <p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 12px">Ihr Tresor ist eröffnet. Ein Schritt fehlt.</p>
    <p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 20px">Verifizieren Sie Ihre Identität für <strong>5 AUXG Willkommensbonus</strong> — 5 Gramm physisch alloziertes, LBMA-zertifiziertes Gold.</p>
    <p style="font-size:12px;letter-spacing:1.5px;color:#888;margin:0 0 12px;font-weight:600">VERIFIZIERUNG — 60 SEKUNDEN</p>
    <table style="width:100%;border-collapse:collapse">
      ${step("1", "Ausweis oder Reisepass", "Kameraerfassung, kein Upload nötig.")}
      ${step("2", "Selfie + Liveness-Check", "Schneller Gesichtsscan zur Bestätigung.")}
      ${step("3", "Bestätigungs-E-Mail", "Übliche Wartezeit 5-10 Minuten.")}
    </table>
    ${bonus("WARUM VERIFIZIEREN", "5 AUXG Bonus wird mit erster Allokation oder $100+ Einzahlung freigeschaltet. Plus: $50K/Monat Auszahlungslimit, Recht auf physische Auslieferung, monatliche Kontoauszüge.")}
    ${cta("https://vault.auxite.io/kyc-verification", "IDENTITÄT VERIFIZIEREN")}
    <p style="font-size:11px;color:#888;line-height:1.6;margin:20px 0 0">Befristete Willkommenskampagne. Bonus-Guthaben werden gemäß den Programmbedingungen freigegeben.</p>
  `),
};

const kycAuxgPromoFR = {
  subject: "Votre coffre est prêt — Bonus de bienvenue 5 AUXG vous attend",
  html: wrap(`
    <p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 12px">Votre coffre est ouvert. Une étape reste.</p>
    <p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 20px">Vérifiez votre identité pour réclamer le <strong>Bonus de bienvenue 5 AUXG</strong> — 5 grammes d'or physiquement alloué et certifié LBMA.</p>
    <p style="font-size:12px;letter-spacing:1.5px;color:#888;margin:0 0 12px;font-weight:600">VÉRIFICATION — 60 SECONDES</p>
    <table style="width:100%;border-collapse:collapse">
      ${step("1", "Photo de la pièce d'identité", "Capture par caméra, aucun téléchargement requis.")}
      ${step("2", "Selfie + contrôle de vivacité", "Scan facial rapide pour confirmer votre identité.")}
      ${step("3", "E-mail d'approbation", "Attente typique de 5-10 minutes.")}
    </table>
    ${bonus("POURQUOI VÉRIFIER", "Le bonus 5 AUXG s'active à la première allocation ou un dépôt de $100+. Plus : limite de retrait $50K/mois, droit à la livraison physique, relevés mensuels.")}
    ${cta("https://vault.auxite.io/kyc-verification", "VÉRIFIER MON IDENTITÉ")}
    <p style="font-size:11px;color:#888;line-height:1.6;margin:20px 0 0">Campagne de bienvenue à durée limitée. Crédits bonus déverrouillés selon les conditions du programme.</p>
  `),
};

const kycAuxgPromoAR = {
  subject: "خزنتك جاهزة — مكافأة الترحيب 5 AUXG بانتظارك",
  html: wrap(`
    <div dir="rtl" style="text-align:right">
    <p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 12px">خزنتك مفتوحة. خطوة واحدة متبقية.</p>
    <p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 20px">قم بالتحقق من هويتك للحصول على <strong>مكافأة الترحيب 5 AUXG</strong> — 5 جرامات من الذهب المخصص فعليًا والمعتمد من LBMA.</p>
    <p style="font-size:12px;letter-spacing:1.5px;color:#888;margin:0 0 12px;font-weight:600">التحقق — 60 ثانية</p>
    <table style="width:100%;border-collapse:collapse">
      ${step("1", "صورة الهوية أو جواز السفر", "التقاط بالكاميرا، لا يلزم التحميل.")}
      ${step("2", "صورة شخصية + فحص نابض", "مسح وجهي سريع للتأكيد.")}
      ${step("3", "بريد الموافقة", "الانتظار النموذجي 5-10 دقائق.")}
    </table>
    ${bonus("لماذا التحقق", "تُفعَّل مكافأة 5 AUXG عند أول تخصيص أو إيداع 100$+ . بالإضافة إلى: حد سحب 50 ألف $/شهر، حق استرداد المعدن المادي، كشوف حسابات شهرية.")}
    ${cta("https://vault.auxite.io/kyc-verification", "تحقق من هويتي")}
    <p style="font-size:11px;color:#888;line-height:1.6;margin:20px 0 0">حملة ترحيب لفترة محدودة. تُفتح الأرصدة وفقًا لشروط البرنامج.</p>
    </div>
  `),
};

const kycAuxgPromoRU = {
  subject: "Хранилище готово — Приветственный бонус 5 AUXG ждёт",
  html: wrap(`
    <p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 12px">Ваше хранилище открыто. Остался один шаг.</p>
    <p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 20px">Подтвердите личность, чтобы получить <strong>Приветственный бонус 5 AUXG</strong> — 5 граммов физически выделенного золота с сертификатом LBMA.</p>
    <p style="font-size:12px;letter-spacing:1.5px;color:#888;margin:0 0 12px;font-weight:600">ВЕРИФИКАЦИЯ — 60 СЕКУНД</p>
    <table style="width:100%;border-collapse:collapse">
      ${step("1", "Фото паспорта или ID", "Захват камерой, загрузка не требуется.")}
      ${step("2", "Селфи + проверка живости", "Быстрое сканирование лица для подтверждения.")}
      ${step("3", "Письмо с одобрением", "Обычное ожидание 5-10 минут.")}
    </table>
    ${bonus("ЗАЧЕМ ВЕРИФИЦИРОВАТЬСЯ", "Бонус 5 AUXG активируется при первой аллокации или депозите от $100. Также: лимит вывода $50K/мес, право на физическую выдачу, ежемесячные отчёты.")}
    ${cta("https://vault.auxite.io/kyc-verification", "ВЕРИФИЦИРОВАТЬСЯ")}
    <p style="font-size:11px;color:#888;line-height:1.6;margin:20px 0 0">Приветственная кампания ограничена по времени. Бонусы разблокируются согласно условиям программы.</p>
  `),
};

emailTemplates.kycAuxgPromoEN = kycAuxgPromoEN;
emailTemplates.kycAuxgPromoTR = kycAuxgPromoTR;
emailTemplates.kycAuxgPromoDE = kycAuxgPromoDE;
emailTemplates.kycAuxgPromoFR = kycAuxgPromoFR;
emailTemplates.kycAuxgPromoAR = kycAuxgPromoAR;
emailTemplates.kycAuxgPromoRU = kycAuxgPromoRU;

// Get KYC+AUXG promo template by user language
export function getKycAuxgPromoTemplate(lang: string): { subject: string; html: string } {
  const langMap: Record<string, string> = {
    en: "kycAuxgPromoEN",
    tr: "kycAuxgPromoTR",
    de: "kycAuxgPromoDE",
    fr: "kycAuxgPromoFR",
    ar: "kycAuxgPromoAR",
    ru: "kycAuxgPromoRU",
  };
  return emailTemplates[langMap[lang] || "kycAuxgPromoEN"];
}

// ═══════════════════════════════════════════════════════════════════════════
// CARD LAUNCH — "Buy precious metals with card" launch announcement
// ═══════════════════════════════════════════════════════════════════════════

const cardLaunchEN = {
  subject: "New: Buy Gold, Silver, Platinum & Palladium with Card",
  html: wrap(`
    <p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 12px">Card payments are now live.</p>
    <p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 20px">You can now buy <strong>physically allocated precious metals</strong> with any Visa or Mastercard, directly from the Auxite vault interface. No more crypto onboarding required.</p>
    <p style="font-size:12px;letter-spacing:1.5px;color:#888;margin:0 0 12px;font-weight:600">WHAT'S NEW</p>
    <table style="width:100%;border-collapse:collapse">
      ${step("1", "Pick a metal", "Gold (AUXG), Silver (AUXS), Platinum (AUXPT), or Palladium (AUXPD).")}
      ${step("2", "Enter amount in USD", "Minimum $30. The card processes the charge instantly.")}
      ${step("3", "Metal lands in your vault", "Allocated bar + LBMA certificate when ≥ 1 gram.")}
    </table>
    ${bonus("HOW IT APPEARS", "Card statement shows AURUM LEDGER. Processing fee included in the displayed total. Refund is available through the vault interface.")}
    ${cta("https://vault.auxite.io/vault", "BUY METAL WITH CARD")}
    <p style="font-size:11px;color:#888;line-height:1.6;margin:20px 0 0">Available now on web (vault.auxite.io) and Android. iOS app rolling out shortly.</p>
  `),
};

const cardLaunchTR = {
  subject: "Yeni: Kart ile Altın, Gümüş, Platin & Paladyum Al",
  html: wrap(`
    <p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 12px">Kart ile metal alımı artık aktif.</p>
    <p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 20px">Artık Auxite kasa arayüzünden doğrudan herhangi bir Visa veya Mastercard ile <strong>fiziksel olarak ayrılmış değerli metal</strong> alabilirsiniz. Kripto'ya geçiş zorunlu değil.</p>
    <p style="font-size:12px;letter-spacing:1.5px;color:#888;margin:0 0 12px;font-weight:600">YENİLİKLER</p>
    <table style="width:100%;border-collapse:collapse">
      ${step("1", "Bir metal seçin", "Altın (AUXG), Gümüş (AUXS), Platin (AUXPT) veya Paladyum (AUXPD).")}
      ${step("2", "USD tutarını girin", "Minimum $30. Kart anında işlenir.")}
      ${step("3", "Metal kasanıza yansır", "1 gram ve üzeri için tahsisli bar + LBMA sertifikası.")}
    </table>
    ${bonus("KART EKSTRESİ", "Kart ekstresinde AURUM LEDGER görünür. İşlem ücreti gösterilen toplama dahildir. İade kasa arayüzünden mümkün.")}
    ${cta("https://vault.auxite.io/vault", "KART İLE METAL AL")}
    <p style="font-size:11px;color:#888;line-height:1.6;margin:20px 0 0">Web (vault.auxite.io) ve Android'de aktif. iOS uygulaması yakında.</p>
  `),
};

const cardLaunchDE = {
  subject: "Neu: Edelmetalle mit Karte kaufen",
  html: wrap(`
    <p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 12px">Kartenzahlungen sind jetzt aktiv.</p>
    <p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 20px">Sie können nun direkt aus der Auxite-Tresoroberfläche <strong>physisch alloziertes Edelmetall</strong> mit jeder Visa- oder Mastercard kaufen. Kein Krypto-Onboarding mehr erforderlich.</p>
    <p style="font-size:12px;letter-spacing:1.5px;color:#888;margin:0 0 12px;font-weight:600">NEUERUNGEN</p>
    <table style="width:100%;border-collapse:collapse">
      ${step("1", "Metall wählen", "Gold (AUXG), Silber (AUXS), Platin (AUXPT) oder Palladium (AUXPD).")}
      ${step("2", "USD-Betrag eingeben", "Mindestens $30. Karte wird sofort belastet.")}
      ${step("3", "Metall landet im Tresor", "Allozierter Barren + LBMA-Zertifikat ab 1 Gramm.")}
    </table>
    ${bonus("KARTENABRECHNUNG", "Auf Ihrer Kartenabrechnung erscheint AURUM LEDGER. Bearbeitungsgebühr ist im angezeigten Betrag enthalten. Rückerstattung über die Tresoroberfläche möglich.")}
    ${cta("https://vault.auxite.io/vault", "METALL MIT KARTE KAUFEN")}
    <p style="font-size:11px;color:#888;line-height:1.6;margin:20px 0 0">Verfügbar im Web (vault.auxite.io) und Android. iOS-App folgt in Kürze.</p>
  `),
};

const cardLaunchFR = {
  subject: "Nouveau : Achetez des métaux précieux par carte",
  html: wrap(`
    <p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 12px">Le paiement par carte est désormais actif.</p>
    <p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 20px">Vous pouvez désormais acheter des <strong>métaux précieux physiquement alloués</strong> avec n'importe quelle Visa ou Mastercard, directement depuis l'interface du coffre Auxite. Plus besoin de passer par les cryptomonnaies.</p>
    <p style="font-size:12px;letter-spacing:1.5px;color:#888;margin:0 0 12px;font-weight:600">NOUVEAUTÉS</p>
    <table style="width:100%;border-collapse:collapse">
      ${step("1", "Choisissez un métal", "Or (AUXG), Argent (AUXS), Platine (AUXPT) ou Palladium (AUXPD).")}
      ${step("2", "Saisissez le montant en USD", "Minimum 30 $. La carte est débitée instantanément.")}
      ${step("3", "Le métal arrive dans votre coffre", "Lingot alloué + certificat LBMA dès 1 gramme.")}
    </table>
    ${bonus("RELEVÉ DE CARTE", "Le relevé affiche AURUM LEDGER. Les frais de traitement sont inclus dans le total affiché. Le remboursement est possible via l'interface du coffre.")}
    ${cta("https://vault.auxite.io/vault", "ACHETER DU MÉTAL PAR CARTE")}
    <p style="font-size:11px;color:#888;line-height:1.6;margin:20px 0 0">Disponible sur le web (vault.auxite.io) et Android. L'application iOS arrive bientôt.</p>
  `),
};

const cardLaunchAR = {
  subject: "جديد: اشترِ المعادن الثمينة بالبطاقة",
  html: wrap(`
    <div dir="rtl" style="text-align:right">
    <p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 12px">الدفع بالبطاقة أصبح مفعّلاً الآن.</p>
    <p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 20px">يمكنك الآن شراء <strong>المعادن الثمينة المخصصة فعليًا</strong> بأي بطاقة Visa أو Mastercard مباشرة من واجهة خزنة Auxite. لا حاجة للدخول إلى عالم العملات المشفرة.</p>
    <p style="font-size:12px;letter-spacing:1.5px;color:#888;margin:0 0 12px;font-weight:600">ما الجديد</p>
    <table style="width:100%;border-collapse:collapse">
      ${step("1", "اختر معدنًا", "ذهب (AUXG)، فضة (AUXS)، بلاتين (AUXPT)، أو بالاديوم (AUXPD).")}
      ${step("2", "أدخل المبلغ بالدولار", "الحد الأدنى 30$. تُعالج البطاقة فوراً.")}
      ${step("3", "يصل المعدن إلى خزنتك", "سبيكة مخصصة + شهادة LBMA من 1 جرام فما فوق.")}
    </table>
    ${bonus("كشف البطاقة", "يظهر AURUM LEDGER على كشف البطاقة. رسوم المعالجة مضمنة في المجموع المعروض. الاسترداد متاح عبر واجهة الخزنة.")}
    ${cta("https://vault.auxite.io/vault", "اشترِ المعدن بالبطاقة")}
    <p style="font-size:11px;color:#888;line-height:1.6;margin:20px 0 0">متوفر الآن على الويب (vault.auxite.io) وAndroid. تطبيق iOS قادم قريباً.</p>
    </div>
  `),
};

const cardLaunchRU = {
  subject: "Новинка: Купите драгоценные металлы картой",
  html: wrap(`
    <p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 12px">Оплата картой теперь активна.</p>
    <p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 20px">Теперь вы можете покупать <strong>физически выделенные драгоценные металлы</strong> любой картой Visa или Mastercard прямо из интерфейса хранилища Auxite. Подключение криптовалют больше не требуется.</p>
    <p style="font-size:12px;letter-spacing:1.5px;color:#888;margin:0 0 12px;font-weight:600">ЧТО НОВОГО</p>
    <table style="width:100%;border-collapse:collapse">
      ${step("1", "Выберите металл", "Золото (AUXG), Серебро (AUXS), Платина (AUXPT) или Палладий (AUXPD).")}
      ${step("2", "Введите сумму в USD", "Минимум 30 $. Карта обрабатывается мгновенно.")}
      ${step("3", "Металл поступает в хранилище", "Выделенный слиток + сертификат LBMA при покупке от 1 грамма.")}
    </table>
    ${bonus("ВЫПИСКА ПО КАРТЕ", "В выписке отображается AURUM LEDGER. Комиссия за обработку включена в итоговую сумму. Возврат доступен через интерфейс хранилища.")}
    ${cta("https://vault.auxite.io/vault", "КУПИТЬ МЕТАЛЛ КАРТОЙ")}
    <p style="font-size:11px;color:#888;line-height:1.6;margin:20px 0 0">Доступно на вебе (vault.auxite.io) и Android. Приложение iOS появится вскоре.</p>
  `),
};

emailTemplates.cardLaunchEN = cardLaunchEN;
emailTemplates.cardLaunchTR = cardLaunchTR;
emailTemplates.cardLaunchDE = cardLaunchDE;
emailTemplates.cardLaunchFR = cardLaunchFR;
emailTemplates.cardLaunchAR = cardLaunchAR;
emailTemplates.cardLaunchRU = cardLaunchRU;

export function getCardLaunchTemplate(lang: string): { subject: string; html: string } {
  const langMap: Record<string, string> = {
    en: "cardLaunchEN",
    tr: "cardLaunchTR",
    de: "cardLaunchDE",
    fr: "cardLaunchFR",
    ar: "cardLaunchAR",
    ru: "cardLaunchRU",
  };
  return emailTemplates[langMap[lang] || "cardLaunchEN"];
}

// ═══════════════════════════════════════════════════════════════════════════
// KYC LIMITS ANNOUNCEMENT — "$500/tx without KYC" easing
// ═══════════════════════════════════════════════════════════════════════════

const kycLimitsEN = {
  subject: "Now buy without KYC — up to $500",
  html: wrap(`
    <p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 12px">Skip the paperwork. Start buying.</p>
    <p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 20px">You can now buy <strong>gold, silver, platinum or palladium</strong> with just your email — no identity verification needed for transactions up to $500.</p>
    <p style="font-size:12px;letter-spacing:1.5px;color:#888;margin:0 0 12px;font-weight:600">THE NEW LIMITS</p>
    <table style="width:100%;border-collapse:collapse">
      ${step("•", "Up to $500 per purchase", "Single transaction ceiling — no KYC required.")}
      ${step("•", "Up to $1,000 over 30 days", "Rolling cumulative cap. Resets day by day.")}
      ${step("•", "Verify to remove all caps", "Full access in about 3 minutes. Higher tickets, all rails.")}
    </table>
    ${bonus("WHY THIS MATTERS", "We heard you: identity verification is friction. For most buyers exploring precious metals, $500 is enough to start. Begin with what you can today; verify when you're ready to size up.")}
    ${cta("https://vault.auxite.io/vault", "BUY METAL NOW")}
    <p style="font-size:11px;color:#888;line-height:1.6;margin:20px 0 0">Applies to card, bank wire, and AUXR purchases. Verified users have no limit.</p>
  `),
};

const kycLimitsTR = {
  subject: "Artık KYC'siz alım — $500'a kadar",
  html: wrap(`
    <p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 12px">Belge yok. Alıma başla.</p>
    <p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 20px">Artık <strong>altın, gümüş, platin veya paladyum</strong>u sadece e-postanla satın alabilirsin — $500'a kadar olan işlemler için kimlik doğrulama gerekmiyor.</p>
    <p style="font-size:12px;letter-spacing:1.5px;color:#888;margin:0 0 12px;font-weight:600">YENİ LİMİTLER</p>
    <table style="width:100%;border-collapse:collapse">
      ${step("•", "İşlem başına $500'a kadar", "Tek işlem tavanı — KYC gerekmez.")}
      ${step("•", "30 günde toplam $1.000'a kadar", "Aylık kümülatif sınır. Gün gün yenilenir.")}
      ${step("•", "Kimlik doğrula → tüm limitler kalkar", "3 dakikada tam erişim. Daha yüksek tutar, tüm yöntemler.")}
    </table>
    ${bonus("NEDEN DEĞİŞTİRDİK", "Sizi dinledik: kimlik doğrulama bir engel. Değerli metallere ilk adımı atan çoğu alıcı için $500 başlamak için yeterli. Bugün yapabildiğinle başla; büyütmek istediğinde doğrula.")}
    ${cta("https://vault.auxite.io/vault", "HEMEN METAL AL")}
    <p style="font-size:11px;color:#888;line-height:1.6;margin:20px 0 0">Kart, havale ve AUXR alımları için geçerli. Doğrulanmış kullanıcıların limiti yoktur.</p>
  `),
};

const kycLimitsDE = {
  subject: "Jetzt ohne KYC kaufen — bis zu $500",
  html: wrap(`
    <p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 12px">Keine Papiere. Kauf direkt.</p>
    <p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 20px">Sie können nun <strong>Gold, Silber, Platin oder Palladium</strong> nur mit Ihrer E-Mail kaufen — keine Identitätsprüfung für Transaktionen bis $500 erforderlich.</p>
    <p style="font-size:12px;letter-spacing:1.5px;color:#888;margin:0 0 12px;font-weight:600">DIE NEUEN LIMITS</p>
    <table style="width:100%;border-collapse:collapse">
      ${step("•", "Bis $500 pro Kauf", "Obergrenze pro Transaktion — kein KYC erforderlich.")}
      ${step("•", "Bis $1.000 in 30 Tagen", "Rollende Gesamtobergrenze. Setzt sich Tag für Tag zurück.")}
      ${step("•", "KYC abschließen → alle Limits weg", "Vollzugriff in ca. 3 Minuten. Höhere Tickets, alle Zahlungswege.")}
    </table>
    ${bonus("WARUM DAS WICHTIG IST", "Wir haben Ihnen zugehört: Identitätsprüfung ist eine Hürde. Für die meisten Käufer, die Edelmetalle erkunden, sind $500 ein guter Anfang. Beginnen Sie heute; verifizieren Sie, wenn Sie größer skalieren möchten.")}
    ${cta("https://vault.auxite.io/vault", "JETZT METALL KAUFEN")}
    <p style="font-size:11px;color:#888;line-height:1.6;margin:20px 0 0">Gilt für Karte, Banküberweisung und AUXR-Käufe. Verifizierte Nutzer haben keine Grenze.</p>
  `),
};

const kycLimitsFR = {
  subject: "Achetez sans KYC — jusqu'à 500 $",
  html: wrap(`
    <p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 12px">Pas de paperasse. Achetez maintenant.</p>
    <p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 20px">Vous pouvez désormais acheter <strong>or, argent, platine ou palladium</strong> avec votre seul e-mail — aucune vérification d'identité requise pour les transactions jusqu'à 500 $.</p>
    <p style="font-size:12px;letter-spacing:1.5px;color:#888;margin:0 0 12px;font-weight:600">LES NOUVELLES LIMITES</p>
    <table style="width:100%;border-collapse:collapse">
      ${step("•", "Jusqu'à 500 $ par achat", "Plafond par transaction — sans KYC.")}
      ${step("•", "Jusqu'à 1 000 $ sur 30 jours", "Plafond cumulatif glissant. Se réinitialise jour après jour.")}
      ${step("•", "Vérifiez votre identité → plus de plafond", "Accès complet en environ 3 minutes. Tickets plus élevés, tous les canaux.")}
    </table>
    ${bonus("POURQUOI", "Nous vous avons écouté : la vérification d'identité est un frein. Pour la plupart des acheteurs qui découvrent les métaux précieux, 500 $ suffisent pour démarrer. Commencez aujourd'hui ; vérifiez quand vous voudrez monter en échelle.")}
    ${cta("https://vault.auxite.io/vault", "ACHETER DU MÉTAL MAINTENANT")}
    <p style="font-size:11px;color:#888;line-height:1.6;margin:20px 0 0">S'applique aux achats par carte, virement bancaire et AUXR. Les utilisateurs vérifiés n'ont aucune limite.</p>
  `),
};

const kycLimitsAR = {
  subject: "اشترِ الآن بدون KYC — حتى 500 دولار",
  html: wrap(`
    <div dir="rtl" style="text-align:right">
    <p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 12px">بدون أوراق. ابدأ الشراء.</p>
    <p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 20px">يمكنك الآن شراء <strong>الذهب أو الفضة أو البلاتين أو البلاديوم</strong> ببريدك الإلكتروني فقط — لا حاجة للتحقق من الهوية للمعاملات حتى 500 دولار.</p>
    <p style="font-size:12px;letter-spacing:1.5px;color:#888;margin:0 0 12px;font-weight:600">الحدود الجديدة</p>
    <table style="width:100%;border-collapse:collapse">
      ${step("•", "حتى 500 دولار لكل شراء", "سقف المعاملة الواحدة — بدون KYC.")}
      ${step("•", "حتى 1000 دولار خلال 30 يومًا", "سقف تراكمي متجدد. يتجدد يومًا بيوم.")}
      ${step("•", "تحقق من هويتك → إزالة جميع الحدود", "وصول كامل في حوالي 3 دقائق. مبالغ أعلى، جميع الوسائل.")}
    </table>
    ${bonus("لماذا غيّرنا هذا", "سمعناكم: التحقق من الهوية عائق. لمعظم المشترين الذين يستكشفون المعادن الثمينة، 500 دولار كافية للبدء. ابدأ بما تستطيع اليوم؛ تحقق عندما تريد التوسع.")}
    ${cta("https://vault.auxite.io/vault", "اشترِ المعدن الآن")}
    <p style="font-size:11px;color:#888;line-height:1.6;margin:20px 0 0">يسري على البطاقة والحوالة المصرفية ومشتريات AUXR. المستخدمون المتحققون بلا حدود.</p>
    </div>
  `),
};

const kycLimitsRU = {
  subject: "Покупайте без KYC — до $500",
  html: wrap(`
    <p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 12px">Без бумаг. Начните покупать.</p>
    <p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 20px">Теперь вы можете покупать <strong>золото, серебро, платину или палладий</strong> только по email — без проверки личности для транзакций до $500.</p>
    <p style="font-size:12px;letter-spacing:1.5px;color:#888;margin:0 0 12px;font-weight:600">НОВЫЕ ЛИМИТЫ</p>
    <table style="width:100%;border-collapse:collapse">
      ${step("•", "До $500 за покупку", "Потолок одной транзакции — без KYC.")}
      ${step("•", "До $1 000 за 30 дней", "Скользящий совокупный лимит. Обнуляется день за днём.")}
      ${step("•", "Пройдите KYC → все лимиты сняты", "Полный доступ примерно за 3 минуты. Крупнее, по всем каналам.")}
    </table>
    ${bonus("ПОЧЕМУ ЭТО ВАЖНО", "Мы вас услышали: проверка личности — это барьер. Для большинства, кто только начинает с драгоценными металлами, $500 достаточно. Начните сегодня; верифицируйтесь, когда захотите масштабироваться.")}
    ${cta("https://vault.auxite.io/vault", "КУПИТЬ МЕТАЛЛ СЕЙЧАС")}
    <p style="font-size:11px;color:#888;line-height:1.6;margin:20px 0 0">Применяется к покупкам картой, банковским переводом и AUXR. У верифицированных пользователей лимита нет.</p>
  `),
};

emailTemplates.kycLimitsEN = kycLimitsEN;
emailTemplates.kycLimitsTR = kycLimitsTR;
emailTemplates.kycLimitsDE = kycLimitsDE;
emailTemplates.kycLimitsFR = kycLimitsFR;
emailTemplates.kycLimitsAR = kycLimitsAR;
emailTemplates.kycLimitsRU = kycLimitsRU;

export function getKycLimitsAnnouncementTemplate(lang: string): { subject: string; html: string } {
  const langMap: Record<string, string> = {
    en: "kycLimitsEN",
    tr: "kycLimitsTR",
    de: "kycLimitsDE",
    fr: "kycLimitsFR",
    ar: "kycLimitsAR",
    ru: "kycLimitsRU",
  };
  return emailTemplates[langMap[lang] || "kycLimitsEN"];
}
