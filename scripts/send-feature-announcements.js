// Feature announcement campaign — 4 features over 4 days, one per send.
// Multi-language (en/tr/de/fr/ar/ru): picks template per user.language.
// Segment: ALL registered users with an email.
//
// Features: convert | withdraw | yield | radio
//
// Usage:
//   node --env-file=.env.local scripts/send-feature-announcements.js --feature=convert --preview
//   node --env-file=.env.local scripts/send-feature-announcements.js --feature=convert --test=you@example.com --lang=tr
//   node --env-file=.env.local scripts/send-feature-announcements.js --feature=convert --send

const fs = require("fs");
const path = require("path");
const { Redis } = require("@upstash/redis");
const { Resend } = require("resend");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "Auxite <noreply@auxite.io>";
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 500;

// ─────────────────────────────────────────────────────────────────
// Shared building blocks (mirror src/lib/email-templates.ts aesthetic)
// ─────────────────────────────────────────────────────────────────
const HEADER = `<div style="font-family:Georgia,serif;background:#f5f5f5;padding:20px;color:#1a1a1a"><div style="max-width:600px;margin:0 auto;background:#fff"><div style="height:3px;background:#C5A55A"></div><div style="padding:28px 30px"><img src="https://vault.auxite.io/auxite-logo-new.png" alt="Auxite" width="120" style="display:block;width:120px;height:auto;margin-bottom:20px"/>`;
const FOOTER = `<p style="font-size:10px;color:#999;margin-top:20px;font-style:italic">This message serves as an operational communication. Please do not reply.</p></div><div style="padding:16px 30px;border-top:1px solid #e5e5e5;text-align:center"><p style="font-size:9px;color:#aaa;margin:4px 0">Aurum Ledger Ltd &middot; Hong Kong</p></div><div style="height:2px;background:#C5A55A"></div></div></div>`;
const wrap = (b) => HEADER + b + FOOTER;

const eyebrow = (t) => `<p style="font-size:11px;letter-spacing:2px;color:#C5A55A;margin:0 0 8px;font-weight:700;text-transform:uppercase">${t}</p>`;
const lead = (t) => `<p style="font-size:18px;color:#1a1a1a;font-weight:600;margin:0 0 14px;line-height:1.4">${t}</p>`;
const para = (t) => `<p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 18px">${t}</p>`;
const bullets = (items) =>
  `<table style="width:100%;border-collapse:collapse;margin:0 0 18px">` +
  items
    .map(
      (it) =>
        `<tr><td style="padding:7px 0;vertical-align:top;width:22px;font-size:13px;color:#C5A55A">&#9670;</td><td style="padding:7px 0;font-size:13px;color:#444;line-height:1.6">${it}</td></tr>`
    )
    .join("") +
  `</table>`;
const cta = (u, t) =>
  `<a href="${u}" style="display:inline-block;background:#1a1a1a;color:#fff!important;padding:13px 26px;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:1px;margin:8px 0 4px">${t}</a>`;
const note = (t) => `<p style="font-size:11px;color:#888;line-height:1.6;margin:18px 0 0">${t}</p>`;

// rtl wrapper for arabic body
const rtl = (b) => `<div dir="rtl" style="text-align:right">${b}</div>`;

// Build a standard announcement body from parts
const body = ({ eyebrowTxt, leadTxt, paraTxt, items, ctaUrl, ctaTxt, noteTxt, dir }) => {
  const inner =
    eyebrow(eyebrowTxt) +
    lead(leadTxt) +
    para(paraTxt) +
    bullets(items) +
    cta(ctaUrl, ctaTxt) +
    note(noteTxt);
  return wrap(dir === "rtl" ? rtl(inner) : inner);
};

// Smart deep-link: /open?to=... opens the mobile app on the matching screen if
// installed (auxite-vault:// scheme), else falls back to web / Play Store.
const URLS = {
  convert: "https://vault.auxite.io/open?to=convert",
  withdraw: "https://vault.auxite.io/open?to=withdraw",
  yield: "https://vault.auxite.io/open?to=yield",
  radio: "https://vault.auxite.io/open?to=radio",
};

