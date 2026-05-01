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
