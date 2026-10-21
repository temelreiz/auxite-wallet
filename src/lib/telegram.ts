// src/lib/telegram.ts
// Auxite Ops Telegram Bot - Trade bildirimleri

import { formatAmount } from "@/lib/format";
import { queueOpsDigest } from "@/lib/ops-digest";

// 🔒 SECURITY: Credentials MUST come from environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.warn("⚠️ Telegram Bot credentials not configured in environment variables!");
}

interface TradeNotification {
  type: "buy" | "sell" | "swap";
  userAddress: string;
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  txHash?: string;
  certificateNumber?: string;
  email?: string;
}

interface OperationNotification {
  type: "buy" | "deposit";
  userAddress: string;
  metal: string;
  amount: number;
  usdValue: number;
  txHash?: string;
  timestamp: Date;
}

/**
 * Telegram'a mesaj gönder.
 *
 * `chatId` verilirse o sohbete gönderir (ör. market-maker kanalı); verilmezse
 * varsayılan iç ops kanalına (TELEGRAM_CHAT_ID) düşer. Dış kanallara SADECE
 * piyasaya açık bilgi gönderin — rezerv/backing/supply gibi iç veriler asla.
 */
export async function sendTelegramMessage(
  message: string,
  chatId?: string,
): Promise<boolean> {
  try {
    const targetChatId = chatId || TELEGRAM_CHAT_ID;
    if (!TELEGRAM_BOT_TOKEN || !targetChatId) {
      console.error("❌ Telegram credentials not configured — cannot send message");
      return false;
    }

    console.log(`📤 Sending Telegram message to chat ${targetChatId}...`);

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const body = {
      chat_id: targetChatId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };

    console.log(`📤 Telegram request URL: ${url.replace(TELEGRAM_BOT_TOKEN, "***TOKEN***")}`);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error("❌ Telegram API error:", JSON.stringify(data));
      return false;
    }

    console.log(`✅ Telegram message sent successfully! Message ID: ${data.result?.message_id}`);
    return true;
  } catch (error: any) {
    console.error("❌ Telegram send error:", error.message);
    return false;
  }
}

/**
 * Metal alım bildirimi gönder - Admin için operasyon uyarısı
 */
export async function notifyMetalBuy(notification: OperationNotification): Promise<boolean> {
  const metalEmoji: Record<string, string> = {
    AUXG: "🥇",
    AUXS: "🥈", 
    AUXPT: "🪙",
    AUXPD: "💎",
  };

  const emoji = metalEmoji[notification.metal] || "📦";
  const shortAddress = `${notification.userAddress.slice(0, 6)}...${notification.userAddress.slice(-4)}`;
  const time = notification.timestamp.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });

  const message = `
${emoji} <b>YENİ METAL ALIMI</b> ${emoji}

<b>Metal:</b> ${notification.metal}
<b>Miktar:</b> ${formatAmount(notification.amount, notification.metal)} gram
<b>USD Değer:</b> $${notification.usdValue.toFixed(2)}
<b>Kullanıcı:</b> <code>${shortAddress}</code>
<b>Zaman:</b> ${time}
${notification.txHash ? `<b>TxHash:</b> <code>${notification.txHash.slice(0, 16)}...</code>` : ""}

⚠️ <b>Yapılacak İşlemler:</b>
1️⃣ Binance TR: USDT → TRY
2️⃣ Kuveyt Türk: TRY yatır
3️⃣ Kuveyt Türk: Altın al

📊 <a href="https://vault.auxite.io/admin">Admin Panel</a>
`;

  // Routine activity: daily email digest, not Telegram (see ops-digest.ts).
  return queueOpsDigest(message.trim());
}

/**
 * Trade bildirimi gönder (genel)
 */
