// scripts/lite-launch-content.mjs
// Shared 6-language copy for the "Auxite Lite is live" launch campaign.
// Consumed by both send-lite-launch-push.mjs and send-lite-launch-email.mjs.

const VAULT_URL = "https://vault.auxite.io";

// ── Push notifications (60-char title cap, 178-char body cap on Android) ──
export const PUSH = {
  en: {
    title: "🥇 Auxite Lite is live",
    body: "We rebuilt it. Buy gold in one tap. Same vault-grade custody.",
  },
  tr: {
    title: "🥇 Auxite Lite yayında",
    body: "Yenilendik. Tek dokunuşla altın al. Aynı kurumsal güvenlik.",
  },
  de: {
    title: "🥇 Auxite Lite ist da",
    body: "Neu aufgebaut. Gold mit einem Tipp kaufen. Gleiche institutionelle Verwahrung.",
  },
  fr: {
    title: "🥇 Auxite Lite est disponible",
    body: "On a tout simplifié. Achetez de l'or en un tap. Même garde institutionnelle.",
  },
  ar: {
    title: "🥇 Auxite Lite متاح الآن",
    body: "أعدنا بناءه. اشترِ الذهب بنقرة واحدة. نفس الحفظ المؤسسي.",
  },
  ru: {
    title: "🥇 Auxite Lite доступен",
    body: "Мы переделали приложение. Покупай золото в один тап. Та же институциональная защита.",
  },
};

// ── Email subject + body ──
// Same gold-accent template as winback for visual consistency.
function ctaBlock(url, text, isRtl) {
  return `<div style="text-align:center;margin:28px 0">
    <a href="${url}" style="display:inline-block;background:#1a1a1a;color:#fff!important;padding:14px 32px;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:1.5px">${text}</a>
  </div>`;
}

function highlight(text) {
  return `<div style="background:#fafafa;border-left:3px solid #C5A55A;padding:14px 18px;margin:18px 0">
    <p style="font-size:13px;color:#444;margin:0;line-height:1.7">${text}</p>
  </div>`;
}

