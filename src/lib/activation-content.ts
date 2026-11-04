// src/lib/activation-content.ts
// Copy for the activation series (src/app/api/cron/activation/route.ts):
//   • kyc_finish_*    — started identity verification but never submitted it
//                       (Sumsub "pending"). Every other reminder skips these.
//   • deposit_*       — verified, never funded. Keyed to the KYC approval date,
//                       not the sign-up date, and stops at the first deposit.
//
// Custody claims are the ones confirmed for the single-metal products:
// LBMA-approved refinery bars, an LBMA-accredited bank vault in Istanbul under
// the bank's insurance, allocated and segregated, bankruptcy-remote. No named
// auditor, insurer or custodian. The only reward named is the first-deposit
// match, read from BONUS_CONFIG and shown only while it is enabled.

import { BONUS_CONFIG } from "@/lib/metal-bonus-service";

export type ActivationLang = "en" | "tr" | "ar";
export type ActivationStage =
  | "kyc_finish_1" | "kyc_finish_2" | "kyc_finish_3"
  | "deposit_1" | "deposit_2" | "deposit_3" | "deposit_4"
  | "first_buy" | "why_stopped";

const VAULT = "https://vault.auxite.io";
const KYC_URL = `${VAULT}/kyc`;
const FUND_URL = `${VAULT}/fund-vault`;
const BORROW_URL = `${VAULT}/borrow`;

export function activationLang(l: string): ActivationLang {
  const x = (l || "en").toLowerCase().slice(0, 2);
  return x === "tr" || x === "ar" ? x : "en";
}

function matchTerms(): { pct: number; min: number; cap: number } | null {
  if (!BONUS_CONFIG.enabled || !BONUS_CONFIG.firstDepositMatchEnabled) return null;
  const nums = [BONUS_CONFIG.firstDepositMatchPercent, BONUS_CONFIG.firstDepositMatchMinUsd, BONUS_CONFIG.firstDepositMatchCapUsd];
  if (!nums.every((n) => Number.isFinite(n) && n > 0)) return null;
  return { pct: BONUS_CONFIG.firstDepositMatchPercent, min: BONUS_CONFIG.firstDepositMatchMinUsd, cap: BONUS_CONFIG.firstDepositMatchCapUsd };
}

function matchLine(L: ActivationLang): string | null {
  const m = matchTerms();
  if (!m) return null;
  return {
    en: `Your first crypto deposit of $${m.min} or more earns a ${m.pct}% match in gold (up to $${m.cap}).`,
    tr: `${m.min}$ ve üzeri ilk kripto yatırımınıza altın olarak %${m.pct} ek bonus verilir (en fazla ${m.cap}$).`,
    ar: `يحصل أول إيداع عملات مشفرة لك بقيمة ${m.min}$ أو أكثر على مكافأة ${m.pct}% بالذهب (حتى ${m.cap}$).`,
  }[L];
}

interface Copy {
  subject: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  risk?: string;
  showMatch: boolean;
  cta: string;
  url: string;
  push: { title: string; body: string };
  screen: string;
}

const CUSTODY: Record<ActivationLang, string[]> = {
  en: [
    "<strong>Physical bars</strong> from an LBMA-approved refinery.",
    "<strong>Allocated in your name</strong> and held segregated, in an LBMA-accredited bank vault in Istanbul.",
    "<strong>Insured</strong> under the bank's vault insurance, within a bankruptcy-remote custody structure.",
    "<strong>A certificate</strong> for every allocation, verifiable online.",
  ],
  tr: [
    "<strong>Fiziksel külçe</strong>, LBMA onaylı rafineriden.",
    "<strong>Sizin adınıza tahsisli</strong> ve ayrıştırılmış olarak, İstanbul'daki LBMA onaylı banka kasasında.",
    "<strong>Sigortalı</strong> — bankanın kasa sigortası kapsamında, iflastan korunan bir saklama yapısında.",
    "<strong>Her tahsis için sertifika</strong>, çevrimiçi doğrulanabilir.",
  ],
  ar: [
    "<strong>سبائك فعلية</strong> من مصفاة معتمدة من LBMA.",
    "<strong>مخصصة باسمك</strong> ومحفوظة بشكل منفصل في خزنة بنكية معتمدة من LBMA في إسطنبول.",
    "<strong>مؤمَّنة</strong> ضمن تأمين خزنة البنك، في هيكل حفظ معزول عن الإفلاس.",
    "<strong>شهادة</strong> لكل تخصيص، يمكن التحقق منها عبر الإنترنت.",
  ],
};

