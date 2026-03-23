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

export const emailTemplates: Record<string, { subject: string; html: string }> = {
  // ═══════════════════════════════════════════════════════════════
  // EXISTING TEMPLATES
  // ═══════════════════════════════════════════════════════════════
  kycReminder: {
    subject: "Complete Your Verification — Earn 10 AUXS Bonus",
    html: wrap(`<p style="font-size:13px;color:#444;line-height:1.7">Complete your identity verification (KYC) and make your first deposit of $100 or more to receive <strong>10 AUXS Welcome Bonus</strong>.</p><p style="font-size:13px;color:#444;line-height:1.7">Your bonus credits will unlock after 30 days or upon reaching 5x trading volume.</p>${cta("https://vault.auxite.io", "VERIFY NOW")}`),
  },
  welcomeBonus: {
    subject: "Welcome to Auxite — Your 10 AUXS Bonus Awaits",
    html: wrap(`<p style="font-size:13px;color:#444;line-height:1.7">Thank you for joining Auxite. You are now enrolled in our <strong>Liquidity Credits Programme</strong>.</p><p style="font-size:13px;color:#444;line-height:1.7"><strong>Welcome Bonus:</strong> 10 AUXS upon KYC + $100 deposit<br/><strong>Deposit Bonus:</strong> 2% in metal credits<br/><strong>Referral Bonus:</strong> 0.5% of referred deposit</p>${cta("https://vault.auxite.io", "ACCESS YOUR VAULT")}`),
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
      ${bonus("LIMITED TIME OFFER", "Complete KYC verification + deposit $100 minimum to receive <strong>10 AUXS Welcome Bonus</strong>. Liquidity Credits unlock after 30 days or 5x trading volume.")}
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
      ${bonus("SINIRLI SÜRE TEKLİFİ", "KYC doğrulamasını tamamlayın + minimum 100$ yatırım yaparak <strong>10 AUXS Hoş Geldin Bonusu</strong> kazanın. Likidite Kredileri 30 gün sonra veya 5x işlem hacmiyle açılır.")}
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
      ${bonus("OFFRE LIMITÉE", "Complétez votre vérification KYC + dépôt minimum de 100$ pour recevoir un <strong>Bonus de Bienvenue de 10 AUXS</strong>. Les Crédits de Liquidité se débloquent après 30 jours ou 5x volume de trading.")}
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
      ${bonus("ZEITLICH BEGRENZTES ANGEBOT", "KYC-Verifizierung abschließen + Mindesteinzahlung von 100$ für einen <strong>Willkommensbonus von 10 AUXS</strong>. Liquiditätsguthaben werden nach 30 Tagen oder 5-fachem Handelsvolumen freigeschaltet.")}
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
      ${bonus("عرض لفترة محدودة", "أكمل التحقق من هويتك (KYC) + إيداع 100$ كحد أدنى للحصول على <strong>مكافأة ترحيبية 10 AUXS</strong>. تُفتح اعتمادات السيولة بعد 30 يوماً أو 5 أضعاف حجم التداول.")}
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
      ${bonus("ОГРАНИЧЕННОЕ ПРЕДЛОЖЕНИЕ", "Пройдите верификацию KYC + внесите депозит от 100$ для получения <strong>Приветственного бонуса 10 AUXS</strong>. Кредиты ликвидности разблокируются через 30 дней или при 5-кратном торговом объёме.")}
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
