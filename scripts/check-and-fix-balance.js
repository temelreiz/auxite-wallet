// scripts/check-and-fix-balance.js
// Redis'teki bakiyeleri kontrol et ve düzelt

const Redis = require('ioredis');
require('dotenv').config({ path: '.env.local' });

const redis = new Redis(process.env.REDIS_URL || process.env.KV_URL);

const WALLET_ADDRESS = '0x88845967e80d76342729c35572e5f0179269b75c'.toLowerCase();

async function checkAndFixBalance() {
  try {
    console.log('🔍 Checking balances for:', WALLET_ADDRESS);
    console.log('─'.repeat(60));

    // 1. Check balance key
    const balanceKey = `user:${WALLET_ADDRESS}:balance`;
    const currentBalances = await redis.hgetall(balanceKey);

    console.log('\n📊 Current Redis Balances:');
    console.log(JSON.stringify(currentBalances, null, 2));

    // 2. Check user data
    const userData = await redis.hgetall(`user:${WALLET_ADDRESS}`);
    console.log('\n👤 User Data:');
    console.log(JSON.stringify(userData, null, 2));

    // 3. Check transactions
    const txKey = `user:${WALLET_ADDRESS}:transactions`;
    const transactions = await redis.lrange(txKey, 0, 10);
    console.log('\n📜 Recent Transactions:');
    transactions.forEach((tx, i) => {
      try {
        const parsed = JSON.parse(tx);
        console.log(`  ${i + 1}. ${parsed.type} ${parsed.fromToken} → ${parsed.toToken}: ${parsed.fromAmount} → ${parsed.toAmount}`);
        console.log(`     Status: ${parsed.status}, Time: ${new Date(parsed.timestamp).toISOString()}`);
      } catch (e) {
        console.log(`  ${i + 1}. [Parse error]`, tx);
      }
    });

    // 4. Show current state
    console.log('\n─'.repeat(60));
    console.log('📈 Balance Summary:');
    console.log(`  ETH:  ${currentBalances.eth || 0}`);
    console.log(`  AUXG: ${currentBalances.auxg || 0}`);
    console.log(`  AUXM: ${currentBalances.auxm || 0}`);
    console.log(`  USDT: ${currentBalances.usdt || 0}`);

    // 5. Fix balance if needed
    const ethBalance = parseFloat(currentBalances.eth || 0);
    const auxgBalance = parseFloat(currentBalances.auxg || 0);

    console.log('\n─'.repeat(60));

    // Sorun: ETH harcandı ama düşülmedi, AUXG alındı ama eklenmedi
    // Düzeltme: ETH'den 0.07 düş (işlem miktarına göre ayarlayın)
    // AUXG'ye alınan miktarı ekle

    // Kullanıcıya sor
    console.log('\n⚠️  Düzeltme önerisi:');
    console.log('  - ETH bakiyesinden işlem miktarı düşülmeli');
    console.log('  - AUXG bakiyesine alınan miktar eklenmeli');
    console.log('\n  Düzeltmek için: FIX=true node scripts/check-and-fix-balance.js');

    if (process.env.FIX === 'true') {
      console.log('\n🔧 Düzeltme yapılıyor...');

      // Son işlemi bul
      const lastTx = transactions[0] ? JSON.parse(transactions[0]) : null;

      if (lastTx && lastTx.fromToken === 'ETH' && lastTx.toToken === 'AUXG') {
        const ethToDeduct = parseFloat(lastTx.fromAmount);
        const auxgToAdd = parseFloat(lastTx.toAmount);

        console.log(`  ETH düşülecek: ${ethToDeduct}`);
        console.log(`  AUXG eklenecek: ${auxgToAdd}`);

        // ETH düş
        const newEth = Math.max(0, ethBalance - ethToDeduct);
        await redis.hset(balanceKey, 'eth', newEth.toString());

        // AUXG ekle (zaten eklenmemişse)
        if (auxgBalance < auxgToAdd) {
          const newAuxg = auxgBalance + auxgToAdd;
          await redis.hset(balanceKey, 'auxg', newAuxg.toString());
        }

        // Doğrula
        const newBalances = await redis.hgetall(balanceKey);
        console.log('\n✅ Yeni bakiyeler:');
        console.log(`  ETH:  ${newBalances.eth}`);
        console.log(`  AUXG: ${newBalances.auxg}`);
      } else {
        console.log('  Son işlem bulunamadı veya ETH→AUXG işlemi değil');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await redis.quit();
  }
}

checkAndFixBalance();
