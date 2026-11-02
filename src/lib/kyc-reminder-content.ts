// src/lib/kyc-reminder-content.ts
// Copy for the "verify your account" reminders (push every other day, email on
// a few later days — see src/app/api/cron/kyc-reminder-push/route.ts).
//
// No gold is promised for verifying: KYC approval grants nothing on its own
// (welcome gold is only credited by /api/welcome-gold after a demo trade, and
// almost never has been). The only reward named is the first-deposit match,
// read from BONUS_CONFIG and shown only while it is enabled.

import { BONUS_CONFIG } from "@/lib/metal-bonus-service";

export type ReminderLang = "en" | "tr" | "de" | "fr" | "ar" | "ru";

/** First-deposit match line, or null when the match is off. */
function matchTerms(): { pct: number; min: number; cap: number } | null {
  if (!BONUS_CONFIG.enabled || !BONUS_CONFIG.firstDepositMatchEnabled) return null;
  return {
    pct: BONUS_CONFIG.firstDepositMatchPercent,
    min: BONUS_CONFIG.firstDepositMatchMinUsd,
    cap: BONUS_CONFIG.firstDepositMatchCapUsd,
  };
}

function lang(l: string): ReminderLang {
  const x = (l || "en").toLowerCase().slice(0, 2);
  return (["en", "tr", "de", "fr", "ar", "ru"] as const).includes(x as ReminderLang) ? (x as ReminderLang) : "en";
}

// ── Push ─────────────────────────────────────────────────────────────────────

export function kycReminderPush(language: string): { title: string; body: string } {
  const m = matchTerms();
  const t: Record<ReminderLang, { title: string; body: string; match: string }> = {
    en: { title: "Verify your Auxite account", body: "About 2 minutes with a valid ID. Protects your account and unlocks full access and higher limits.", match: ` Your first deposit then earns a ${m?.pct}% gold match.` },
    tr: { title: "Auxite hesabınızı doğrulayın", body: "Geçerli bir kimlikle yaklaşık 2 dakika. Hesabınızı korur; tam erişim ve yüksek limitleri açar.", match: ` Ardından ilk yatırımınıza altın olarak %${m?.pct} bonus.` },
    de: { title: "Verifizieren Sie Ihr Auxite-Konto", body: "Etwa 2 Minuten mit gültigem Ausweis. Schützt Ihr Konto und schaltet vollen Zugang und höhere Limits frei.", match: ` Ihre erste Einzahlung erhält dann ${m?.pct}% Bonus in Gold.` },
    fr: { title: "Vérifiez votre compte Auxite", body: "Environ 2 minutes avec une pièce d'identité. Protège votre compte et débloque l'accès complet et des limites plus élevées.", match: ` Votre premier dépôt reçoit ensuite ${m?.pct} % de bonus en or.` },
    ar: { title: "وثّق حسابك في Auxite", body: "حوالي دقيقتين بوثيقة هوية صالحة. يحمي حسابك ويفتح الوصول الكامل وحدوداً أعلى.", match: ` بعدها يحصل أول إيداع لك على مكافأة ${m?.pct}% بالذهب.` },
    ru: { title: "Подтвердите аккаунт Auxite", body: "Около 2 минут с действующим документом. Защищает аккаунт и открывает полный доступ и повышенные лимиты.", match: ` Затем первый депозит получит бонус ${m?.pct}% золотом.` },
  };
  const x = t[lang(language)];
  return { title: x.title, body: m ? x.body + x.match : x.body };
}

// ── Email ────────────────────────────────────────────────────────────────────

export interface KycReminderEmailText {
  subject: string;
  title: string;
  intro: string;
  reasonsTitle: string;
  reasons: string[];
  stepsTitle: string;
  steps: string[];
  match: string | null;
  cta: string;
  footnote: string;
}