function renderEmail({ title, intro, bullets, closing, ctaText, ctaUrl, language, unsubUrl, footer }) {
  const dir = language === "ar" ? "rtl" : "ltr";
  const unsubLabel =
    language === "tr" ? "Bu emaillerden çık" :
    language === "de" ? "Abmelden" :
    language === "fr" ? "Se désinscrire" :
    language === "ar" ? "إلغاء الاشتراك" :
    language === "ru" ? "Отписаться" : "Unsubscribe";
  const opCommLabel =
    language === "tr" ? "Bu mesaj operasyonel bir bildirim niteliğindedir. Lütfen yanıtlamayınız." :
    language === "de" ? "Diese Nachricht ist eine betriebliche Mitteilung. Bitte nicht antworten." :
    language === "fr" ? "Ce message est une communication opérationnelle. Merci de ne pas répondre." :
    language === "ar" ? "هذه الرسالة هي إشعار تشغيلي. يرجى عدم الرد." :
    language === "ru" ? "Это операционное уведомление. Не отвечайте на него." :
    "This message serves as an operational communication. Please do not reply.";

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${language}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;">
        <tr><td style="height:3px;background:#C5A55A;"></td></tr>
        <tr><td style="padding:24px 30px 16px;border-bottom:1px solid #e5e5e5;">
          <h1 style="font-size:13px;letter-spacing:5px;color:#1a1a1a;font-weight:700;margin:0 0 2px 0;">AUXITE</h1>
          <p style="font-size:11px;color:#888;margin:0;">Custody &amp; Settlement Services</p>
        </td></tr>
        <tr><td style="padding:28px 30px;">
          <h2 style="font-size:20px;color:#1a1a1a;font-weight:400;margin:0 0 18px 0;">${title}</h2>
          <p style="color:#444;font-size:14px;line-height:1.7;margin:0 0 14px 0;">${intro}</p>
          <ul style="color:#444;font-size:13px;line-height:1.9;padding-left:20px;margin:0 0 14px 0;">
            ${bullets.map((b) => `<li>${b}</li>`).join("\n")}
          </ul>
          ${highlight(closing)}
          ${ctaBlock(ctaUrl, ctaText, dir === "rtl")}
          ${footer ? `<p style="font-size:12px;color:#666;line-height:1.6;font-style:italic;margin:18px 0 0 0">${footer}</p>` : ""}
          <p style="font-size:10px;color:#999;margin-top:24px;padding-top:16px;border-top:1px solid #eee;font-style:italic;">${opCommLabel}</p>
        </td></tr>
        <tr><td style="padding:16px 30px;border-top:1px solid #e5e5e5;text-align:center;">
          <p style="font-size:9px;color:#aaa;margin:4px 0;">Aurum Ledger Ltd &middot; Hong Kong</p>
          <p style="font-size:9px;color:#aaa;margin:4px 0;"><a href="${unsubUrl}" style="color:#aaa;text-decoration:underline;">${unsubLabel}</a></p>
        </td></tr>
        <tr><td style="height:2px;background:#C5A55A;"></td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const EMAIL_CONTENT = {
  en: {
    subject: "We made buying gold easier",
    title: "One tap. Real gold. Auxite Lite is live.",
    intro: "We watched how you used Auxite and rebuilt it. The new <strong>Lite mode</strong> launches today — it's the default for new sessions.",
    bullets: [
      "<strong>One tap to buy</strong> — pick an amount, confirm with Apple Pay or Google Pay",
      "<strong>One tap to sell</strong> — your metal balance, ready to convert anytime",
      "<strong>Today's prices</strong> at a glance — gold, silver, platinum, palladium",
      "<strong>Pro mode is one toggle away</strong> — institutional view stays for advanced users",
    ],
    closing: "Same LBMA Good Delivery custody in Zurich. Same Aurum Ledger HK entity. Just simpler on the surface.",
    ctaText: "OPEN AUXITE",
    footer: "If you're an existing user — your account, balances, and KYC are all intact. Just open the app and you'll land on the new home.",
  },
  tr: {
    subject: "Altın almayı kolaylaştırdık",
    title: "Tek dokunuş. Gerçek altın. Auxite Lite yayında.",
    intro: "Auxite'i nasıl kullandığınızı izledik ve yeniden inşa ettik. Yeni <strong>Lite modu</strong> bugün canlı — yeni oturumlar için varsayılan.",
    bullets: [
      "<strong>Tek dokunuşla al</strong> — tutarı seç, Apple Pay veya Google Pay ile onayla",
      "<strong>Tek dokunuşla sat</strong> — metal bakiyeniz dilediğiniz zaman dönüşüme hazır",
      "<strong>Günün fiyatları</strong> tek bakışta — altın, gümüş, platin, paladyum",
      "<strong>Pro modu bir tıklama uzakta</strong> — kurumsal görünüm ileri seviye kullanıcılar için kalıyor",
    ],
    closing: "Aynı LBMA Good Delivery saklaması, Zürih'te. Aynı Aurum Ledger HK tüzel kişisi. Sadece yüzeyde daha sade.",
    ctaText: "AUXITE'I AÇ",
    footer: "Mevcut kullanıcıysan — hesabın, bakiyelerin ve KYC'in tam olarak yerinde. Uygulamayı aç, doğrudan yeni anasayfada olacaksın.",
  },
  de: {
    subject: "Gold kaufen — jetzt einfacher",
    title: "Ein Tipp. Echtes Gold. Auxite Lite ist da.",
    intro: "Wir haben beobachtet, wie Sie Auxite nutzen, und neu aufgebaut. Der neue <strong>Lite-Modus</strong> startet heute — und ist Standard für neue Sitzungen.",
    bullets: [
      "<strong>Ein Tipp zum Kaufen</strong> — Betrag wählen, mit Apple Pay oder Google Pay bestätigen",
      "<strong>Ein Tipp zum Verkaufen</strong> — Ihr Metall-Saldo jederzeit konvertierbar",
      "<strong>Tagespreise</strong> auf einen Blick — Gold, Silber, Platin, Palladium",
      "<strong>Pro-Modus ist einen Klick entfernt</strong> — institutionelle Ansicht bleibt für Fortgeschrittene",
    ],
    closing: "Gleiche LBMA-Good-Delivery-Verwahrung in Zürich. Gleiche Aurum Ledger HK. Nur einfacher an der Oberfläche.",
    ctaText: "AUXITE ÖFFNEN",
    footer: "Wenn Sie bereits Kunde sind — Ihr Konto, Ihre Guthaben und KYC bleiben unverändert. Einfach App öffnen.",
  },
  fr: {
    subject: "On a simplifié l'achat d'or",
    title: "Un tap. De l'or réel. Auxite Lite est disponible.",
    intro: "Nous avons observé comment vous utilisez Auxite et avons tout reconstruit. Le nouveau <strong>mode Lite</strong> est en ligne aujourd'hui — par défaut pour les nouvelles sessions.",
    bullets: [
      "<strong>Un tap pour acheter</strong> — choisissez un montant, confirmez avec Apple Pay ou Google Pay",
      "<strong>Un tap pour vendre</strong> — votre solde métal, convertible à tout moment",
      "<strong>Prix du jour</strong> en un coup d'œil — or, argent, platine, palladium",
      "<strong>Mode Pro à un clic</strong> — vue institutionnelle pour les utilisateurs avancés",
    ],
    closing: "Même garde LBMA Good Delivery à Zurich. Même entité Aurum Ledger HK. Juste plus simple en surface.",
    ctaText: "OUVRIR AUXITE",
    footer: "Si vous êtes déjà client — votre compte, vos soldes et votre KYC sont intacts. Ouvrez simplement l'app.",
  },
  ar: {
    subject: "جعلنا شراء الذهب أسهل",
    title: "نقرة واحدة. ذهب حقيقي. Auxite Lite متاح الآن.",
    intro: "راقبنا كيف تستخدم Auxite وأعدنا بناءه. <strong>وضع Lite</strong> الجديد متاح اليوم — وهو الافتراضي للجلسات الجديدة.",
    bullets: [
      "<strong>نقرة للشراء</strong> — اختر المبلغ، أكّد بـ Apple Pay أو Google Pay",
      "<strong>نقرة للبيع</strong> — رصيدك المعدني، قابل للتحويل في أي وقت",
      "<strong>أسعار اليوم</strong> في لمحة — ذهب، فضة، بلاتين، بلاديوم",
      "<strong>وضع Pro على بُعد نقرة</strong> — الواجهة المؤسسية للمستخدمين المتقدمين",
    ],
    closing: "نفس حفظ LBMA Good Delivery في زيورخ. نفس كيان Aurum Ledger HK. فقط أبسط على السطح.",
    ctaText: "افتح Auxite",
    footer: "إذا كنت عميلاً حالياً — حسابك ورصيدك وKYC الخاص بك سليم. افتح التطبيق فقط.",
  },
  ru: {
    subject: "Покупать золото стало проще",
    title: "Один тап. Настоящее золото. Auxite Lite в эфире.",
    intro: "Мы изучили, как вы используете Auxite, и переделали его. Новый <strong>режим Lite</strong> запускается сегодня — по умолчанию для новых сессий.",
    bullets: [
      "<strong>Один тап для покупки</strong> — выбери сумму, подтверди через Apple Pay или Google Pay",
      "<strong>Один тап для продажи</strong> — твой металл, в любой момент конвертируемый",
      "<strong>Сегодняшние цены</strong> с первого взгляда — золото, серебро, платина, палладий",
      "<strong>Режим Pro в один тап</strong> — институциональный вид для опытных пользователей",
    ],
    closing: "То же хранение LBMA Good Delivery в Цюрихе. Тот же субъект Aurum Ledger HK. Просто проще на поверхности.",
    ctaText: "ОТКРЫТЬ AUXITE",
    footer: "Если ты уже клиент — твой аккаунт, балансы и KYC сохранены. Просто открой приложение.",
  },
};

export function getEmailContent(lang, email, unsubToken) {
  const c = EMAIL_CONTENT[lang] || EMAIL_CONTENT.en;
  const ctaUrl = `${VAULT_URL}?utm_source=email&utm_medium=launch&utm_campaign=lite_launch_v1`;
  const unsubUrl = `${VAULT_URL}/unsubscribe?email=${encodeURIComponent(email)}&token=${unsubToken}`;
  return {
    subject: c.subject,
    html: renderEmail({
      title: c.title,
      intro: c.intro,
      bullets: c.bullets,
      closing: c.closing,
      ctaText: c.ctaText,
      ctaUrl,
      language: lang,
      unsubUrl,
      footer: c.footer,
    }),
  };
}

export function getPushContent(lang) {
  return PUSH[lang] || PUSH.en;
}
