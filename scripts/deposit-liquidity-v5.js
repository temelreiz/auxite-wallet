const hre = require("hardhat");

const V5_CONTRACTS = {
  AUXG: "0x2e7fff4061134a420faB630CA04Be04f5b2C7B59",
  AUXS: "0x48016261ba15ad3603621A4F6A8985776a37bb8a",
  AUXPT: "0x2443Ef1F9a4C6f3561A2750048C68d7Bfc02363B",
  AUXPD: "0xD978F69Ab9DF519bD7f08a823c82536471CA95b3",
};

const DEPOSIT_ABI = [
  "function depositFunds() external payable",
  "function getContractBalance() view returns (uint256)",
];

async function main() {
  const [admin] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(admin.address);
  
  console.log("Admin:", admin.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Her contract'a 0.01 ETH deposit (test için)
  const depositAmount = hre.ethers.parseEther("0.01");

  for (const [metal, address] of Object.entries(V5_CONTRACTS)) {
    console.log(`${metal} (${address})`);
    
    const contract = new hre.ethers.Contract(address, DEPOSIT_ABI, admin);
    
    // Mevcut bakiyeyi kontrol et
    const currentBalance = await contract.getContractBalance();
    console.log(`  Current balance: ${hre.ethers.formatEther(currentBalance)} ETH`);
    
    // Deposit yap
    try {
      const tx = await contract.depositFunds({ value: depositAmount });
      await tx.wait();
      
      const newBalance = await contract.getContractBalance();
      console.log(`  ✅ Deposited 0.01 ETH`);
      console.log(`  New balance: ${hre.ethers.formatEther(newBalance)} ETH\n`);
    } catch (e) {
      console.log(`  ❌ Error: ${e.message.slice(0, 80)}\n`);
    }
  }

  console.log("✅ Liquidity deposit complete!");
}

main()
  .then(() => process.exit(0))
  .catch(console.error);