export function kycReminderEmail(language: string, daysSinceSignup: number): KycReminderEmailText {
  const m = matchTerms();
  const weeks = Math.max(1, Math.floor(daysSinceSignup / 7));
  const L = lang(language);

  const t: Record<ReminderLang, Omit<KycReminderEmailText, "match"> & { match: (p: number, min: number, cap: number) => string }> = {
    en: {
      subject: "Complete your Auxite account verification",
      title: "Complete your verification",
      intro: weeks === 1 ? "It's been a week since you opened your Auxite account, and it isn't verified yet." : `It's been ${weeks} weeks since you opened your Auxite account, and it isn't verified yet.`,
      reasonsTitle: "Why verify?",
      reasons: [
        "<strong>Account security</strong> — protects your account from unauthorised activity.",
        "<strong>Full access</strong> — allocation, withdrawals and higher limits.",
      ],
      stepsTitle: "Three steps, about two minutes",
      steps: ["Sign in to your Auxite account.", "Upload a valid ID document — your data is encrypted.", "Wait for approval, usually within minutes."],
      match: (p, min, cap) => `After verification, your first crypto deposit of $${min} or more earns a ${p}% match in gold (up to $${cap}).`,
      cta: "VERIFY MY ACCOUNT",
      footnote: "Bonuses are subject to the platform's terms and eligibility.",
    },
    tr: {
      subject: "Auxite hesabınızın doğrulamasını tamamlayın",
      title: "Doğrulamanızı tamamlayın",
      intro: weeks === 1 ? "Auxite hesabınızı açalı bir hafta oldu ve hesabınız henüz doğrulanmadı." : `Auxite hesabınızı açalı ${weeks} hafta oldu ve hesabınız henüz doğrulanmadı.`,
      reasonsTitle: "Neden doğrulamalısınız?",
      reasons: [
        "<strong>Hesap güvenliği</strong> — hesabınızı yetkisiz işlemlere karşı korur.",
        "<strong>Tam erişim</strong> — tahsis, çekim ve daha yüksek limitler.",
      ],
      stepsTitle: "Üç adım, yaklaşık iki dakika",
      steps: ["Auxite hesabınıza giriş yapın.", "Geçerli bir kimlik belgesi yükleyin — verileriniz şifrelenir.", "Onayı bekleyin, genellikle birkaç dakika sürer."],
      match: (p, min, cap) => `Doğrulamadan sonra ${min}$ ve üzeri ilk kripto yatırımınıza altın olarak %${p} ek bonus verilir (en fazla ${cap}$).`,
      cta: "HESABIMI DOĞRULA",
      footnote: "Bonuslar platform koşullarına ve uygunluğa tabidir.",
    },
    de: {
      subject: "Schließen Sie die Verifizierung Ihres Auxite-Kontos ab",
      title: "Schließen Sie Ihre Verifizierung ab",
      intro: weeks === 1 ? "Vor einer Woche haben Sie Ihr Auxite-Konto eröffnet; es ist noch nicht verifiziert." : `Vor ${weeks} Wochen haben Sie Ihr Auxite-Konto eröffnet; es ist noch nicht verifiziert.`,
      reasonsTitle: "Warum verifizieren?",
      reasons: [
        "<strong>Kontosicherheit</strong> — schützt Ihr Konto vor unbefugten Aktivitäten.",
        "<strong>Voller Zugang</strong> — Allokation, Auszahlungen und höhere Limits.",
      ],
      stepsTitle: "Drei Schritte, etwa zwei Minuten",
      steps: ["Melden Sie sich bei Ihrem Auxite-Konto an.", "Laden Sie einen gültigen Ausweis hoch — Ihre Daten werden verschlüsselt.", "Warten Sie auf die Freigabe, meist innerhalb von Minuten."],
      match: (p, min, cap) => `Nach der Verifizierung erhält Ihre erste Krypto-Einzahlung ab $${min} einen Bonus von ${p}% in Gold (bis zu $${cap}).`,
      cta: "KONTO VERIFIZIEREN",
      footnote: "Boni unterliegen den Bedingungen der Plattform und der Berechtigung.",
    },
    fr: {
      subject: "Finalisez la vérification de votre compte Auxite",
      title: "Finalisez votre vérification",
      intro: weeks === 1 ? "Vous avez ouvert votre compte Auxite il y a une semaine et il n'est pas encore vérifié." : `Vous avez ouvert votre compte Auxite il y a ${weeks} semaines et il n'est pas encore vérifié.`,
      reasonsTitle: "Pourquoi vérifier ?",
      reasons: [
        "<strong>Sécurité du compte</strong> — protège votre compte contre toute activité non autorisée.",
        "<strong>Accès complet</strong> — allocation, retraits et limites plus élevées.",
      ],
      stepsTitle: "Trois étapes, environ deux minutes",
      steps: ["Connectez-vous à votre compte Auxite.", "Téléchargez une pièce d'identité valide — vos données sont chiffrées.", "Attendez l'approbation, généralement en quelques minutes."],
      match: (p, min, cap) => `Après vérification, votre premier dépôt crypto de ${min} $ ou plus reçoit un bonus de ${p} % en or (jusqu'à ${cap} $).`,
      cta: "VÉRIFIER MON COMPTE",
      footnote: "Les bonus sont soumis aux conditions de la plateforme et à l'éligibilité.",
    },
    ar: {
      subject: "أكمل التحقق من حسابك في Auxite",
      title: "أكمل التحقق من حسابك",
      intro: weeks === 1 ? "مر أسبوع على فتح حسابك في Auxite ولم يتم التحقق منه بعد." : `مرت ${weeks} أسابيع على فتح حسابك في Auxite ولم يتم التحقق منه بعد.`,
      reasonsTitle: "لماذا التحقق؟",
      reasons: [
        "<strong>أمان الحساب</strong> — يحمي حسابك من أي نشاط غير مصرح به.",
        "<strong>وصول كامل</strong> — التخصيص والسحب وحدود أعلى.",
      ],
      stepsTitle: "ثلاث خطوات، حوالي دقيقتين",
      steps: ["سجّل الدخول إلى حسابك في Auxite.", "ارفع وثيقة هوية صالحة — بياناتك مشفرة.", "انتظر الموافقة، عادةً خلال دقائق."],
      match: (p, min, cap) => `بعد التحقق، يحصل أول إيداع عملات مشفرة لك بقيمة ${min}$ أو أكثر على مكافأة ${p}% بالذهب (حتى ${cap}$).`,
      cta: "وثّق حسابي",
      footnote: "تخضع المكافآت لشروط المنصة والأهلية.",
    },
    ru: {
      subject: "Завершите верификацию аккаунта Auxite",
      title: "Завершите верификацию",
      intro: weeks === 1 ? "Прошла неделя с открытия вашего аккаунта Auxite, а он ещё не подтверждён." : `Прошло ${weeks} нед. с открытия вашего аккаунта Auxite, а он ещё не подтверждён.`,
      reasonsTitle: "Зачем проходить верификацию?",
      reasons: [
        "<strong>Безопасность</strong> — защищает аккаунт от несанкционированных действий.",
        "<strong>Полный доступ</strong> — размещение, вывод и повышенные лимиты.",
      ],
      stepsTitle: "Три шага, около двух минут",
      steps: ["Войдите в аккаунт Auxite.", "Загрузите действующий документ — данные шифруются.", "Дождитесь одобрения, обычно в течение нескольких минут."],
      match: (p, min, cap) => `После верификации первый криптодепозит от $${min} получает бонус ${p}% золотом (до $${cap}).`,
      cta: "ПОДТВЕРДИТЬ АККАУНТ",
      footnote: "Бонусы предоставляются в соответствии с условиями платформы.",
    },
  };

  // Accounts opened months ago: "it's been 40 weeks" reads like a nag, so
  // past a month the intro just states the account isn't verified.
  const longAgo: Record<ReminderLang, string> = {
    en: "Your Auxite account is open but not verified yet.",
    tr: "Auxite hesabınız açık ancak henüz doğrulanmadı.",
    de: "Ihr Auxite-Konto ist eröffnet, aber noch nicht verifiziert.",
    fr: "Votre compte Auxite est ouvert mais pas encore vérifié.",
    ar: "حسابك في Auxite مفتوح لكنه لم يتم التحقق منه بعد.",
    ru: "Ваш аккаунт Auxite открыт, но ещё не подтверждён.",
  };
  const x = t[L];
  return {
    ...x,
    intro: daysSinceSignup > 31 ? longAgo[L] : x.intro,
    match: m ? x.match(m.pct, m.min, m.cap) : null,
  };
}