// ─────────────────────────────────────────────────────────────────
// FEATURE TEMPLATES — 4 features × 6 languages
// ─────────────────────────────────────────────────────────────────
const FEATURES = {
  // ── 1. CONVERT ──────────────────────────────────────────────
  convert: {
    en: {
      subject: "Introducing Convert — move between metal, cash and crypto in one tap",
      html: body({
        eyebrowTxt: "New in your vault",
        leadTxt: "Rebalance your holdings in a single tap.",
        paraTxt:
          "Convert lets you move directly between precious metals, cash balance and crypto — no separate sell-then-buy, no waiting. Shift gold into silver, take profit into stablecoins, or top up cash, all from one screen.",
        items: [
          "Any-to-any: gold, silver, platinum, palladium, cash and crypto",
          "Live, transparent conversion rates at execution",
          "Settles instantly inside your vault",
        ],
        ctaUrl: URLS.convert,
        ctaTxt: "TRY CONVERT",
        noteTxt: "Conversion fees apply per asset pair and are shown before you confirm.",
      }),
    },
    tr: {
      subject: "Tanıtıyoruz: Dönüştür — metal, nakit ve kripto arasında tek dokunuşla geçiş",
      html: body({
        eyebrowTxt: "Kasanızda yeni",
        leadTxt: "Portföyünüzü tek dokunuşla yeniden dengeleyin.",
        paraTxt:
          "Dönüştür özelliğiyle değerli metaller, nakit bakiyeniz ve kripto arasında doğrudan geçiş yapın — önce sat sonra al uğraşı yok, bekleme yok. Altını gümüşe çevirin, kârı stablecoin'e alın veya nakit yükleyin; hepsi tek ekrandan.",
        items: [
          "Her şeyden her şeye: altın, gümüş, platin, paladyum, nakit ve kripto",
          "İşlem anında canlı, şeffaf dönüşüm kurları",
          "Kasanız içinde anında gerçekleşir",
        ],
        ctaUrl: URLS.convert,
        ctaTxt: "HEMEN DÖNÜŞTÜR",
        noteTxt: "Dönüşüm ücretleri varlık çiftine göre değişir ve onaylamadan önce gösterilir.",
      }),
    },
    de: {
      subject: "Neu: Convert — wechseln Sie zwischen Metall, Bargeld und Krypto mit einem Tipp",
      html: body({
        eyebrowTxt: "Neu in Ihrem Tresor",
        leadTxt: "Schichten Sie Ihr Portfolio mit einem Tipp um.",
        paraTxt:
          "Mit Convert wechseln Sie direkt zwischen Edelmetallen, Bargeldguthaben und Krypto — kein separates Verkaufen und Kaufen, kein Warten. Tauschen Sie Gold in Silber, sichern Sie Gewinne in Stablecoins oder laden Sie Bargeld auf — alles auf einem Bildschirm.",
        items: [
          "Alles-zu-allem: Gold, Silber, Platin, Palladium, Bargeld und Krypto",
          "Live-Umrechnungskurse, transparent bei Ausführung",
          "Sofortige Abwicklung in Ihrem Tresor",
        ],
        ctaUrl: URLS.convert,
        ctaTxt: "CONVERT TESTEN",
        noteTxt: "Umrechnungsgebühren gelten je Anlagepaar und werden vor Bestätigung angezeigt.",
      }),
    },
    fr: {
      subject: "Nouveau : Convert — passez du métal au cash et au crypto en un geste",
      html: body({
        eyebrowTxt: "Nouveau dans votre coffre",
        leadTxt: "Rééquilibrez vos avoirs en un seul geste.",
        paraTxt:
          "Convert vous permet de passer directement entre métaux précieux, solde en espèces et crypto — sans vendre puis racheter, sans attente. Transformez l'or en argent, sécurisez vos gains en stablecoins ou rechargez votre solde, le tout depuis un seul écran.",
        items: [
          "De tout vers tout : or, argent, platine, palladium, cash et crypto",
          "Taux de conversion en direct et transparents à l'exécution",
          "Règlement instantané dans votre coffre",
        ],
        ctaUrl: URLS.convert,
        ctaTxt: "ESSAYER CONVERT",
        noteTxt: "Des frais de conversion s'appliquent selon la paire et sont affichés avant confirmation.",
      }),
    },
    ar: {
      dir: "rtl",
      subject: "نقدّم لك Convert — تنقّل بين المعدن والنقد والعملات الرقمية بلمسة واحدة",
      html: body({
        dir: "rtl",
        eyebrowTxt: "جديد في خزنتك",
        leadTxt: "أعد موازنة محفظتك بلمسة واحدة.",
        paraTxt:
          "يتيح لك Convert الانتقال مباشرةً بين المعادن الثمينة والرصيد النقدي والعملات الرقمية — دون بيع ثم شراء منفصل، ودون انتظار. حوّل الذهب إلى فضة، أو جنِّ أرباحك بعملات مستقرة، أو اشحن رصيدك النقدي، كل ذلك من شاشة واحدة.",
        items: [
          "من أي شيء إلى أي شيء: ذهب، فضة، بلاتين، بلاديوم، نقد وعملات رقمية",
          "أسعار تحويل حيّة وشفافة عند التنفيذ",
          "تسوية فورية داخل خزنتك",
        ],
        ctaUrl: URLS.convert,
        ctaTxt: "جرّب Convert",
        noteTxt: "تُطبَّق رسوم التحويل حسب زوج الأصول وتُعرض قبل التأكيد.",
      }),
    },
    ru: {
      subject: "Представляем Convert — переходите между металлом, деньгами и крипто в одно касание",
      html: body({
        eyebrowTxt: "Новое в вашем хранилище",
        leadTxt: "Перебалансируйте активы в одно касание.",
        paraTxt:
          "Convert позволяет напрямую переходить между драгоценными металлами, денежным балансом и крипто — без отдельной продажи и покупки, без ожидания. Переведите золото в серебро, зафиксируйте прибыль в стейблкоинах или пополните баланс — всё с одного экрана.",
        items: [
          "Всё во всё: золото, серебро, платина, палладий, деньги и крипто",
          "Живые, прозрачные курсы конвертации при исполнении",
          "Мгновенное исполнение внутри вашего хранилища",
        ],
        ctaUrl: URLS.convert,
        ctaTxt: "ПОПРОБОВАТЬ CONVERT",
        noteTxt: "Комиссия за конвертацию зависит от пары активов и показывается до подтверждения.",
      }),
    },
  },

  // ── 2. WITHDRAW ─────────────────────────────────────────────
  withdraw: {
    en: {
      subject: "You can now withdraw in crypto — USDC, USDT, ETH or BTC",
      html: body({
        eyebrowTxt: "New in your vault",
        leadTxt: "Take your value on-chain, anytime.",
        paraTxt:
          "Withdraw your balance directly as USDC, USDT, ETH or BTC to any wallet or exchange. Your gold-backed value is now fully liquid and portable — sell to cash inside Auxite, then send it wherever you need.",
        items: [
          "Withdraw as USDC, USDT, ETH or BTC",
          "Send to any external wallet or exchange",
          "Fast on-chain settlement with clear network fees",
        ],
        ctaUrl: URLS.withdraw,
        ctaTxt: "WITHDRAW NOW",
        noteTxt: "Identity verification is required for withdrawals. Network fees apply per asset.",
      }),
    },
    tr: {
      subject: "Artık kripto olarak çekim yapabilirsiniz — USDC, USDT, ETH veya BTC",
      html: body({
        eyebrowTxt: "Kasanızda yeni",
        leadTxt: "Değerinizi istediğiniz an zincire taşıyın.",
        paraTxt:
          "Bakiyenizi doğrudan USDC, USDT, ETH veya BTC olarak herhangi bir cüzdana ya da borsaya çekin. Altın destekli değeriniz artık tamamen likit ve taşınabilir — Auxite içinde nakde çevirin, sonra dilediğiniz yere gönderin.",
        items: [
          "USDC, USDT, ETH veya BTC olarak çekim",
          "Herhangi bir harici cüzdana veya borsaya gönderim",
          "Net ağ ücretleriyle hızlı zincir-üstü transfer",
        ],
        ctaUrl: URLS.withdraw,
        ctaTxt: "ŞİMDİ ÇEK",
        noteTxt: "Çekimler için kimlik doğrulaması gereklidir. Varlığa göre ağ ücretleri uygulanır.",
      }),
    },
    de: {
      subject: "Sie können jetzt in Krypto auszahlen — USDC, USDT, ETH oder BTC",
      html: body({
        eyebrowTxt: "Neu in Ihrem Tresor",
        leadTxt: "Bringen Sie Ihren Wert jederzeit on-chain.",
        paraTxt:
          "Zahlen Sie Ihr Guthaben direkt als USDC, USDT, ETH oder BTC an jede Wallet oder Börse aus. Ihr goldgedeckter Wert ist nun vollständig liquide und übertragbar — in Auxite zu Bargeld verkaufen und dann überall hinsenden.",
        items: [
          "Auszahlung als USDC, USDT, ETH oder BTC",
          "An jede externe Wallet oder Börse senden",
          "Schnelle On-Chain-Abwicklung mit klaren Netzwerkgebühren",
        ],
        ctaUrl: URLS.withdraw,
        ctaTxt: "JETZT AUSZAHLEN",
        noteTxt: "Für Auszahlungen ist eine Identitätsprüfung erforderlich. Netzwerkgebühren je Anlage.",
      }),
    },
    fr: {
      subject: "Vous pouvez désormais retirer en crypto — USDC, USDT, ETH ou BTC",
      html: body({
        eyebrowTxt: "Nouveau dans votre coffre",
        leadTxt: "Mettez votre valeur on-chain, à tout moment.",
        paraTxt:
          "Retirez votre solde directement en USDC, USDT, ETH ou BTC vers n'importe quel portefeuille ou plateforme. Votre valeur adossée à l'or est désormais entièrement liquide et transférable — convertissez en cash dans Auxite, puis envoyez où vous le souhaitez.",
        items: [
          "Retrait en USDC, USDT, ETH ou BTC",
          "Envoi vers tout portefeuille ou plateforme externe",
          "Règlement on-chain rapide avec frais de réseau clairs",
        ],
        ctaUrl: URLS.withdraw,
        ctaTxt: "RETIRER MAINTENANT",
        noteTxt: "Une vérification d'identité est requise pour les retraits. Frais de réseau selon l'actif.",
      }),
    },
    ar: {
      dir: "rtl",
      subject: "يمكنك الآن السحب بالعملات الرقمية — USDC أو USDT أو ETH أو BTC",
      html: body({
        dir: "rtl",
        eyebrowTxt: "جديد في خزنتك",
        leadTxt: "انقل قيمتك إلى السلسلة في أي وقت.",
        paraTxt:
          "اسحب رصيدك مباشرةً بعملة USDC أو USDT أو ETH أو BTC إلى أي محفظة أو منصة. قيمتك المدعومة بالذهب أصبحت الآن سائلة وقابلة للنقل بالكامل — حوّلها إلى نقد داخل Auxite ثم أرسلها إلى حيث تشاء.",
        items: [
          "السحب بعملة USDC أو USDT أو ETH أو BTC",
          "الإرسال إلى أي محفظة أو منصة خارجية",
          "تسوية سريعة على السلسلة برسوم شبكة واضحة",
        ],
        ctaUrl: URLS.withdraw,
        ctaTxt: "اسحب الآن",
        noteTxt: "يتطلب السحب التحقق من الهوية. تُطبَّق رسوم الشبكة حسب الأصل.",
      }),
    },
    ru: {
      subject: "Теперь вы можете выводить в крипто — USDC, USDT, ETH или BTC",
      html: body({
        eyebrowTxt: "Новое в вашем хранилище",
        leadTxt: "Выводите свою стоимость в блокчейн в любой момент.",
        paraTxt:
          "Выводите баланс напрямую в USDC, USDT, ETH или BTC на любой кошелёк или биржу. Ваша обеспеченная золотом стоимость теперь полностью ликвидна и мобильна — продайте в деньги внутри Auxite и отправьте куда угодно.",
        items: [
          "Вывод в USDC, USDT, ETH или BTC",
          "Отправка на любой внешний кошелёк или биржу",
          "Быстрый ончейн-расчёт с прозрачными сетевыми комиссиями",
        ],
        ctaUrl: URLS.withdraw,
        ctaTxt: "ВЫВЕСТИ СЕЙЧАС",
        noteTxt: "Для вывода требуется верификация личности. Сетевые комиссии зависят от актива.",
      }),
    },
  },

  // ── 3. LEASE YIELD ──────────────────────────────────────────
  yield: {
    en: {
      subject: "Put your metal to work — earn structured yield on your holdings",
      html: body({
        eyebrowTxt: "New in your vault",
        leadTxt: "Your gold can now earn.",
        paraTxt:
          "Lease your allocated metal into institutional yield programmes and earn a return on holdings that would otherwise sit idle. Rates are benchmarked to real lease markets, with fixed terms you choose.",
        items: [
          "Choose 3, 6 or 12-month terms",
          "Institutional rates benchmarked to SOFR + lease markets",
          "Your metal stays allocated and fully accounted throughout",
        ],
        ctaUrl: URLS.yield,
        ctaTxt: "VIEW YIELD RATES",
        noteTxt: "Yield is variable and subject to programme terms. Capital is committed for the chosen term.",
      }),
    },
    tr: {
      subject: "Metalinizi çalıştırın — varlıklarınızdan yapılandırılmış getiri kazanın",
      html: body({
        eyebrowTxt: "Kasanızda yeni",
        leadTxt: "Altınınız artık kazandırabilir.",
        paraTxt:
          "Tahsis edilmiş metalinizi kurumsal getiri programlarına lease'e verin ve aksi halde atıl duracak varlıklarınızdan getiri elde edin. Oranlar gerçek lease piyasalarına endekslenir, vadeyi siz seçersiniz.",
        items: [
          "3, 6 veya 12 aylık vade seçin",
          "SOFR + lease piyasalarına endeksli kurumsal oranlar",
          "Metaliniz tüm süre boyunca tahsisli ve tam kayıtlı kalır",
        ],
        ctaUrl: URLS.yield,
        ctaTxt: "GETİRİ ORANLARINI GÖR",
        noteTxt: "Getiri değişkendir ve program koşullarına tabidir. Sermaye seçilen vade boyunca bağlanır.",
      }),
    },
    de: {
      subject: "Lassen Sie Ihr Metall arbeiten — verdienen Sie strukturierte Rendite",
      html: body({
        eyebrowTxt: "Neu in Ihrem Tresor",
        leadTxt: "Ihr Gold kann jetzt Rendite erwirtschaften.",
        paraTxt:
          "Verleihen Sie Ihr alloziertes Metall in institutionelle Renditeprogramme und erzielen Sie eine Rendite auf Bestände, die sonst ungenutzt blieben. Die Sätze orientieren sich an realen Leihmärkten, mit von Ihnen gewählten Laufzeiten.",
        items: [
          "Laufzeiten von 3, 6 oder 12 Monaten wählen",
          "Institutionelle Sätze, orientiert an SOFR + Leihmärkten",
          "Ihr Metall bleibt durchgehend alloziert und vollständig verbucht",
        ],
        ctaUrl: URLS.yield,
        ctaTxt: "RENDITESÄTZE ANSEHEN",
        noteTxt: "Die Rendite ist variabel und unterliegt den Programmbedingungen. Kapital ist für die Laufzeit gebunden.",
      }),
    },
    fr: {
      subject: "Faites travailler votre métal — gagnez un rendement structuré sur vos avoirs",
      html: body({
        eyebrowTxt: "Nouveau dans votre coffre",
        leadTxt: "Votre or peut désormais rapporter.",
        paraTxt:
          "Prêtez votre métal alloué à des programmes de rendement institutionnels et gagnez un rendement sur des avoirs autrement inactifs. Les taux sont indexés sur les marchés de prêt réels, avec des durées que vous choisissez.",
        items: [
          "Choisissez des durées de 3, 6 ou 12 mois",
          "Taux institutionnels indexés sur le SOFR + marchés de prêt",
          "Votre métal reste alloué et entièrement comptabilisé tout du long",
        ],
        ctaUrl: URLS.yield,
        ctaTxt: "VOIR LES TAUX",
        noteTxt: "Le rendement est variable et soumis aux conditions du programme. Le capital est engagé pour la durée choisie.",
      }),
    },
    ar: {
      dir: "rtl",
      subject: "اجعل معدنك يعمل — احصل على عائد منظَّم على ممتلكاتك",
      html: body({
        dir: "rtl",
        eyebrowTxt: "جديد في خزنتك",
        leadTxt: "ذهبك يمكنه الآن أن يدرّ عائدًا.",
        paraTxt:
          "أجِّر معدنك المخصَّص ضمن برامج عائد مؤسسية واحصل على عائد على ممتلكات كانت لتبقى خاملة. ترتبط الأسعار بأسواق التأجير الحقيقية، بمُدد تختارها أنت.",
        items: [
          "اختر مدة 3 أو 6 أو 12 شهرًا",
          "أسعار مؤسسية مرتبطة بـ SOFR وأسواق التأجير",
          "يبقى معدنك مخصَّصًا ومُسجَّلًا بالكامل طوال المدة",
        ],
        ctaUrl: URLS.yield,
        ctaTxt: "عرض أسعار العائد",
        noteTxt: "العائد متغيّر ويخضع لشروط البرنامج. يُلتزَم برأس المال طوال المدة المختارة.",
      }),
    },
    ru: {
      subject: "Заставьте металл работать — получайте структурированный доход на активы",
      html: body({
        eyebrowTxt: "Новое в вашем хранилище",
        leadTxt: "Ваше золото теперь может приносить доход.",
        paraTxt:
          "Передавайте выделенный металл в институциональные программы доходности и получайте доход с активов, которые иначе простаивали бы. Ставки привязаны к реальным рынкам аренды металла, а срок выбираете вы.",
        items: [
          "Выбор срока на 3, 6 или 12 месяцев",
          "Институциональные ставки на базе SOFR + рынков аренды",
          "Ваш металл остаётся выделенным и полностью учтённым весь срок",
        ],
        ctaUrl: URLS.yield,
        ctaTxt: "СМОТРЕТЬ СТАВКИ",
        noteTxt: "Доход переменный и зависит от условий программы. Капитал зарезервирован на выбранный срок.",
      }),
    },
  },

  // ── 4. AUXITE RADIO ─────────────────────────────────────────
  radio: {
    en: {
      subject: "Auxite Radio is live — your market, on air",
      html: body({
        eyebrowTxt: "New in your vault",
        leadTxt: "Tune in to the precious-metals market.",
        paraTxt:
          "Auxite Radio brings you live precious-metals updates, market segments and station music inside the app. Hourly briefings tracking real prices, with an end-of-day close — designed to keep you in the room without watching a screen.",
        items: [
          "Live market briefings refreshed through the day",
          "Real prices, segments and an end-of-day close",
          "Listen hands-free while you go about your day",
        ],
        ctaUrl: URLS.radio,
        ctaTxt: "LISTEN NOW",
        noteTxt: "Auxite Radio is informational only and not investment advice.",
      }),
    },
    tr: {
      subject: "Auxite Radio yayında — piyasanız artık eterde",
      html: body({
        eyebrowTxt: "Kasanızda yeni",
        leadTxt: "Değerli metal piyasasına kulak verin.",
        paraTxt:
          "Auxite Radio uygulama içinde canlı değerli metal güncellemeleri, piyasa segmentleri ve istasyon müziği sunar. Gerçek fiyatları takip eden saatlik bültenler ve gün sonu kapanışı — ekrana bakmadan piyasanın içinde kalmanız için tasarlandı.",
        items: [
          "Gün boyu yenilenen canlı piyasa bültenleri",
          "Gerçek fiyatlar, segmentler ve gün sonu kapanışı",
          "Gününüze devam ederken eller serbest dinleyin",
        ],
        ctaUrl: URLS.radio,
        ctaTxt: "ŞİMDİ DİNLE",
        noteTxt: "Auxite Radio yalnızca bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.",
      }),
    },
    de: {
      subject: "Auxite Radio ist live — Ihr Markt, auf Sendung",
      html: body({
        eyebrowTxt: "Neu in Ihrem Tresor",
        leadTxt: "Schalten Sie ein in den Edelmetallmarkt.",
        paraTxt:
          "Auxite Radio liefert Ihnen live Edelmetall-Updates, Marktsegmente und Sendermusik direkt in der App. Stündliche Briefings auf Basis realer Preise, mit einem Tagesabschluss — damit Sie dabei sind, ohne auf einen Bildschirm zu schauen.",
        items: [
          "Live-Marktbriefings, über den Tag aktualisiert",
          "Reale Preise, Segmente und ein Tagesabschluss",
          "Freihändig hören, während Sie Ihren Tag verbringen",
        ],
        ctaUrl: URLS.radio,
        ctaTxt: "JETZT HÖREN",
        noteTxt: "Auxite Radio dient nur der Information und ist keine Anlageberatung.",
      }),
    },
    fr: {
      subject: "Auxite Radio est en direct — votre marché, à l'antenne",
      html: body({
        eyebrowTxt: "Nouveau dans votre coffre",
        leadTxt: "Branchez-vous sur le marché des métaux précieux.",
        paraTxt:
          "Auxite Radio vous apporte des mises à jour en direct sur les métaux précieux, des segments de marché et de la musique, dans l'application. Des points horaires basés sur les prix réels, avec une clôture en fin de journée — pour rester dans le coup sans regarder un écran.",
        items: [
          "Points marché en direct, actualisés au fil de la journée",
          "Prix réels, segments et clôture de fin de journée",
          "Écoute mains libres tout au long de votre journée",
        ],
        ctaUrl: URLS.radio,
        ctaTxt: "ÉCOUTER",
        noteTxt: "Auxite Radio est purement informatif et ne constitue pas un conseil en investissement.",
      }),
    },
    ar: {
      dir: "rtl",
      subject: "Auxite Radio على الهواء — سوقك، يُبثّ الآن",
      html: body({
        dir: "rtl",
        eyebrowTxt: "جديد في خزنتك",
        leadTxt: "استمع إلى سوق المعادن الثمينة.",
        paraTxt:
          "يقدّم لك Auxite Radio تحديثات حيّة عن المعادن الثمينة وفقرات سوقية وموسيقى داخل التطبيق. نشرات كل ساعة تتابع الأسعار الحقيقية، مع إغلاق في نهاية اليوم — مصمَّم لإبقائك في قلب السوق دون النظر إلى شاشة.",
        items: [
          "نشرات سوقية حيّة تتحدّث على مدار اليوم",
          "أسعار حقيقية وفقرات وإغلاق نهاية اليوم",
          "استمع دون استخدام اليدين أثناء انشغالك بيومك",
        ],
        ctaUrl: URLS.radio,
        ctaTxt: "استمع الآن",
        noteTxt: "Auxite Radio لأغراض المعلومات فقط وليس نصيحة استثمارية.",
      }),
    },
    ru: {
      subject: "Auxite Radio в эфире — ваш рынок, в прямом эфире",
      html: body({
        eyebrowTxt: "Новое в вашем хранилище",
        leadTxt: "Настройтесь на рынок драгоценных металлов.",
        paraTxt:
          "Auxite Radio — это живые обновления по драгоценным металлам, рыночные сегменты и музыка прямо в приложении. Ежечасные сводки по реальным ценам и закрытие в конце дня — чтобы вы были в курсе, не глядя на экран.",
        items: [
          "Живые рыночные сводки, обновляемые в течение дня",
          "Реальные цены, сегменты и закрытие дня",
          "Слушайте без рук, занимаясь своими делами",
        ],
        ctaUrl: URLS.radio,
        ctaTxt: "СЛУШАТЬ",
        noteTxt: "Auxite Radio носит исключительно информационный характер и не является инвестиционной рекомендацией.",
      }),
    },
  },
};

