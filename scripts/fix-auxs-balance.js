// scripts/fix-auxs-balance.js
// Redis'teki yanlış AUXS bakiyesini sıfırla

const Redis = require('ioredis');
require('dotenv').config({ path: '.env.local' });

const redis = new Redis(process.env.REDIS_URL || process.env.KV_URL);

const WALLET_ADDRESS = '0x7bb286a8C876aC6283Dd0B95d8ec853bbDb20378'.toLowerCase();

async function fixBalance() {
  try {
    console.log('🔍 Checking current balances...');
    
    // Mevcut bakiyeleri oku
    const balanceKey = `user:balances:${WALLET_ADDRESS}`;
    const currentBalances = await redis.hgetall(balanceKey);
    
    console.log('Current balances:', currentBalances);
    
    if (currentBalances.auxs) {
      console.log(`\n⚠️  Current AUXS in Redis: ${currentBalances.auxs}g`);
      console.log('Setting AUXS to 0...');
      
      // AUXS bakiyesini sıfırla
      await redis.hset(balanceKey, 'auxs', '0');
      
      console.log('✅ AUXS balance set to 0');
      
      // Doğrulama
      const newBalances = await redis.hgetall(balanceKey);
      console.log('\nNew balances:', newBalances);
    } else {
      console.log('AUXS balance is already 0 or not set');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await redis.quit();
  }
}

fixBalance();
