// src/lib/winback-email-templates.ts
// One-shot winback campaign for users who exited the drip schedule (≥14d old)
// without converting. Two cohorts:
//   - cohort2_no_kyc   = signed up, never completed KYC, never deposited
//   - cohort3_kyc_done = KYC approved, never deposited
//
// EN + TR only (95% of base is EN, 0.5% is TR; other langs use EN fallback).

const VAULT_URL = "https://vault.auxite.io";

function unsubscribeUrl(email: string, token: string): string {
  return `${VAULT_URL}/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}

function cta(url: string, text: string): string {
  return `<div style="text-align:center;margin:24px 0"><a href="${url}" style="display:inline-block;background:#1a1a1a;color:#fff!important;padding:12px 28px;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:1px">${text}</a></div>`;
}

function highlight(text: string): string {
  return `<div style="background:#fafafa;border-left:3px solid #C5A55A;padding:14px 18px;margin:18px 0"><p style="font-size:13px;color:#444;margin:0;line-height:1.7">${text}</p></div>`;
}

function renderWinbackEmail({
  title,
  bodyHtml,
  ctaText,
  ctaUrl,
  language,
  unsubUrl,
}: {
  title: string;
  bodyHtml: string;
  ctaText: string;
  ctaUrl: string;
  language: string;
  unsubUrl: string;
}): string {
  const dir = language === "ar" ? "rtl" : "ltr";
  const unsubLabel = language === "tr" ? "Bu emaillerden çık" : "Unsubscribe";
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
          <h2 style="font-size:16px;color:#1a1a1a;font-weight:400;margin:0 0 16px 0;">${title}</h2>
          <div style="color:#444;font-size:13px;line-height:1.7;">${bodyHtml}</div>
          ${cta(ctaUrl, ctaText)}
          <p style="font-size:10px;color:#999;margin-top:24px;padding-top:16px;border-top:1px solid #eee;font-style:italic;">This message serves as an operational communication. Please do not reply.</p>
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

export type WinbackStage = "cohort2_no_kyc" | "cohort3_kyc_done";

interface WinbackContent {
  subject: string;
  title: string;
  bodyHtml: string;
  ctaText: string;
  ctaUrl: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// COHORT 2 — signed up, no KYC, no deposit, ≥14d old
// New angle vs day3_kyc: acknowledges time passed, surfaces concrete platform
// progress (Wise bank wire now live), keeps the welcome-gold lever
// ──────────────────────────────────────────────────────────────────────────────

const cohort2Content: Record<string, WinbackContent> = {
  en: {
    subject: "We've expanded — and your 5 AUXG is still here",
    title: "A quick update from Auxite",
    bodyHtml: `<p>You opened an account with Auxite a while back. Since then, we've been busy:</p>
<ul style="color:#444;font-size:13px;line-height:1.9;padding-left:20px">
  <li><strong>Bank wires</strong> in USD, EUR, GBP, CHF — fund directly from your bank</li>
  <li><strong>Card purchases</strong> — Apple Pay, Google Pay, Visa/Mastercard, instant settlement</li>
  <li><strong>Crypto rails</strong> — USDC, USDT, BTC, ETH on Base and Bitcoin networks</li>
</ul>
${highlight("Your <strong>5 AUXG Welcome Gold</strong> (~$430 at current spot) is still reserved for you. Activation takes one step: complete KYC verification (under 2 minutes with a valid ID).")}
<p>If precious metals aren't for you anymore, no hard feelings — there's an unsubscribe link below.</p>`,
    ctaText: "ACTIVATE MY GOLD",
    ctaUrl: `${VAULT_URL}?utm_source=email&utm_medium=winback&utm_campaign=cohort2_nokyc_v1`,
  },
  tr: {
    subject: "Genişledik — 5 AUXG'in hâlâ burada",
    title: "Auxite'ten kısa bir güncelleme",
    bodyHtml: `<p>Bir süre önce Auxite'e hesap açtınız. O zamandan beri biraz büyüdük:</p>
<ul style="color:#444;font-size:13px;line-height:1.9;padding-left:20px">
  <li><strong>Banka havaleleri</strong> USD, EUR, GBP, CHF ile — bankanızdan direkt fonlama</li>
  <li><strong>Kart ile alım</strong> — Apple Pay, Google Pay, Visa/Mastercard, anlık settlement</li>
  <li><strong>Kripto rail'leri</strong> — USDC, USDT, BTC, ETH (Base + Bitcoin ağları)</li>
</ul>
${highlight("<strong>5 AUXG Hoş Geldin Altınınız</strong> (mevcut spot fiyatla ~$430) hâlâ sizin için ayrılmış durumda. Aktivasyon tek adım: KYC doğrulamasını tamamlayın (geçerli kimlikle 2 dakikadan az sürer).")}
<p>Değerli metaller artık ilginizi çekmiyorsa sorun değil — alttaki link'le aboneliği iptal edebilirsiniz.</p>`,
    ctaText: "ALTINI AKTİVE ET",
    ctaUrl: `${VAULT_URL}?utm_source=email&utm_medium=winback&utm_campaign=cohort2_nokyc_v1`,
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// COHORT 3 — KYC done, no deposit ever
// They cleared the hardest step (KYC). Friction is at deposit. Reduce friction.
// ──────────────────────────────────────────────────────────────────────────────

const cohort3Content: Record<string, WinbackContent> = {
  en: {
    subject: "Your verified vault is ready — try a $50 first deposit",
    title: "Your vault is ready to use",
    bodyHtml: `<p>You've completed verification. That was the hardest step — most users stop here.</p>
${highlight("You can now fund your vault in three ways. Pick the one that fits.")}
<table cellpadding="0" cellspacing="0" style="width:100%;margin:18px 0">
  <tr>
    <td style="padding:10px 14px;border:1px solid #eee;width:33%;vertical-align:top">
      <strong style="color:#C5A55A;font-size:12px">CARD</strong>
      <p style="font-size:12px;color:#666;margin:6px 0 0 0;line-height:1.5">From $50 in 30 seconds. Apple Pay, Google Pay, Visa/Mastercard.</p>
    </td>
    <td style="padding:10px 14px;border:1px solid #eee;width:33%;vertical-align:top">
      <strong style="color:#C5A55A;font-size:12px">BANK WIRE</strong>
      <p style="font-size:12px;color:#666;margin:6px 0 0 0;line-height:1.5">USD, EUR, GBP, CHF. 1–3 business days, no upper limit.</p>
    </td>
    <td style="padding:10px 14px;border:1px solid #eee;width:33%;vertical-align:top">
      <strong style="color:#C5A55A;font-size:12px">CRYPTO</strong>
      <p style="font-size:12px;color:#666;margin:6px 0 0 0;line-height:1.5">USDC, USDT, BTC, ETH. ~15 min credit.</p>
    </td>
  </tr>
</table>
<p>Your 5 AUXG Welcome Gold is already in your vault. Add to your position whenever you're ready.</p>
<p style="font-size:12px;color:#888;font-style:italic">Most first-time buyers start small to see how it works. There's no minimum to start exploring.</p>`,
    ctaText: "OPEN FUND VAULT",
    ctaUrl: `${VAULT_URL}/fund-vault?utm_source=email&utm_medium=winback&utm_campaign=cohort3_kycdone_v1`,
  },
  tr: {
    subject: "Doğrulanmış vault'unuz hazır — ilk $50 yatırımı deneyin",
    title: "Vault'unuz kullanıma hazır",
    bodyHtml: `<p>Doğrulamayı tamamladınız. Bu en zor adımdı — çoğu kullanıcı burada duruyor.</p>
${highlight("Şimdi vault'unuzu üç farklı yolla fonlayabilirsiniz. Size uyanı seçin.")}
<table cellpadding="0" cellspacing="0" style="width:100%;margin:18px 0">
  <tr>
    <td style="padding:10px 14px;border:1px solid #eee;width:33%;vertical-align:top">
      <strong style="color:#C5A55A;font-size:12px">KART</strong>
      <p style="font-size:12px;color:#666;margin:6px 0 0 0;line-height:1.5">$50'den, 30 saniyede. Apple Pay, Google Pay, Visa/Mastercard.</p>
    </td>
    <td style="padding:10px 14px;border:1px solid #eee;width:33%;vertical-align:top">
      <strong style="color:#C5A55A;font-size:12px">BANKA HAVALESİ</strong>
      <p style="font-size:12px;color:#666;margin:6px 0 0 0;line-height:1.5">USD, EUR, GBP, CHF. 1–3 iş günü, üst limit yok.</p>
    </td>
    <td style="padding:10px 14px;border:1px solid #eee;width:33%;vertical-align:top">
      <strong style="color:#C5A55A;font-size:12px">KRİPTO</strong>
      <p style="font-size:12px;color:#666;margin:6px 0 0 0;line-height:1.5">USDC, USDT, BTC, ETH. ~15 dk'da kredilenir.</p>
    </td>
  </tr>
</table>
<p>5 AUXG Hoş Geldin Altınınız zaten vault'unuzda. Hazır olduğunuzda pozisyonunuza ekleyebilirsiniz.</p>
<p style="font-size:12px;color:#888;font-style:italic">İlk kez yatırım yapanlar genellikle küçük başlıyor. Keşfetmeye başlamak için minimum tutar yok.</p>`,
    ctaText: "FUND VAULT'A GİT",
    ctaUrl: `${VAULT_URL}/fund-vault?utm_source=email&utm_medium=winback&utm_campaign=cohort3_kycdone_v1`,
  },
};

const contentMap: Record<WinbackStage, Record<string, WinbackContent>> = {
  cohort2_no_kyc: cohort2Content,
  cohort3_kyc_done: cohort3Content,
};

export function getWinbackEmail(
  stage: WinbackStage,
  language: string,
  email: string,
  unsubToken: string
): { subject: string; html: string } {
  const langMap = contentMap[stage];
  // EN fallback for any non-en/tr language
  const c = langMap[language] || langMap.en;
  const html = renderWinbackEmail({
    title: c.title,
    bodyHtml: c.bodyHtml,
    ctaText: c.ctaText,
    ctaUrl: c.ctaUrl,
    language: language === "tr" ? "tr" : "en",
    unsubUrl: unsubscribeUrl(email, unsubToken),
  });
  return { subject: c.subject, html };
}