export async function notifyTrade(trade: TradeNotification): Promise<boolean> {
  // Sadece metal alımlarında bildirim gönder
  const metals = ["AUXG", "AUXS", "AUXPT", "AUXPD"];
  
  if (trade.type !== "buy" || !metals.includes(trade.toToken.toUpperCase())) {
    return true; // Metal alımı değilse bildirim gönderme
  }

  const metalEmoji: Record<string, string> = {
    AUXG: "🥇",
    AUXS: "🥈",
    AUXPT: "🪙", 
    AUXPD: "💎",
  };

  const emoji = metalEmoji[trade.toToken.toUpperCase()] || "📦";
  const shortAddress = `${trade.userAddress.slice(0, 6)}...${trade.userAddress.slice(-4)}`;
  const time = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });

  const message = `
${emoji} <b>YENİ METAL ALIMI</b> ${emoji}

<b>Metal:</b> ${trade.toToken.toUpperCase()}
<b>Miktar:</b> ${formatAmount(trade.toAmount, trade.toToken.toUpperCase())} gram
<b>Ödenen:</b> ${trade.fromAmount.toFixed(2)} ${trade.fromToken.toUpperCase()}
<b>Kullanıcı:</b> <code>${shortAddress}</code>
${trade.email ? `<b>Email:</b> ${trade.email}` : ""}
<b>Zaman:</b> ${time}
${trade.certificateNumber ? `<b>Sertifika:</b> ${trade.certificateNumber}` : ""}
${trade.txHash ? `<b>TxHash:</b> <code>${trade.txHash.slice(0, 16)}...</code>` : ""}

⚠️ <b>Yapılacak İşlemler:</b>
1️⃣ Binance TR: USDT → TRY
2️⃣ Kuveyt Türk: TRY yatır  
3️⃣ Kuveyt Türk: Altın al
4️⃣ Admin Panel'den "Tamamla" işaretle

📊 <a href="https://vault.auxite.io/admin?tab=operations">Admin Panel - Operations</a>
`;

  // Routine activity: daily email digest, not Telegram (see ops-digest.ts).
  return queueOpsDigest(message.trim());
}

/**
 * AUXR (basket reserve token) alım/satım bildirimi — admin'e.
 * notifyTrade() yalnızca tek-metal alımlarına bildirim gönderdiği için
 * (toToken ∈ AUXG/AUXS/AUXPT/AUXPD), AUXR'ın kendi bildirimi gerekiyor.
 * AUXR mint edildiğinde sepet metalleri (Au/Ag/Pt/Pd) fiziksel olarak
 * tedarik edilmeli — bildirim ops ekibini tetikler.
 */
export async function notifyAuxrTrade(n: {
  side: "buy" | "sell";
  userAddress: string;
  usdAmount: number;
  unitsAUXR: number;
  navUSD: number;
  paymentToken?: string;
  email?: string;
  basketGrams?: { gold: number; silver: number; platinum: number; palladium: number };
}): Promise<boolean> {
  const shortAddress = `${n.userAddress.slice(0, 6)}...${n.userAddress.slice(-4)}`;
  const time = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  const verb = n.side === "buy" ? "ALIMI" : "SATIŞI";
  const emoji = n.side === "buy" ? "🧺" : "💸";

  const grams = n.basketGrams
    ? `\n<b>Sepet (g):</b> Au ${n.basketGrams.gold.toFixed(4)} · Ag ${n.basketGrams.silver.toFixed(3)} · Pt ${n.basketGrams.platinum.toFixed(4)} · Pd ${n.basketGrams.palladium.toFixed(4)}`
    : "";

  const ops = n.side === "buy"
    ? `\n⚠️ <b>Yapılacak:</b> Sepet metallerini (Au/Ag/Pt/Pd) fiziksel tedarik et — oranlar yukarıda.`
    : "";

  const message = `
${emoji} <b>YENİ AUXR ${verb}</b> ${emoji}

<b>Birim:</b> ${n.unitsAUXR.toFixed(6)} AUXR
<b>USD Değer:</b> $${n.usdAmount.toFixed(2)}
<b>NAV:</b> $${n.navUSD.toFixed(4)} / AUXR
<b>Ödeme:</b> ${(n.paymentToken || "AUXM").toUpperCase()}
<b>Kullanıcı:</b> <code>${shortAddress}</code>
${n.email ? `<b>Email:</b> ${n.email}` : ""}
<b>Zaman:</b> ${time}${grams}${ops}

📊 <a href="https://vault.auxite.io/admin/auxr">AUXR Admin Panel</a>
`;

  // Routine activity: daily email digest, not Telegram (see ops-digest.ts).
  return queueOpsDigest(message.trim());
}

/**
 * Günlük özet gönder
 */
export async function sendDailySummary(stats: {
  totalBuys: number;
  totalGrams: Record<string, number>;
  totalUsdValue: number;
  pendingOps: number;
}): Promise<boolean> {
  const message = `
📊 <b>GÜNLÜK ÖZET</b> 📊

<b>Toplam Alım:</b> ${stats.totalBuys} işlem
<b>Toplam Değer:</b> $${stats.totalUsdValue.toFixed(2)}

<b>Metal Bazında:</b>
🥇 AUXG: ${stats.totalGrams.AUXG ? formatAmount(stats.totalGrams.AUXG, 'AUXG') : '0'} gram
🥈 AUXS: ${stats.totalGrams.AUXS ? formatAmount(stats.totalGrams.AUXS, 'AUXS') : '0'} gram
🪙 AUXPT: ${stats.totalGrams.AUXPT ? formatAmount(stats.totalGrams.AUXPT, 'AUXPT') : '0'} gram
💎 AUXPD: ${stats.totalGrams.AUXPD ? formatAmount(stats.totalGrams.AUXPD, 'AUXPD') : '0'} gram

⏳ <b>Bekleyen Ops:</b> ${stats.pendingOps}

📊 <a href="https://vault.auxite.io/admin">Admin Panel</a>
`;

  // Routine activity: daily email digest, not Telegram (see ops-digest.ts).
  return queueOpsDigest(message.trim());
}

