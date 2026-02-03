// scripts/check-upstash-balance.js
// Upstash REST API ile Redis'teki bakiyeleri kontrol et

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

async function checkBalance() {
  try {
    console.log('🔍 Checking Upstash Redis...');
    console.log(`   URL: ${UPSTASH_URL}`);
    console.log(`   Wallet: ${WALLET_ADDRESS}`);
    console.log('─'.repeat(60));

    // 1. Balance key'i kontrol et
    const balanceKey = `user:${WALLET_ADDRESS}:balance`;
    console.log(`\n📊 Checking: ${balanceKey}`);
    const balance = await upstashCommand(['HGETALL', balanceKey]);

    if (balance && balance.length > 0) {
      console.log('   Balance found:');
      for (let i = 0; i < balance.length; i += 2) {
        console.log(`     ${balance[i]}: ${balance[i + 1]}`);
      }
    } else {
      console.log('   No balance found');
    }

    // 2. User data kontrol et
    const userKey = `user:${WALLET_ADDRESS}`;
    console.log(`\n👤 Checking: ${userKey}`);
    const userData = await upstashCommand(['HGETALL', userKey]);

    if (userData && userData.length > 0) {
      console.log('   User data found:');
      for (let i = 0; i < userData.length; i += 2) {
        console.log(`     ${userData[i]}: ${userData[i + 1]}`);
      }
    } else {
      console.log('   No user data found');
    }

    // 3. Transactions kontrol et
    const txKey = `user:${WALLET_ADDRESS}:transactions`;
    console.log(`\n📜 Checking: ${txKey}`);
    const transactions = await upstashCommand(['LRANGE', txKey, '0', '5']);

    if (transactions && transactions.length > 0) {
      console.log(`   Found ${transactions.length} transactions:`);
      transactions.forEach((tx, i) => {
        try {
          const parsed = JSON.parse(tx);
          console.log(`     ${i + 1}. ${parsed.type} ${parsed.fromToken}→${parsed.toToken}: ${parsed.fromAmount}→${parsed.toAmount}`);
        } catch (e) {
          console.log(`     ${i + 1}. [Parse error]`);
        }
      });
    } else {
      console.log('   No transactions found');
    }

    // 4. SCAN ile tüm user:* keylerini ara
    console.log('\n🔎 Scanning all user:* keys...');
    let cursor = '0';
    let allKeys = [];

    do {
      const result = await upstashCommand(['SCAN', cursor, 'MATCH', 'user:*', 'COUNT', '100']);
      cursor = result[0];
      allKeys = allKeys.concat(result[1]);
    } while (cursor !== '0');

    console.log(`   Found ${allKeys.length} user:* keys`);

    // Wallet adresini içeren keyleri filtrele
    const matchingKeys = allKeys.filter(k =>
      k.toLowerCase().includes(WALLET_ADDRESS.slice(2, 10))
    );

    if (matchingKeys.length > 0) {
      console.log(`\n   ✅ Keys matching wallet address:`);
      for (const key of matchingKeys) {
        console.log(`      - ${key}`);
      }
    }

    // 5. İlk 10 user key'i göster
    console.log('\n📋 Sample user keys:');
    const sampleKeys = allKeys.slice(0, 10);
    for (const key of sampleKeys) {
      const type = await upstashCommand(['TYPE', key]);
      console.log(`   ${key} (${type})`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

checkBalance();
