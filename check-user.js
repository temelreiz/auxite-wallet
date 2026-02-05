const { Redis } = require("@upstash/redis");
require("dotenv").config({ path: ".env.local" });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function checkUser() {
  const addr = "0xcfa4c22ae739557877173ecddf6e13c42abb6dc9";

  console.log("═══════════════════════════════════════════════════════════");
  console.log("KULLANICI: " + addr);
  console.log("═══════════════════════════════════════════════════════════");

  // 1. Balance
  console.log("\n📊 GÜNCEL BAKİYE:");
  const balance = await redis.hgetall("user:" + addr + ":balance");
  if (balance) {
    Object.entries(balance).forEach(([k, v]) => {
      const val = parseFloat(v) || 0;
      if (val !== 0) {
        console.log("   " + k.toUpperCase() + ": " + val);
      }
    });
  }

  // 2. User Info
  console.log("\n👤 KULLANICI BİLGİSİ:");
  const info = await redis.hgetall("user:" + addr + ":info");
  if (info) {
    console.log("   Oluşturma:", info.createdAt ? new Date(parseInt(info.createdAt)).toLocaleString("tr-TR") : "Bilinmiyor");
    console.log("   Email:", info.email || "Yok");
  }

  // 3. Transactions
  console.log("\n📜 İŞLEM GEÇMİŞİ:");
  const transactions = await redis.lrange("user:" + addr + ":transactions", 0, -1);

  if (transactions.length === 0) {
    console.log("   Hiç işlem yok");
  } else {
    console.log("   Toplam " + transactions.length + " işlem:\n");

    transactions.forEach((tx, i) => {
      const t = typeof tx === "string" ? JSON.parse(tx) : tx;
      const date = t.timestamp ? new Date(t.timestamp).toLocaleString("tr-TR") : "Bilinmiyor";

      console.log("   [" + (i + 1) + "] " + date);
      console.log("       Tip: " + (t.type || t.tradeType || "Bilinmiyor"));

      if (t.fromToken && t.toToken) {
        const toAmt = t.toAmount ? parseFloat(t.toAmount).toFixed(8) : "?";
        console.log("       " + t.fromAmount + " " + t.fromToken.toUpperCase() + " -> " + toAmt + " " + t.toToken.toUpperCase());
      }

      if (t.txHash) {
        console.log("       TxHash: " + t.txHash.slice(0, 30) + "...");
      }

      if (t.blockchainResult) {
        const exec = t.blockchainResult.executed ? "✅ Executed" : "❌ Not executed";
        console.log("       Blockchain: " + exec);
        if (t.blockchainResult.reason) {
          console.log("       Neden: " + t.blockchainResult.reason);
        }
      }

      console.log("");
    });
  }

  // 4. Deposits
  console.log("\n💰 YATIRMALAR:");
  const deposits = await redis.lrange("user:" + addr + ":deposits", 0, -1);
  if (deposits.length === 0) {
    console.log("   Hiç yatırma yok");
  } else {
    deposits.forEach((d, i) => {
      const dep = typeof d === "string" ? JSON.parse(d) : d;
      console.log("   [" + (i + 1) + "] " + dep.amount + " " + (dep.token || dep.currency || "ETH").toUpperCase());
      if (dep.txHash) console.log("       TxHash: " + dep.txHash.slice(0, 30) + "...");
    });
  }
}

checkUser().catch(console.error);