function getTemplate(feature, lang) {
  const f = FEATURES[feature];
  if (!f) throw new Error(`Unknown feature "${feature}". Use: ${Object.keys(FEATURES).join(", ")}`);
  return f[(lang || "en").toLowerCase()] || f.en;
}

// ─────────────────────────────────────────────────────────────────
// Recipient collection — ALL registered users with an email
// ─────────────────────────────────────────────────────────────────
async function collectRecipients() {
  const keys = await redis.keys("auth:user:*");
  const out = [];
  for (const k of keys) {
    const data = await redis.hgetall(k);
    if (!data?.email) continue;
    out.push({
      email: data.email,
      language: (data.language || "en").toLowerCase(),
    });
  }
  const seen = new Set();
  return out.filter((r) => {
    const e = r.email.toLowerCase();
    return seen.has(e) ? false : (seen.add(e), true);
  });
}

// ─────────────────────────────────────────────────────────────────
// Modes
// ─────────────────────────────────────────────────────────────────
async function preview() {
  const recipients = await collectRecipients();
  const byLang = {};
  recipients.forEach((r) => {
    byLang[r.language] = (byLang[r.language] || 0) + 1;
  });
  console.log(JSON.stringify({ total: recipients.length, byLanguage: byLang }, null, 2));
}

