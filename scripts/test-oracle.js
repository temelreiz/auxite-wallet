const { ethers } = require('ethers');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const p = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680');
  const privateKey = process.env.HOT_WALLET_ETH_PRIVATE_KEY;
  
  console.log('Key exists:', !!privateKey);
  
  const wallet = new ethers.Wallet(privateKey, p);
  console.log('Wallet:', wallet.address);
  
  const abi = ['function ORACLE_ROLE() view returns (bytes32)', 'function hasRole(bytes32,address) view returns (bool)'];
  const c = new ethers.Contract('0x45677fc1bE2F59937Fd6A93145Db76beB38a7CcA', abi, p);
  
  const oracleRole = await c.ORACLE_ROLE();
  const hasRole = await c.hasRole(oracleRole, wallet.address);
  console.log('Has ORACLE_ROLE:', hasRole);
}

main().catch(console.error);