function copy(stage: ActivationStage, L: ActivationLang): Copy {
  if (stage === "first_buy") {
    const t = {
      en: {
        subject: "Buy your first gram of gold by card",
        title: "Your account is open",
        paragraphs: [
          "You can buy physical metal by card now, without verifying your ID first: up to $500 per purchase and $1,000 in any 30 days, where available in your country.",
          "Verification is only needed to go above those limits or to send, redeem or withdraw. Card purchases are held for up to 7 days before they can leave your account.",
        ],
        risk: "Unregulated. Value can go down as well as up.",
        cta: "BUY BY CARD",
        push: { title: "Your account is open", body: "Buy physical gold by card from $30. No ID needed up to $500." },
      },
      tr: {
        subject: "İlk gram altınınızı kartla alın",
        title: "Hesabınız açıldı",
        paragraphs: [
          "Artık kimlik doğrulamadan kartla fiziksel metal alabilirsiniz: ülkenizde mümkünse işlem başına 500$, 30 günde en fazla 1.000$.",
          "Kimlik doğrulaması yalnızca bu limitleri aşmak veya göndermek, geri almak ya da çekmek için gerekir. Kartla alımlar hesaptan çıkmadan önce en fazla 7 gün bekletilir.",
        ],
        risk: "Düzenlemeye tabi değildir. Değeri düşebilir veya yükselebilir.",
        cta: "KARTLA AL",
        push: { title: "Hesabınız açıldı", body: "30$'dan başlayan tutarlarla kartla fiziksel altın alın. 500$'a kadar kimlik gerekmez." },
      },
      ar: {
        subject: "اشترِ أول غرام من الذهب بالبطاقة",
        title: "تم فتح حسابك",
        paragraphs: [
          "يمكنك الآن شراء المعدن الفعلي بالبطاقة دون التحقق من هويتك أولاً: حتى 500$ لكل عملية و1,000$ خلال أي 30 يوماً، حيثما كان ذلك متاحاً في بلدك.",
          "لا يلزم التحقق إلا لتجاوز هذه الحدود أو للإرسال أو الاسترداد أو السحب. تبقى مشتريات البطاقة محجوزة لمدة تصل إلى 7 أيام قبل أن تتمكن من مغادرة حسابك.",
        ],
        risk: "غير خاضع للتنظيم. قد تنخفض القيمة أو ترتفع.",
        cta: "اشترِ بالبطاقة",
        push: { title: "تم فتح حسابك", body: "اشترِ ذهباً فعلياً بالبطاقة ابتداءً من 30$. لا حاجة للهوية حتى 500$." },
      },
    }[L];
    return { ...t, bullets: CUSTODY[L], showMatch: false, url: FUND_URL, screen: "/(tabs)/allocate" };
  }

  if (stage === "why_stopped") {
    const t = {
      en: {
        subject: "One quick question",
        title: "What stopped you?",
        paragraphs: ["You opened an Auxite account but haven't bought anything yet. One tap tells us why, so we can fix it. Nobody will follow up with you about your answer."],
        cta: "ANSWER IN ONE TAP",
      },
      tr: {
        subject: "Kısa bir soru",
        title: "Sizi ne durdurdu?",
        paragraphs: ["Auxite hesabı açtınız ama henüz bir şey almadınız. Tek dokunuşla nedenini söylerseniz düzeltebiliriz. Cevabınız için kimse size ulaşmayacak."],
        cta: "TEK DOKUNUŞLA CEVAPLA",
      },
      ar: {
        subject: "سؤال سريع",
        title: "ما الذي أوقفك؟",
        paragraphs: ["فتحت حساباً في Auxite لكنك لم تشترِ شيئاً بعد. أخبرنا بالسبب بنقرة واحدة لنتمكن من إصلاحه. لن يتواصل معك أحد بشأن إجابتك."],
        cta: "أجب بنقرة واحدة",
      },
    }[L];
    // Email only: the cron sends no push for this stage, and the link is per user.
    return { ...t, showMatch: false, url: "", push: { title: "", body: "" }, screen: "" };
  }

  const kycPush = {
    en: { title: "Your verification isn't finished", body: "You started verifying your Auxite account. It takes about 2 minutes to finish." },
    tr: { title: "Doğrulamanız tamamlanmadı", body: "Auxite hesabınızı doğrulamaya başladınız. Tamamlamak yaklaşık 2 dakika sürer." },
    ar: { title: "لم يكتمل التحقق من حسابك", body: "بدأت التحقق من حسابك في Auxite. يستغرق إكماله حوالي دقيقتين." },
  }[L];

  if (stage.startsWith("kyc_finish")) {
    const last = stage === "kyc_finish_3";
    const t = {
      en: {
        subject: last ? "Last reminder: finish your Auxite verification" : "Finish your Auxite verification",
        title: "Your verification is almost done",
        paragraphs: [
          "You started verifying your Auxite account but the documents were never submitted, so the account is still unverified.",
          "Finishing takes about two minutes: sign in, upload a valid ID document, and approval usually follows within minutes.",
          "If something went wrong along the way, such as a document being rejected or the camera not opening, reply to support from the app and we will help.",
        ],
        cta: "FINISH VERIFICATION",
      },
      tr: {
        subject: last ? "Son hatırlatma: Auxite doğrulamanızı tamamlayın" : "Auxite doğrulamanızı tamamlayın",
        title: "Doğrulamanız neredeyse bitti",
        paragraphs: [
          "Auxite hesabınızı doğrulamaya başladınız ancak belgeler gönderilmedi; hesabınız hâlâ doğrulanmamış görünüyor.",
          "Tamamlamak yaklaşık iki dakika sürer: giriş yapın, geçerli bir kimlik belgesi yükleyin; onay genellikle birkaç dakika içinde gelir.",
          "Yolda bir sorun çıktıysa (belge reddi, kamera açılmaması gibi) uygulamadaki destek üzerinden yazın, yardımcı olalım.",
        ],
        cta: "DOĞRULAMAYI TAMAMLA",
      },
      ar: {
        subject: last ? "تذكير أخير: أكمل التحقق من حسابك في Auxite" : "أكمل التحقق من حسابك في Auxite",
        title: "التحقق من حسابك على وشك الاكتمال",
        paragraphs: [
          "بدأت التحقق من حسابك في Auxite لكن لم يتم إرسال المستندات، لذا لا يزال الحساب غير موثّق.",
          "يستغرق الإكمال حوالي دقيقتين: سجّل الدخول، وارفع وثيقة هوية صالحة، وعادةً تصل الموافقة خلال دقائق.",
          "إذا واجهت مشكلة، مثل رفض مستند أو عدم فتح الكاميرا، تواصل مع الدعم من داخل التطبيق وسنساعدك.",
        ],
        cta: "أكمل التحقق",
      },
    }[L];
    return { ...t, showMatch: last, url: KYC_URL, push: kycPush, screen: "/kyc-verification" };
  }

  const pushes = {
    deposit_1: {
      en: { title: "Your vault is ready", body: "Your account is verified. Fund it with crypto or a bank transfer to allocate physical gold in your name." },
      tr: { title: "Kasanız hazır", body: "Hesabınız doğrulandı. Adınıza fiziksel altın tahsis etmek için kripto veya banka havalesiyle fonlayın." },
      ar: { title: "خزنتك جاهزة", body: "تم توثيق حسابك. موّله بالعملات المشفرة أو بتحويل بنكي لتخصيص ذهب فعلي باسمك." },
    },
    deposit_2: {
      en: { title: "Where your gold is held", body: "LBMA-accredited, insured bank vault in Istanbul. Allocated in your name, with a certificate." },
      tr: { title: "Altınınız nerede tutuluyor", body: "İstanbul'da LBMA onaylı, sigortalı banka kasası. Sizin adınıza tahsisli, sertifikalı." },
      ar: { title: "أين يُحفظ ذهبك", body: "خزنة بنكية معتمدة من LBMA ومؤمَّنة في إسطنبول. مخصص باسمك مع شهادة." },
    },
    deposit_3: {
      en: { title: "Keep your gold, borrow against it", body: "Need cash without selling? Borrow USDC against the metal in your vault." },
      tr: { title: "Altınınızı satmayın, karşılığında borç alın", body: "Satmadan nakde mi ihtiyacınız var? Kasanızdaki metal karşılığında USDC borç alın." },
      ar: { title: "احتفظ بذهبك واقترض بضمانه", body: "تحتاج سيولة دون البيع؟ اقترض USDC بضمان المعادن في خزنتك." },
    },
    deposit_4: {
      en: { title: "Your vault is still empty", body: "Your verified account is ready whenever you are. Start with any amount." },
      tr: { title: "Kasanız hâlâ boş", body: "Doğrulanmış hesabınız hazır. Dilediğiniz tutarla başlayın." },
      ar: { title: "خزنتك لا تزال فارغة", body: "حسابك الموثّق جاهز متى شئت. ابدأ بأي مبلغ." },
    },
  } as const;
  const push = pushes[stage as keyof typeof pushes][L];

  const t: Record<string, Record<ActivationLang, Omit<Copy, "push" | "screen" | "url"> & { url?: string }>> = {
    deposit_1: {
      en: {
        subject: "Your Auxite vault is ready to fund",
        title: "Your account is verified",
        paragraphs: ["Your identity is verified and your vault is open. The last step is funding it, after which you can allocate gold, silver, platinum or palladium in seconds."],
        bullets: [
          "<strong>Crypto</strong> — USDT, USDC, ETH or BTC to your personal deposit address. Credited automatically after network confirmation.",
          "<strong>Bank transfer</strong> — an international wire, using the reference shown on the funding screen.",
        ],
        showMatch: true,
        cta: "FUND MY VAULT",
      },
      tr: {
        subject: "Auxite kasanız fonlamaya hazır",
        title: "Hesabınız doğrulandı",
        paragraphs: ["Kimliğiniz doğrulandı ve kasanız açıldı. Son adım fonlamak; ardından saniyeler içinde altın, gümüş, platin veya paladyum tahsis edebilirsiniz."],
        bullets: [
          "<strong>Kripto</strong> — USDT, USDC, ETH veya BTC'yi size özel yatırma adresine gönderin. Ağ onayından sonra otomatik yansır.",
          "<strong>Banka havalesi</strong> — fonlama ekranındaki referansla uluslararası havale.",
        ],
        showMatch: true,
        cta: "KASAMI FONLA",
      },
      ar: {
        subject: "خزنتك في Auxite جاهزة للتمويل",
        title: "تم توثيق حسابك",
        paragraphs: ["تم التحقق من هويتك وفُتحت خزنتك. الخطوة الأخيرة هي التمويل، وبعدها يمكنك تخصيص الذهب أو الفضة أو البلاتين أو البلاديوم خلال ثوانٍ."],
        bullets: [
          "<strong>عملات مشفرة</strong> — USDT أو USDC أو ETH أو BTC إلى عنوان الإيداع الخاص بك. تُضاف تلقائياً بعد تأكيد الشبكة.",
          "<strong>تحويل بنكي</strong> — حوالة دولية باستخدام المرجع الظاهر في شاشة التمويل.",
        ],
        showMatch: true,
        cta: "موّل خزنتي",
      },
    },
    deposit_2: {
      en: {
        subject: "What you actually own at Auxite",
        title: "Gold that is yours, not a promise",
        paragraphs: ["Each gram you allocate on Auxite is a gram of physical metal set aside for you:"],
        bullets: CUSTODY.en,
        showMatch: false,
        cta: "START WITH ANY AMOUNT",
      },
      tr: {
        subject: "Auxite'te gerçekte neye sahip olursunuz",
        title: "Size ait altın, bir vaat değil",
        paragraphs: ["Auxite'te tahsis ettiğiniz her gram, sizin için ayrılmış bir gram fiziksel metaldir:"],
        bullets: CUSTODY.tr,
        showMatch: false,
        cta: "DİLEDİĞİNİZ TUTARLA BAŞLAYIN",
      },
      ar: {
        subject: "ما الذي تملكه فعلياً في Auxite",
        title: "ذهب ملكك، لا مجرد وعد",
        paragraphs: ["كل غرام تخصصه في Auxite هو غرام من المعدن الفعلي مخصص لك:"],
        bullets: CUSTODY.ar,
        showMatch: false,
        cta: "ابدأ بأي مبلغ",
      },
    },
    deposit_3: {
      en: {
        subject: "Keep your gold and still have cash",
        title: "Don't sell your gold. Borrow against it.",
        paragraphs: [
          "Metal held in your Auxite vault can be pledged as collateral for a USDC loan. You keep the metal and its upside, and repay whenever you like before maturity.",
          "Terms, the loan-to-value limit and the margin-call process are shown in full before you confirm.",
        ],
        showMatch: false,
        cta: "SEE HOW BORROW WORKS",
        url: BORROW_URL,
      },
      tr: {
        subject: "Altınınızı koruyun, nakdiniz de olsun",
        title: "Altınınızı satmayın, karşılığında borç alın",
        paragraphs: [
          "Auxite kasanızdaki metali USDC kredisi için teminat gösterebilirsiniz. Metal ve değer artışı sizde kalır; vadeden önce dilediğiniz zaman geri ödersiniz.",
          "Koşullar, kredi/teminat oranı sınırı ve teminat çağrısı süreci onaylamadan önce eksiksiz gösterilir.",
        ],
        showMatch: false,
        cta: "BORROW NASIL ÇALIŞIR",
        url: BORROW_URL,
      },
      ar: {
        subject: "احتفظ بذهبك واحصل على السيولة",
        title: "لا تبع ذهبك. اقترض بضمانه.",
        paragraphs: [
          "يمكن رهن المعادن في خزنتك في Auxite كضمان لقرض بعملة USDC. تحتفظ بالمعدن وبأي ارتفاع في قيمته، وتسدد متى شئت قبل الاستحقاق.",
          "تُعرض الشروط وحد نسبة القرض إلى القيمة وإجراءات طلب تغطية الهامش كاملةً قبل التأكيد.",
        ],
        showMatch: false,
        cta: "تعرّف على الاقتراض",
        url: BORROW_URL,
      },
    },
    deposit_4: {
      en: {
        subject: "Your Auxite vault is still empty",
        title: "Ready when you are",
        paragraphs: [
          "Your account has been verified for a couple of weeks, but nothing has been deposited yet. This is the last email in this series.",
          "Start with any amount: fund with crypto or a bank transfer, allocate, and your certificate is issued straight away.",
        ],
        showMatch: true,
        cta: "FUND MY VAULT",
      },
      tr: {
        subject: "Auxite kasanız hâlâ boş",
        title: "Hazır olduğunuzda buradayız",
        paragraphs: [
          "Hesabınız birkaç haftadır doğrulanmış durumda ama henüz yatırım yapılmadı. Bu, serinin son e-postası.",
          "Dilediğiniz tutarla başlayın: kripto veya havaleyle fonlayın, tahsis edin; sertifikanız hemen düzenlenir.",
        ],
        showMatch: true,
        cta: "KASAMI FONLA",
      },
      ar: {
        subject: "خزنتك في Auxite لا تزال فارغة",
        title: "جاهزون متى شئت",
        paragraphs: [
          "تم توثيق حسابك منذ أسبوعين تقريباً، لكن لم يتم أي إيداع بعد. هذه آخر رسالة في هذه السلسلة.",
          "ابدأ بأي مبلغ: موّل بالعملات المشفرة أو بتحويل بنكي، وخصّص، وتصدر شهادتك فوراً.",
        ],
        showMatch: true,
        cta: "موّل خزنتي",
      },
    },
  };
  const c = t[stage][L];
  return { ...c, url: c.url || FUND_URL, push, screen: stage === "deposit_3" ? "/borrow" : "/fund-vault" };
}