// Dump all feature×language HTML files to scripts/email-out/ + a SUBJECTS.md
// reference, for pasting into the admin Email Campaign tab.
function dump() {
  const outDir = path.join(__dirname, "email-out");
  fs.mkdirSync(outDir, { recursive: true });
  const langs = ["en", "tr", "de", "fr", "ar", "ru"];
  const features = Object.keys(FEATURES);
  const lines = ["# Feature announcement campaigns — subjects + HTML files", ""];
  lines.push("Segment: **Tüm kullanıcılar (all)**. For each feature, send once per language with the language filter set.", "");

  for (const feature of features) {
    lines.push(`## ${feature.toUpperCase()}`, "");
    lines.push("| Lang | Subject | HTML file |");
    lines.push("|------|---------|-----------|");
    for (const lang of langs) {
      const t = getTemplate(feature, lang);
      const file = `${feature}-${lang}.html`;
      fs.writeFileSync(path.join(outDir, file), t.html, "utf8");
      lines.push(`| ${lang} | ${t.subject.replace(/\|/g, "\\|")} | \`email-out/${file}\` |`);
    }
    lines.push("");
  }
  fs.writeFileSync(path.join(outDir, "SUBJECTS.md"), lines.join("\n"), "utf8");
  console.log(`✓ Wrote ${features.length * langs.length} HTML files + SUBJECTS.md to ${outDir}`);
}