/** Rendered reminder email, same house style as the drip emails. */
export function renderKycReminderEmail(
  language: string,
  daysSinceSignup: number,
  unsubscribeLink: string,
): { subject: string; html: string } {
  const c = kycReminderEmail(language, daysSinceSignup);
  const L = lang(language);
  const dir = L === "ar" ? "rtl" : "ltr";
  const li = (s: string) => `<li style="margin:0 0 8px 0">${s}</li>`;
  const unsub: Record<ReminderLang, string> = {
    en: "Unsubscribe from these reminders", tr: "Bu hatırlatmalardan çık", de: "Diese Erinnerungen abbestellen",
    fr: "Se désabonner de ces rappels", ar: "إلغاء الاشتراك في هذه التذكيرات", ru: "Отписаться от напоминаний",
  };
  const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${L}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${c.title}</title></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px;"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;">
      <tr><td style="height:3px;background:#C5A55A;"></td></tr>
      <tr><td style="padding:24px 30px 16px;border-bottom:1px solid #e5e5e5;">
        <h1 style="font-size:13px;letter-spacing:5px;color:#1a1a1a;font-weight:700;margin:0 0 2px 0;">AUXITE</h1>
        <p style="font-size:11px;color:#888;margin:0;">Custody &amp; Settlement Services</p>
      </td></tr>
      <tr><td style="padding:28px 30px;color:#444;font-size:13px;line-height:1.7;">
        <h2 style="font-size:16px;color:#1a1a1a;font-weight:400;margin:0 0 16px 0;">${c.title}</h2>
        <p>${c.intro}</p>
        <p style="margin:18px 0 6px;color:#1a1a1a;font-weight:600;">${c.reasonsTitle}</p>
        <ul style="padding-${dir === "rtl" ? "right" : "left"}:18px;margin:0;">${c.reasons.map(li).join("")}</ul>
        <p style="margin:18px 0 6px;color:#1a1a1a;font-weight:600;">${c.stepsTitle}</p>
        <ol style="padding-${dir === "rtl" ? "right" : "left"}:18px;margin:0;">${c.steps.map(li).join("")}</ol>
        ${c.match ? `<div style="background:#fafafa;border-${dir === "rtl" ? "right" : "left"}:3px solid #C5A55A;padding:14px 18px;margin:18px 0"><p style="font-size:13px;color:#444;margin:0;line-height:1.7">${c.match}</p></div>` : ""}
        <div style="text-align:center;margin:24px 0"><a href="https://vault.auxite.io/kyc" style="display:inline-block;background:#1a1a1a;color:#fff!important;padding:12px 28px;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase">${c.cta}</a></div>
        <p style="font-size:10px;color:#999;margin-top:24px;padding-top:16px;border-top:1px solid #eee;font-style:italic;">${c.footnote}</p>
      </td></tr>
      <tr><td style="padding:16px 30px;border-top:1px solid #e5e5e5;text-align:center;">
        <p style="font-size:9px;color:#aaa;margin:4px 0;">Aurum Ledger Ltd &middot; Hong Kong</p>
        <p style="font-size:9px;color:#aaa;margin:4px 0;"><a href="${unsubscribeLink}" style="color:#aaa;">${unsub[L]}</a></p>
      </td></tr>
      <tr><td style="height:2px;background:#C5A55A;"></td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  return { subject: c.subject, html };
}
