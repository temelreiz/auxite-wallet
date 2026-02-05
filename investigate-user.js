const { Redis } = require("@upstash/redis");
require("dotenv").config({ path: ".env.local" });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function investigateUser() {
  const addr = "0xcfa4c22ae739557877173ecddf6e13c42abb6dc9";

  console.log("═══════════════════════════════════════════════════════════");
  console.log("KULLANICI KAYIT VE İLK İŞLEM ANALİZİ");
  console.log("Adres: " + addr);
  console.log("═══════════════════════════════════════════════════════════\n");

  // User info
  console.log("👤 KULLANICI BİLGİSİ:");
  const info = await redis.hgetall("user:" + addr + ":info");
  console.log(JSON.stringify(info, null, 2));

  // Referral info
  console.log("\n🔗 REFERRAL BİLGİSİ:");
  const referral = await redis.hgetall("user:" + addr + ":referral");
  console.log(JSON.stringify(referral, null, 2));

  // İlk yatırma/deposit
  console.log("\n💰 YATIRMALAR (Deposits):");
  const deposits = await redis.lrange("user:" + addr + ":deposits", 0, -1);
  if (deposits.length === 0) {
    console.log("   Hiç yatırma kaydı yok!");
  } else {
    deposits.forEach((d, i) => {
      const dep = typeof d === "string" ? JSON.parse(d) : d;
      console.log("   [" + (i+1) + "]", JSON.stringify(dep, null, 2));
    });
  }

  // Tüm işlemleri kronolojik sırala
  console.log("\n📜 TÜM İŞLEMLER (Kronolojik - eski -> yeni):");
  const transactions = await redis.lrange("user:" + addr + ":transactions", 0, -1);

  // Timestamp ile sırala
  const sorted = transactions.map(tx => {
    const t = typeof tx === "string" ? JSON.parse(tx) : tx;
    return t;
  }).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  sorted.forEach((t, i) => {
    const date = t.timestamp ? new Date(t.timestamp).toLocaleString("tr-TR") : "?";
    const type = t.type || t.tradeType || "?";

    let detail = "";
    if (t.fromToken && t.toToken) {
      detail = t.fromAmount + " " + t.fromToken.toUpperCase() + " -> " + parseFloat(t.toAmount || 0).toFixed(6) + " " + t.toToken.toUpperCase();
    } else if (t.amount) {
      detail = t.amount + " " + (t.token || t.currency || "?").toUpperCase();
    } else if (t.value) {
      detail = t.value + " " + (t.token || "?").toUpperCase();
    }

    console.log("   [" + (i+1) + "] " + date + " | " + type + " | " + detail);

    // Receive işlemlerinin detayını göster
    if (type === "receive") {
      if (t.from) console.log("       FROM: " + t.from);
      if (t.sender) console.log("       SENDER: " + t.sender);
      if (t.source) console.log("       SOURCE: " + t.source);
    }
    if (t.txHash) {
      console.log("       TX: " + t.txHash);
    }
  });

  // Telegram bot kaydı var mı?
  console.log("\n🤖 TELEGRAM BAĞLANTISI:");
  const telegramKeys = await redis.keys("telegram:*" + addr.slice(-10) + "*");
  console.log("   Telegram keys:", telegramKeys);

  // Tüm telegram user mapping'leri kontrol et
  const allTelegramMappings = await redis.keys("telegram:user:*");
  console.log("   Toplam telegram mapping:", allTelegramMappings.length);

  // Güncel bakiye
  console.log("\n📊 GÜNCEL BAKİYE:");
  const balance = await redis.hgetall("user:" + addr + ":balance");
  const nonZero = {};
  Object.entries(balance || {}).forEach(([k, v]) => {
    const val = parseFloat(v);
    if (val !== 0 && !Number.isNaN(val)) nonZero[k] = val;
  });
  console.log(JSON.stringify(nonZero, null, 2));
}

investigateUser().catch(console.error);