async function testSend(feature, email, lang) {
  const t = getTemplate(feature, lang);
  const r = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `[TEST ${(lang || "en").toUpperCase()}] ${t.subject}`,
    html: t.html,
  });
  console.log("test send:", r);
}

async function broadcast(feature) {
  const recipients = await collectRecipients();
  console.log(`📧 [${feature}] Sending to ${recipients.length} users...`);
  let sent = 0,
    failed = 0;
  const failures = [];

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (r) => {
        const t = getTemplate(feature, r.language);
        try {
          await resend.emails.send({ from: FROM, to: r.email, subject: t.subject, html: t.html });
          sent++;
        } catch (e) {
          failed++;
          failures.push({ email: r.email, lang: r.language, err: e?.message || String(e) });
        }
      })
    );
    process.stdout.write(
      `\r  progress: ${Math.min(i + BATCH_SIZE, recipients.length)}/${recipients.length}  sent=${sent}  failed=${failed}`
    );
    if (i + BATCH_SIZE < recipients.length) await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
  }
  console.log("");

  await redis.lpush(
    "email:campaigns:log",
    JSON.stringify({
      campaign: `feature:${feature}`,
      segment: "all_registered",
      totalRecipients: recipients.length,
      sent,
      failed,
      sentBy: "local-script",
      timestamp: Date.now(),
    })
  );
  await redis.ltrim("email:campaigns:log", 0, 99);

  console.log(`\n✓ Done [${feature}]. sent=${sent} failed=${failed}`);
  if (failures.length) console.log("first failures:", failures.slice(0, 5));
}

// ─────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const argMap = {};
args.forEach((a) => {
  const [k, v] = a.replace(/^-+/, "").split("=");
  argMap[k] = v ?? true;
});

const USAGE = `Usage:
  node --env-file=.env.local scripts/send-feature-announcements.js --feature=<convert|withdraw|yield|radio> --preview
  node --env-file=.env.local scripts/send-feature-announcements.js --feature=convert --test=you@example.com --lang=tr
  node --env-file=.env.local scripts/send-feature-announcements.js --feature=convert --send`;

(async () => {
  const feature = argMap.feature;
  if (argMap.dump) {
    dump();
  } else if (argMap.preview) {
    await preview();
  } else if (argMap.test) {
    if (!feature) return console.log("Missing --feature\n" + USAGE);
    await testSend(feature, argMap.test, argMap.lang || "en");
  } else if (argMap.send) {
    if (!feature) return console.log("Missing --feature\n" + USAGE);
    await broadcast(feature);
  } else {
    console.log(USAGE);
  }
})();
