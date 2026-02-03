// scripts/show-transactions.js
// Son işlemleri detaylı göster

require('dotenv').config({ path: '.env.local' });

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const WALLET_ADDRESS = '0x88845967e80d76342729c35572e5f0179269b75c'.toLowerCase();

async function upstashCommand(command) {
  const response = await fetch(`${UPSTASH_URL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  const data = await response.json();
  return data.result;
}

async function showTransactions() {
  try {
    console.log('📜 Son İşlemler');
    console.log('─'.repeat(80));

    const txKey = `user:${WALLET_ADDRESS}:transactions`;
    const transactions = await upstashCommand(['LRANGE', txKey, '0', '20']);

    if (transactions && transactions.length > 0) {
      console.log(`Toplam ${transactions.length} işlem bulundu:\n`);

      transactions.forEach((tx, i) => {
        try {
          const parsed = JSON.parse(tx);
          console.log(`${i + 1}. ─────────────────────────────────────────────────`);
          console.log(`   ID: ${parsed.id || 'N/A'}`);
          console.log(`   Type: ${parsed.type}`);
          console.log(`   From: ${parsed.fromAmount} ${parsed.fromToken}`);
          console.log(`   To:   ${parsed.toAmount} ${parsed.toToken}`);
          console.log(`   Fee:  ${parsed.fee} (${parsed.feePercent}%)`);
          console.log(`   Status: ${parsed.status}`);
          console.log(`   Time: ${new Date(parsed.timestamp).toLocaleString()}`);
          if (parsed.txHash) console.log(`   TxHash: ${parsed.txHash}`);
          if (parsed.blockchain) console.log(`   Blockchain: ${JSON.stringify(parsed.blockchain)}`);
        } catch (e) {
          console.log(`${i + 1}. [Parse error]`, tx.substring(0, 100));
        }
      });
    } else {
      console.log('İşlem bulunamadı');
    }

    // Mevcut bakiye
    console.log('\n\n📊 Güncel Bakiye');
    console.log('─'.repeat(80));

    const balanceKey = `user:${WALLET_ADDRESS}:balance`;
    const balance = await upstashCommand(['HGETALL', balanceKey]);

    if (balance && balance.length > 0) {
      for (let i = 0; i < balance.length; i += 2) {
        const value = parseFloat(balance[i + 1]);
        if (value > 0) {
          console.log(`   ${balance[i].toUpperCase()}: ${value}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

showTransactions();
