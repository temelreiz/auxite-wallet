// scripts/kyc-prompt-content.mjs
// Shared 6-language copy for the KYC-completion reminder campaign.
// Targets users who signed up but haven't completed identity verification.
// Hook: 5 AUXG Welcome Gold unlocks on KYC completion.

const VAULT_URL = "https://vault.auxite.io";

// ── Push (60-char title cap, 178-char body cap on Android) ──
export const PUSH = {
  en: {
    title: "🪙 5 AUXG waiting for you",
    body: "Finish identity verification (2 min) to unlock your Welcome Gold and start buying.",
  },
  tr: {
    title: "🪙 5 AUXG sizi bekliyor",
    body: "Kimlik doğrulamayı bitirin (2 dk), Hoş Geldin Altını'nızı aktive edin ve metal alımına başlayın.",
  },
  de: {
    title: "🪙 5 AUXG warten auf Sie",
    body: "Identitätsprüfung (2 Min) abschließen, um Ihr Welcome Gold freizuschalten und Metalle zu kaufen.",
  },
  fr: {
    title: "🪙 5 AUXG vous attendent",
    body: "Finalisez la vérification d'identité (2 min) pour débloquer votre Welcome Gold.",
  },
  ar: {
    title: "🪙 5 AUXG في انتظارك",
    body: "أكمل التحقق من الهوية (دقيقتان) لتفعيل ذهب الترحيب الخاص بك.",
  },
  ru: {
    title: "🪙 Ваши 5 AUXG ждут вас",
    body: "Завершите верификацию (2 мин) чтобы активировать Welcome Gold и начать инвестировать.",
  },
};

// ── Email render ──
function ctaBlock(url, text) {
  return `<div style="text-align:center;margin:28px 0">
    <a href="${url}" style="display:inline-block;background:#1a1a1a;color:#fff!important;padding:14px 32px;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:1.5px">${text}</a>
  </div>`;
}
function highlight(text) {
  return `<div style="background:#fafafa;border-left:3px solid #C5A55A;padding:14px 18px;margin:18px 0">
    <p style="font-size:13px;color:#444;margin:0;line-height:1.7">${text}</p>
  </div>`;
}

