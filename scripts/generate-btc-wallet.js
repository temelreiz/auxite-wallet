const bitcoin = require('bitcoinjs-lib');
const ecc = require('tiny-secp256k1');
const { ECPairFactory } = require('ecpair');

const ECPair = ECPairFactory(ecc);

console.log('\n🔐 BTC WALLET GENERATOR');
console.log('========================\n');

// Random private key
const keyPair = ECPair.makeRandom();

// SegWit address (bc1...)
const { address } = bitcoin.payments.p2wpkh({ 
  pubkey: keyPair.publicKey,
  network: bitcoin.networks.bitcoin 
});

console.log('--- BTC Mainnet (SegWit) ---');
console.log('Address:', address);
console.log('Private Key (WIF):', keyPair.toWIF());
console.log('');

console.log('\n📋 NOWPayments için bu adresi kullan:');
console.log(address);
console.log('');

console.log('\n⚠️  PRIVATE KEY\'İ GÜVENLİ YERE KAYDET!');
