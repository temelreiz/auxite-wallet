const { ethers } = require("ethers");

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const OWNER_PRIVATE_KEY = "0xce3400bebcef2d7603216e8340b7ee29bcb493edb8f7b30d088c3edec63bc401";
const ORACLE = "0x45677fc1bE2F59937Fd6A93145Db76beB38a7CcA";

// Token ID from contract - this is what AUXG uses
const GOLD_TOKEN_ID = "0x3496e2e73c4d42b75d702e60d9e48102720b8691234415963a5a857b86425d07";

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  
  // Get oracle bytecode to find function selectors
  const code = await provider.getCode(ORACLE);
  console.log("Oracle bytecode length:", code.length);
  
  // Known function selectors to search
  const selectors = {
    "0e032ba0": "getLatestPrice(bytes32)",
    "c551b800": "getEthPrice()",
    "ada43a1f": "getPrice(bytes32)",
    "e75235b8": "setPrice(bytes32,uint256)",
    "8d6cc56d": "updatePrice(bytes32,uint256)",
    "0902f1ac": "getReserves()",
    "69fe0e2d": "setFee(uint256)",
    "fc0c546a": "token()",
    "8da5cb5b": "owner()",
  };
  
  console.log("\n=== Found selectors in bytecode ===");
  for (const [sel, name] of Object.entries(selectors)) {
    if (code.toLowerCase().includes(sel)) {
      console.log(`✅ ${name} (0x${sel})`);
    }
  }

  // Try direct low-level call to read price
  console.log("\n=== Trying low-level calls ===");
  
  // Try getLatestPrice(bytes32)
  const getLatestPriceData = "0x0e032ba0" + GOLD_TOKEN_ID.slice(2);
  try {
    const result = await provider.call({
      to: ORACLE,
      data: getLatestPriceData,
    });
    console.log("getLatestPrice result:", result);
    if (result !== "0x") {
      const price = BigInt(result);
      console.log("Decoded price:", price.toString());
    }
  } catch(e) {
    console.log("getLatestPrice call failed:", e.message.slice(0, 60));
  }

  // Try ada43a1f (getPrice)
  const getPriceData = "0xada43a1f" + GOLD_TOKEN_ID.slice(2);
  try {
    const result = await provider.call({
      to: ORACLE,
      data: getPriceData,
    });
    console.log("getPrice result:", result);
  } catch(e) {
    console.log("getPrice call failed");
  }

  // Set all prices and ETH price
  console.log("\n=== Setting all prices ===");
  
  const oracleAbi = [
    "function updatePrice(bytes32, uint256) external",
    "function setEthPrice(uint256) external",
  ];
  const oracle = new ethers.Contract(ORACLE, oracleAbi, wallet);
  
  // Token IDs from AUXG contract bytecode
  const tokens = {
    GOLD: "0x3496e2e73c4d42b75d702e60d9e48102720b8691234415963a5a857b86425d07",
    SILVER: "0xee566534db4be977568dfe4ffe67466f5f29880d065f02314dd9f131ef9fb0ae",
    PLATINUM: "0x",
    PALLADIUM: "0x",
  };

  // Set gold price: $95/gram with 8 decimals
  try {
    const tx = await oracle.updatePrice(tokens.GOLD, 9500000000n, { gasLimit: 100000 });
    await tx.wait();
    console.log("✅ Gold price set");
  } catch(e) {
    console.log("Gold:", e.message.slice(0, 50));
  }

  // Set ETH price: $3500 with 8 decimals
  try {
    const tx = await oracle.setEthPrice(350000000000n, { gasLimit: 100000 });
    await tx.wait();
    console.log("✅ ETH price set");
  } catch(e) {
    console.log("ETH setEthPrice:", e.message.slice(0, 50));
  }
}

main().catch(console.error);
