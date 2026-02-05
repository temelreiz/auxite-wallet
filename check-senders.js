const { Redis } = require("@upstash/redis");
require("dotenv").config({ path: ".env.local" });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function checkSenders() {
  // Gönderenleri kontrol et
  const senders = [
    { addr: "0x101bd08219773e0ff8cd3805542c0a2835fec0ff", sent: "10 USDT" },
    { addr: "0x742d35cc6634c0532925a3b844bc9e7595f5be21", sent: "1 USDT" },
    { addr: "0x7bb286a8c876ac6283dd0b95d8ec853bbdb20378", sent: "0.0006 BTC (Admin)" }
  ];

  for (const { addr, sent } of senders) {
    console.log("═══════════════════════════════════════");
    console.log("GÖNDEREN: " + addr.slice(0, 10) + "..." + addr.slice(-6));
    console.log("GÖNDERDİĞİ: " + sent);

    const info = await redis.hgetall("user:" + addr + ":info");
    if (info && Object.keys(info).length > 0) {
      console.log("Info:", JSON.stringify(info, null, 2));
    } else {
      console.log("Info: Yok");
    }

    const balance = await redis.hgetall("user:" + addr + ":balance");
    const nonZero = {};
    Object.entries(balance || {}).forEach(([k, v]) => {
      const val = parseFloat(v);
      if (val > 0.0001) nonZero[k] = val;
    });
    console.log("Balance:", JSON.stringify(nonZero, null, 2));
    console.log("");
  }
}

checkSenders().catch(console.error);
