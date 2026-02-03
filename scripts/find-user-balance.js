// scripts/find-user-balance.js
// Redis'te kullanıcı bakiyelerini ara

const Redis = require('ioredis');
require('dotenv').config({ path: '.env.local' });

const redis = new Redis(process.env.REDIS_URL || process.env.KV_URL);

const WALLET_ADDRESS = '0x88845967e80d76342729c35572e5f0179269b75c';

async function findUserBalance() {
  try {
    console.log('🔍 Searching for wallet:', WALLET_ADDRESS);
    console.log('─'.repeat(60));

    // Farklı key formatlarını dene
    const keysToCheck = [
      `user:${WALLET_ADDRESS.toLowerCase()}:balance`,
      `user:${WALLET_ADDRESS}:balance`,
      `user:balances:${WALLET_ADDRESS.toLowerCase()}`,
      `user:balances:${WALLET_ADDRESS}`,
      `balance:${WALLET_ADDRESS.toLowerCase()}`,
      `balance:${WALLET_ADDRESS}`,
    ];

    console.log('\n📋 Checking specific keys:');
    for (const key of keysToCheck) {
      const data = await redis.hgetall(key);
      if (Object.keys(data).length > 0) {
        console.log(`  ✅ Found: ${key}`);
        console.log(`     Data: ${JSON.stringify(data)}`);
      } else {
        console.log(`  ❌ Empty: ${key}`);
      }
    }

    // Wildcard ile ara
    console.log('\n🔎 Scanning for user:* keys...');
    let cursor = '0';
    let foundKeys = [];

    do {
      const [newCursor, keys] = await redis.scan(cursor, 'MATCH', 'user:*', 'COUNT', 100);
      cursor = newCursor;
      foundKeys = foundKeys.concat(keys);
    } while (cursor !== '0');

    console.log(`  Found ${foundKeys.length} user:* keys`);

    // İlk 20'sini göster
    const sample = foundKeys.slice(0, 20);
    console.log('\n📋 Sample keys:');
    for (const key of sample) {
      const type = await redis.type(key);
      if (type === 'hash') {
        const data = await redis.hgetall(key);
        console.log(`  ${key} (hash): ${JSON.stringify(data).substring(0, 100)}...`);
      } else {
        const data = await redis.get(key);
        console.log(`  ${key} (${type}): ${String(data).substring(0, 50)}...`);
      }
    }

    // Address'i içeren keyleri ara
    console.log('\n🔎 Scanning for keys containing wallet address...');
    cursor = '0';
    let addressKeys = [];

    do {
      const [newCursor, keys] = await redis.scan(cursor, 'MATCH', `*${WALLET_ADDRESS.toLowerCase().slice(2, 10)}*`, 'COUNT', 100);
      cursor = newCursor;
      addressKeys = addressKeys.concat(keys);
    } while (cursor !== '0');

    if (addressKeys.length > 0) {
      console.log(`  Found ${addressKeys.length} keys containing address:`);
      for (const key of addressKeys) {
        console.log(`    - ${key}`);
      }
    } else {
      console.log('  No keys found containing wallet address');
    }

    // Email ile kayıtlı olabilir - user:address mapping'i kontrol et
    console.log('\n🔎 Checking user:address:* mappings...');
    cursor = '0';
    let addressMappings = [];

    do {
      const [newCursor, keys] = await redis.scan(cursor, 'MATCH', 'user:address:*', 'COUNT', 100);
      cursor = newCursor;
      addressMappings = addressMappings.concat(keys);
    } while (cursor !== '0');

    console.log(`  Found ${addressMappings.length} address mappings`);

    // Bizim adresi ara
    for (const key of addressMappings) {
      if (key.toLowerCase().includes(WALLET_ADDRESS.toLowerCase().slice(2, 20))) {
        const userId = await redis.get(key);
        console.log(`  ✅ Found mapping: ${key} → ${userId}`);

        // User data'yı al
        if (userId) {
          const userData = await redis.hgetall(`user:${userId}`);
          console.log(`     User data: ${JSON.stringify(userData)}`);

          // Balance key'i bul
          const balanceKey = `user:${userId}:balance`;
          const balance = await redis.hgetall(balanceKey);
          console.log(`     Balance: ${JSON.stringify(balance)}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await redis.quit();
  }
}

findUserBalance();