export function activationPush(stage: ActivationStage, language: string): { title: string; body: string; screen: string } {
  const c = copy(stage, activationLang(language));
  return { ...c.push, screen: c.screen };
}

/** Rendered email, same house style as the drip and KYC reminder emails. */
export function renderActivationEmail(
  stage: ActivationStage,
  language: string,
  unsubscribeLink: string,
  surveyLink?: string,
): { subject: string; html: string } {
  const L = activationLang(language);
  const c = copy(stage, L);
  const url = stage === "why_stopped" ? surveyLink || VAULT : c.url;
  const dir = L === "ar" ? "rtl" : "ltr";
  const side = dir === "rtl" ? "right" : "left";
  const match = c.showMatch ? matchLine(L) : null;
  const footnote = { en: "Bonuses are subject to the platform's terms and eligibility.", tr: "Bonuslar platform koşullarına ve uygunluğa tabidir.", ar: "تخضع المكافآت لشروط المنصة والأهلية." }[L];
  const unsub = { en: "Unsubscribe from these emails", tr: "Bu e-postalardan çık", ar: "إلغاء الاشتراك في هذه الرسائل" }[L];

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
        ${c.paragraphs.map((p) => `<p>${p}</p>`).join("")}
        ${c.bullets ? `<ul style="padding-${side}:18px;margin:0;">${c.bullets.map((b) => `<li style="margin:0 0 8px 0">${b}</li>`).join("")}</ul>` : ""}
        ${match ? `<div style="background:#fafafa;border-${side}:3px solid #C5A55A;padding:14px 18px;margin:18px 0"><p style="font-size:13px;color:#444;margin:0;line-height:1.7">${match}</p></div>` : ""}
        <div style="text-align:center;margin:24px 0"><a href="${url}" style="display:inline-block;background:#1a1a1a;color:#fff!important;padding:12px 28px;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase">${c.cta}</a></div>
        ${c.risk ? `<p style="font-size:11px;color:#666;margin:16px 0 0;">${c.risk}</p>` : ""}
        ${match ? `<p style="font-size:10px;color:#999;margin-top:24px;padding-top:16px;border-top:1px solid #eee;font-style:italic;">${footnote}</p>` : ""}
      </td></tr>
      <tr><td style="padding:16px 30px;border-top:1px solid #e5e5e5;text-align:center;">
        <p style="font-size:9px;color:#aaa;margin:4px 0;">Aurum Ledger Ltd &middot; Hong Kong</p>
        <p style="font-size:9px;color:#aaa;margin:4px 0;"><a href="${unsubscribeLink}" style="color:#aaa;">${unsub}</a></p>
      </td></tr>
      <tr><td style="height:2px;background:#C5A55A;"></td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  return { subject: c.subject, html };
}
