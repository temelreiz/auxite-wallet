// src/lib/telegram.ts
// Auxite Ops Telegram Bot - Trade bildirimleri

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8392512425:AAG5ixJeJnG-rE9UEW4HJ75qAtrMCcQ37n0";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "1611619602";

// Debug: Log config on module load
console.log(`📱 Telegram Bot Config: Token=${TELEGRAM_BOT_TOKEN ? "SET" : "MISSING"}, ChatID=${TELEGRAM_CHAT_ID}`);

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
 * Telegram'a mesaj gönder
 */
export async function sendTelegramMessage(message: string): Promise<boolean> {
  try {
    console.log(`📤 Sending Telegram message to chat ${TELEGRAM_CHAT_ID}...`);

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const body = {
      chat_id: TELEGRAM_CHAT_ID,
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
<b>Miktar:</b> ${notification.amount.toFixed(4)} gram
<b>USD Değer:</b> $${notification.usdValue.toFixed(2)}
<b>Kullanıcı:</b> <code>${shortAddress}</code>
<b>Zaman:</b> ${time}
${notification.txHash ? `<b>TxHash:</b> <code>${notification.txHash.slice(0, 16)}...</code>` : ""}

⚠️ <b>Yapılacak İşlemler:</b>
1️⃣ Binance TR: USDT → TRY
2️⃣ Kuveyt Türk: TRY yatır
3️⃣ Kuveyt Türk: Altın al

📊 <a href="https://wallet.auxite.io/admin">Admin Panel</a>
`;

  return sendTelegramMessage(message.trim());
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
<b>Miktar:</b> ${trade.toAmount.toFixed(4)} gram
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

📊 <a href="https://wallet.auxite.io/admin?tab=operations">Admin Panel - Operations</a>
`;

  return sendTelegramMessage(message.trim());
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
🥇 AUXG: ${stats.totalGrams.AUXG?.toFixed(4) || 0} gram
🥈 AUXS: ${stats.totalGrams.AUXS?.toFixed(4) || 0} gram
🪙 AUXPT: ${stats.totalGrams.AUXPT?.toFixed(4) || 0} gram
💎 AUXPD: ${stats.totalGrams.AUXPD?.toFixed(4) || 0} gram

⏳ <b>Bekleyen Ops:</b> ${stats.pendingOps}

📊 <a href="https://wallet.auxite.io/admin">Admin Panel</a>
`;

  return sendTelegramMessage(message.trim());
}

/**
 * Test mesajı gönder
 */
export async function sendTestMessage(): Promise<boolean> {
  return sendTelegramMessage("✅ Auxite Ops Bot aktif! Test mesajı başarılı.");
}
