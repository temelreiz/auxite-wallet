const { ethers } = require('ethers');
const xrpl = require('xrpl');
const { Keypair } = require('@solana/web3.js');

console.log('\n🔐 HOT WALLET GENERATOR');
console.log('========================\n');
console.log('⚠️  BU BİLGİLERİ GÜVENLİ BİR YERE KAYDET!');
console.log('⚠️  ASLA GIT\'E COMMIT ETME!\n');

// ETH Wallet (ERC20 USDT için de kullanılır)
const ethWallet = ethers.Wallet.createRandom();
console.log('--- ETH / ERC20 (USDT) ---');
console.log('Address:', ethWallet.address);
console.log('Private Key:', ethWallet.privateKey);
console.log('');

// XRP Wallet
const xrpWallet = xrpl.Wallet.generate();
console.log('--- XRP ---');
console.log('Address:', xrpWallet.classicAddress);
console.log('Secret:', xrpWallet.seed);
console.log('');

// SOL Wallet
const solKeypair = Keypair.generate();
const solPrivateKey = Buffer.from(solKeypair.secretKey).toString('base64');
console.log('--- SOL ---');
console.log('Address:', solKeypair.publicKey.toBase58());
console.log('Private Key (base64):', solPrivateKey);
console.log('');

console.log('\n📋 .env.local\'e ekle:\n');
console.log(`# Hot Wallet - ETH/USDT`);
console.log(`HOT_WALLET_ETH_ADDRESS=${ethWallet.address}`);
console.log(`HOT_WALLET_ETH_PRIVATE_KEY=${ethWallet.privateKey}`);
console.log('');
console.log(`# Hot Wallet - XRP`);
console.log(`HOT_WALLET_XRP_ADDRESS=${xrpWallet.classicAddress}`);
console.log(`HOT_WALLET_XRP_SECRET=${xrpWallet.seed}`);
console.log('');
console.log(`# Hot Wallet - SOL`);
console.log(`HOT_WALLET_SOL_ADDRESS=${solKeypair.publicKey.toBase58()}`);
console.log(`HOT_WALLET_SOL_PRIVATE_KEY=${solPrivateKey}`);
console.log('');
console.log('\n✅ Wallet\'ları oluşturduktan sonra bu script\'i sil!');
