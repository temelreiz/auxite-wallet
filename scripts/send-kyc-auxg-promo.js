// Send KYC + 5 AUXG Welcome Bonus promo to registered users with no KYC.
// Multi-language: picks template per user.language.
//
// Usage:
//   node --env-file=.env.local scripts/send-kyc-auxg-promo.js --preview
//   node --env-file=.env.local scripts/send-kyc-auxg-promo.js --test=bs@auxite.io --lang=tr
//   node --env-file=.env.local scripts/send-kyc-auxg-promo.js --send

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
// Templates (inlined — same as src/lib/email-templates.ts kycAuxgPromo*)
// ─────────────────────────────────────────────────────────────────
const HEADER = `<div style="font-family:Georgia,serif;background:#f5f5f5;padding:20px;color:#1a1a1a"><div style="max-width:600px;margin:0 auto;background:#fff"><div style="height:3px;background:#C5A55A"></div><div style="padding:28px 30px"><img src="https://vault.auxite.io/auxite-logo-new.png" alt="Auxite" width="120" style="display:block;width:120px;height:auto;margin-bottom:20px"/>`;
const FOOTER = `<p style="font-size:10px;color:#999;margin-top:20px;font-style:italic">This message serves as an operational communication. Please do not reply.</p></div><div style="padding:16px 30px;border-top:1px solid #e5e5e5;text-align:center"><p style="font-size:9px;color:#aaa;margin:4px 0">Aurum Ledger Ltd &middot; Hong Kong</p></div><div style="height:2px;background:#C5A55A"></div></div></div>`;
const wrap = (b) => HEADER + b + FOOTER;
const step = (n, t, d) => `<tr><td style="padding:8px 0;vertical-align:top;width:30px;font-size:13px;font-weight:700;color:#C5A55A">${n}.</td><td style="padding:8px 0;font-size:13px;color:#444;line-height:1.7"><strong>${t}</strong> — ${d}</td></tr>`;
const cta = (u, t) => `<a href="${u}" style="display:inline-block;background:#1a1a1a;color:#fff!important;padding:12px 24px;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:1px;margin:16px 0">${t}</a>`;
const bonus = (t, x) => `<div style="background:#fafafa;border-left:3px solid #C5A55A;padding:14px 18px;margin:18px 0"><p style="font-size:11px;letter-spacing:1px;color:#888;margin:0 0 6px">${t}</p><p style="font-size:13px;color:#444;margin:0;line-height:1.7">${x}</p></div>`;

const TEMPLATES = {
  en: {
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
  },
  tr: {
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
  },
  de: {
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
  },
  fr: {
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
  },
  ar: {
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
      ${bonus("لماذا التحقق", "تُفعَّل مكافأة 5 AUXG عند أول تخصيص أو إيداع 100$+. بالإضافة إلى: حد سحب 50 ألف $/شهر، حق استرداد المعدن المادي، كشوف حسابات شهرية.")}
      ${cta("https://vault.auxite.io/kyc-verification", "تحقق من هويتي")}
      <p style="font-size:11px;color:#888;line-height:1.6;margin:20px 0 0">حملة ترحيب لفترة محدودة. تُفتح الأرصدة وفقًا لشروط البرنامج.</p>
      </div>
    `),
  },
  ru: {
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
  },
};

function getTemplate(lang) {
  return TEMPLATES[(lang || "en").toLowerCase()] || TEMPLATES.en;
}

// ─────────────────────────────────────────────────────────────────
// Recipient collection — registered users with no KYC
// ─────────────────────────────────────────────────────────────────
async function collectRecipients() {
  const keys = await redis.keys("auth:user:*");
  const out = [];
  for (const k of keys) {
    const data = await redis.hgetall(k);
    if (!data?.email) continue;
    const addr = data.walletAddress || "";
    const kycRaw = addr ? await redis.get(`kyc:${addr}`) : null;
    const kyc = kycRaw ? (typeof kycRaw === "string" ? JSON.parse(kycRaw) : kycRaw) : null;
    const isStuck = !kyc || kyc.status === "none" || kyc.status === undefined;
    if (!isStuck) continue;
    out.push({
      email: data.email,
      language: (data.language || "en").toLowerCase(),
      walletAddress: addr,
    });
  }
  const seen = new Set();
  return out.filter((r) => (seen.has(r.email) ? false : (seen.add(r.email), true)));
}

// ─────────────────────────────────────────────────────────────────
// Modes
// ─────────────────────────────────────────────────────────────────
async function preview() {
  const recipients = await collectRecipients();
  const byLang = {};
  recipients.forEach((r) => { byLang[r.language] = (byLang[r.language] || 0) + 1; });
  console.log(JSON.stringify({ total: recipients.length, byLanguage: byLang }, null, 2));
}

async function testSend(email, lang) {
  const t = getTemplate(lang);
  const r = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `[TEST ${(lang||"en").toUpperCase()}] ${t.subject}`,
    html: t.html,
  });
  console.log("test send:", r);
}

async function broadcast() {
  const recipients = await collectRecipients();
  console.log(`📧 Sending to ${recipients.length} users...`);
  let sent = 0, failed = 0;
  const failures = [];

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (r) => {
      const t = getTemplate(r.language);
      try {
        await resend.emails.send({ from: FROM, to: r.email, subject: t.subject, html: t.html });
        sent++;
      } catch (e) {
        failed++;
        failures.push({ email: r.email, lang: r.language, err: e?.message || String(e) });
      }
    }));
    process.stdout.write(`\r  progress: ${Math.min(i + BATCH_SIZE, recipients.length)}/${recipients.length}  sent=${sent}  failed=${failed}`);
    if (i + BATCH_SIZE < recipients.length) await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
  }
  console.log("");

  await redis.lpush("email:campaigns:log", JSON.stringify({
    campaign: "kycAuxgPromo",
    segment: "registered_no_kyc",
    totalRecipients: recipients.length,
    sent, failed,
    sentBy: "local-script",
    timestamp: Date.now(),
  }));
  await redis.ltrim("email:campaigns:log", 0, 99);

  console.log(`\n✓ Done. sent=${sent} failed=${failed}`);
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

(async () => {
  if (argMap.preview) {
    await preview();
  } else if (argMap.test) {
    await testSend(argMap.test, argMap.lang || "en");
  } else if (argMap.send) {
    await broadcast();
  } else {
    console.log(`Usage:
  node --env-file=.env.local scripts/send-kyc-auxg-promo.js --preview
  node --env-file=.env.local scripts/send-kyc-auxg-promo.js --test=you@example.com --lang=tr
  node --env-file=.env.local scripts/send-kyc-auxg-promo.js --send`);
  }
})();
