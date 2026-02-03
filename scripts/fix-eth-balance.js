// scripts/fix-eth-balance.js
// ETH bakiyesini düzelt - 0.07 ETH harcandı ama düşülmedi

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

async function fixEthBalance() {
  try {
    const balanceKey = `user:${WALLET_ADDRESS}:balance`;

    // Mevcut bakiyeyi al
    console.log('📊 Mevcut Bakiye:');
    const currentBalance = await upstashCommand(['HGETALL', balanceKey]);

    let ethBalance = 0;
    let auxgBalance = 0;

    for (let i = 0; i < currentBalance.length; i += 2) {
      if (currentBalance[i] === 'eth') ethBalance = parseFloat(currentBalance[i + 1]);
      if (currentBalance[i] === 'auxg') auxgBalance = parseFloat(currentBalance[i + 1]);
      console.log(`   ${currentBalance[i]}: ${currentBalance[i + 1]}`);
    }

    console.log('\n─'.repeat(50));
    console.log('🔧 Düzeltme:');
    console.log(`   ETH: ${ethBalance} → 0 (0.07 harcandı)`);
    console.log(`   AUXG: ${auxgBalance} (değişmeyecek)`);

    if (process.env.EXECUTE === 'true') {
      // ETH'yi 0'a set et (0.07 harcandı)
      await upstashCommand(['HSET', balanceKey, 'eth', '0']);

      console.log('\n✅ ETH bakiyesi 0 olarak güncellendi!');

      // Doğrula
      const newBalance = await upstashCommand(['HGETALL', balanceKey]);
      console.log('\n📊 Yeni Bakiye:');
      for (let i = 0; i < newBalance.length; i += 2) {
        const val = parseFloat(newBalance[i + 1]);
        if (val > 0 || newBalance[i] === 'eth') {
          console.log(`   ${newBalance[i]}: ${newBalance[i + 1]}`);
        }
      }
    } else {
      console.log('\n⚠️  Düzeltmeyi uygulamak için: EXECUTE=true node scripts/fix-eth-balance.js');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixEthBalance();