/**
 * Test mesajı gönder
 */
export async function sendTestMessage(): Promise<boolean> {
  return sendTelegramMessage("✅ Auxite Ops Bot aktif! Test mesajı başarılı.");
}

/**
 * On-chain AUXR issuance. Every mint leaves the platform's control the moment
 * it lands, so this is sent for each one — including the refusals, because a
 * run of blocked attempts is the shape an attack makes before it succeeds.
 *
 * Detection only. The limits in auxr-mint-limits.ts are what actually stop a
 * mint; this is so somebody knows it happened.
 */
export async function notifyAuxrMint(n: {
  outcome: "minted" | "blocked";
  userAddress: string;
  destination: string;
  unitsAUXR: number;
  txHash?: string;
  reason?: string;
  usedToday?: number;
  capToday?: number;
}): Promise<boolean> {
  const short = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
  const time = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  const ok = n.outcome === "minted";

  const usage =
    n.usedToday !== undefined && n.capToday !== undefined
      ? `\n<b>24s kullanım:</b> ${n.usedToday.toFixed(3)} / ${n.capToday} AUXR`
      : "";
  const tx = n.txHash
    ? `\n<b>Tx:</b> <a href="https://basescan.org/tx/${n.txHash}">${n.txHash.slice(0, 18)}…</a>`
    : "";
  const why = n.reason ? `\n<b>Sebep:</b> ${n.reason}` : "";

  const message = `
${ok ? "⛓️ <b>AUXR ZİNCİRE ÇEKİLDİ</b>" : "🛑 <b>AUXR ÇEKİMİ ENGELLENDİ</b>"}

<b>Hesap:</b> <code>${short(n.userAddress)}</code>
<b>Hedef:</b> <code>${n.destination}</code>
<b>Miktar:</b> ${n.unitsAUXR} AUXR${usage}${tx}${why}
<b>Zaman:</b> ${time}
${ok ? "\n⚠️ Bu işlem geri alınamaz. Beklenmiyorsa: Safe'ten MINTER_ROLE'ü geri al." : ""}
`.trim();

  return sendTelegramMessage(message);
}

/**
 * Any movement of customer value that is not already covered by a dedicated
 * notifier.
 *
 * The internal transfer path had no notification at all, which is why an
 * attacker could empty the App Store review account into a suspended account
 * on 10 October 2026 and have it go unremarked until an exchange told us.
 * Withdrawals, redemptions and loans were equally silent.
 *
 * Deliberately generic: a bespoke formatter per route is how three of these
 * ended up with none.
 */
export async function notifyValueMovement(n: {
  kind: "transfer" | "withdraw" | "redeem" | "borrow";
  fromAddress: string;
  toAddress?: string;
  token: string;
  amount: number;
  detail?: string;
  email?: string;
}): Promise<boolean> {
  const short = (a?: string) =>
    a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "—";
  const time = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });

  const head: Record<typeof n.kind, string> = {
    transfer: "🔄 <b>HESAPLAR ARASI TRANSFER</b>",
    withdraw: "📤 <b>PLATFORM DIŞINA ÇEKİM</b>",
    redeem: "📦 <b>FİZİKSEL TESLİM / TASFİYE</b>",
    borrow: "🏦 <b>TEMİNATLI KREDİ</b>",
  };

  const to = n.toAddress ? `\n<b>Alıcı:</b> <code>${short(n.toAddress)}</code>` : "";
  const who = n.email ? `\n<b>E-posta:</b> ${n.email}` : "";
  const extra = n.detail ? `\n<b>Detay:</b> ${n.detail}` : "";

  return sendTelegramMessage(
    `
${head[n.kind]}

<b>Gönderen:</b> <code>${short(n.fromAddress)}</code>${to}
<b>Tutar:</b> ${n.amount} ${n.token.toUpperCase()}${who}${extra}
<b>Zaman:</b> ${time}
`.trim(),
  );
}