function renderEmail({ title, intro, steps, closing, ctaText, ctaUrl, language, unsubUrl, footer }) {
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
          <ol style="color:#444;font-size:13px;line-height:1.9;padding-left:20px;margin:0 0 14px 0;">
            ${steps.map((s) => `<li>${s}</li>`).join("\n")}
          </ol>
          ${highlight(closing)}
          ${ctaBlock(ctaUrl, ctaText)}
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
    subject: "Your 5 AUXG Welcome Gold is still waiting",
    title: "Finish verification — start with 5 AUXG",
    intro: "You opened an Auxite account but haven't completed identity verification yet. Your <strong>5 AUXG Welcome Gold</strong> (~$430 at spot) is still reserved for you.",
    steps: [
      "Open the Auxite app",
      "Tap <strong>Verify identity</strong> on your home screen",
      "Snap your ID + a quick selfie (2 minutes via Sumsub)",
      "Welcome Gold credits to your vault instantly",
    ],
    closing: "After verification you can also fund with card, bank wire, or crypto — and start building a real, physically-allocated metal portfolio from $50.",
    ctaText: "VERIFY MY IDENTITY",
    footer: "Verification uses Sumsub, the same provider trusted by major fintech and crypto platforms. Your data is encrypted end-to-end.",
  },
  tr: {
    subject: "5 AUXG Hoş Geldin Altınınız hâlâ bekliyor",
    title: "Doğrulamayı bitirin — 5 AUXG ile başlayın",
    intro: "Auxite hesabı açtınız ama kimlik doğrulamayı henüz tamamlamadınız. <strong>5 AUXG Hoş Geldin Altınınız</strong> (~$430) hâlâ sizin için ayrılmış durumda.",
    steps: [
      "Auxite uygulamasını açın",
      "Ana ekranda <strong>Kimliğini Doğrula</strong>'ya dokunun",
      "Kimliğinizi + kısa bir selfie çekin (Sumsub ile 2 dakika)",
      "Hoş Geldin Altınınız anında kasaya yüklenir",
    ],
    closing: "Doğrulama sonrası kart, banka havalesi veya kripto ile de fonlama yapabilir, $50'dan başlayarak fiziksel metal portföyü oluşturabilirsiniz.",
    ctaText: "KİMLİĞİMİ DOĞRULA",
    footer: "Doğrulama Sumsub altyapısı üzerinden — büyük fintech ve kripto platformlarının güvendiği aynı sağlayıcı. Verileriniz uçtan uca şifrelenir.",
  },
  de: {
    subject: "Ihr 5 AUXG Welcome Gold wartet noch",
    title: "Verifizierung abschließen — mit 5 AUXG starten",
    intro: "Sie haben ein Auxite-Konto eröffnet, aber die Identitätsprüfung noch nicht abgeschlossen. Ihr <strong>5 AUXG Welcome Gold</strong> (~$430) ist weiterhin für Sie reserviert.",
    steps: [
      "Auxite-App öffnen",
      "Auf <strong>Identität verifizieren</strong> tippen",
      "Ausweis + kurzes Selfie aufnehmen (2 Minuten über Sumsub)",
      "Welcome Gold wird sofort gutgeschrieben",
    ],
    closing: "Nach der Verifizierung können Sie auch per Karte, Banküberweisung oder Krypto einzahlen und ab $50 ein physisch allokiertes Metallportfolio aufbauen.",
    ctaText: "IDENTITÄT VERIFIZIEREN",
    footer: "Verifizierung erfolgt über Sumsub — der gleiche Anbieter, dem führende Fintech- und Krypto-Plattformen vertrauen.",
  },
  fr: {
    subject: "Vos 5 AUXG Welcome Gold vous attendent toujours",
    title: "Terminez la vérification — commencez avec 5 AUXG",
    intro: "Vous avez ouvert un compte Auxite mais n'avez pas terminé la vérification d'identité. Vos <strong>5 AUXG Welcome Gold</strong> (~430 $) sont toujours réservés.",
    steps: [
      "Ouvrir l'application Auxite",
      "Toucher <strong>Vérifier l'identité</strong>",
      "Photographier votre pièce d'identité + selfie (2 minutes via Sumsub)",
      "Le Welcome Gold est crédité instantanément",
    ],
    closing: "Après la vérification, vous pourrez aussi financer par carte, virement bancaire ou crypto, et construire un portefeuille de métaux physiques à partir de 50 $.",
    ctaText: "VÉRIFIER MON IDENTITÉ",
    footer: "Vérification via Sumsub — le même prestataire utilisé par les principales plateformes fintech et crypto.",
  },
  ar: {
    subject: "5 AUXG ذهب الترحيب لا يزال بانتظارك",
    title: "أكمل التحقق — ابدأ بـ 5 AUXG",
    intro: "لقد فتحت حساب Auxite ولكن لم تكمل التحقق من الهوية بعد. <strong>5 AUXG ذهب الترحيب</strong> الخاص بك (~430 دولار) لا يزال محجوزاً لك.",
    steps: [
      "افتح تطبيق Auxite",
      "اضغط على <strong>التحقق من الهوية</strong>",
      "صوّر هويتك + سيلفي قصير (دقيقتان عبر Sumsub)",
      "يضاف ذهب الترحيب إلى خزنتك فوراً",
    ],
    closing: "بعد التحقق يمكنك التمويل بالبطاقة أو الحوالة البنكية أو الكريبتو، وبناء محفظة معادن فيزيائية من 50 دولار.",
    ctaText: "تحقق من الهوية",
    footer: "التحقق عبر Sumsub، نفس مزود الخدمة الموثوق لدى كبرى منصات الفينتك والكريبتو.",
  },
  ru: {
    subject: "Ваши 5 AUXG Welcome Gold всё ещё ждут",
    title: "Завершите верификацию — начните с 5 AUXG",
    intro: "Вы открыли счёт Auxite, но не завершили верификацию личности. Ваши <strong>5 AUXG Welcome Gold</strong> (~$430) всё ещё зарезервированы.",
    steps: [
      "Откройте приложение Auxite",
      "Нажмите <strong>Подтвердить личность</strong>",
      "Сфотографируйте документ + сделайте селфи (2 минуты через Sumsub)",
      "Welcome Gold зачислится в хранилище мгновенно",
    ],
    closing: "После верификации вы сможете пополнить картой, банковским переводом или криптой, и собрать портфель физических металлов от $50.",
    ctaText: "ПОДТВЕРДИТЬ ЛИЧНОСТЬ",
    footer: "Верификация через Sumsub — тот же провайдер, что используют ведущие финтех и крипто платформы.",
  },
};

export function getEmailContent(lang, email, unsubToken) {
  const c = EMAIL_CONTENT[lang] || EMAIL_CONTENT.en;
  const ctaUrl = `${VAULT_URL}?utm_source=email&utm_medium=kyc-prompt&utm_campaign=kyc_prompt_v1`;
  const unsubUrl = `${VAULT_URL}/unsubscribe?email=${encodeURIComponent(email)}&token=${unsubToken}`;
  return {
    subject: c.subject,
    html: renderEmail({
      title: c.title,
      intro: c.intro,
      steps: c.steps,
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
