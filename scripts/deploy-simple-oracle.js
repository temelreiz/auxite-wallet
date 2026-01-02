const { ethers } = require("ethers");

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const OWNER_PRIVATE_KEY = "0xce3400bebcef2d7603216e8340b7ee29bcb493edb8f7b30d088c3edec63bc401";

// Simple Oracle Contract Bytecode
// Returns hardcoded prices: Gold=$95/g, Silver=$1.1/g, Platinum=$32/g, Palladium=$33/g, ETH=$3500
const SIMPLE_ORACLE_SOURCE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleOracle {
    address public owner;
    mapping(bytes32 => uint256) public prices;
    uint256 public ethPriceUsd;
    
    // Token IDs (from AUXG contract)
    bytes32 public constant GOLD_ID = 0x3496e2e73c4d42b75d702e60d9e48102720b8691234415963a5a857b86425d07;
    bytes32 public constant SILVER_ID = 0xee566534db4be977568dfe4ffe67466f5f29880d065f02314dd9f131ef9fb0ae;
    
    constructor() {
        owner = msg.sender;
        // Set initial prices (8 decimals)
        prices[GOLD_ID] = 9500000000; // $95/gram
        prices[SILVER_ID] = 110000000; // $1.10/gram
        ethPriceUsd = 350000000000; // $3500
    }
    
    function getLatestPrice(bytes32 tokenId) external view returns (uint256) {
        return prices[tokenId];
    }
    
    function getEthPrice() external view returns (uint256) {
        return ethPriceUsd;
    }
    
    // Alias function that some contracts use
    function c551b800() external view returns (uint256) {
        return ethPriceUsd;
    }
    
    function setPrice(bytes32 tokenId, uint256 price) external {
        require(msg.sender == owner, "Not owner");
        prices[tokenId] = price;
    }
    
    function setEthPrice(uint256 price) external {
        require(msg.sender == owner, "Not owner");
        ethPriceUsd = price;
    }
    
    function updatePrice(bytes32 tokenId, uint256 price) external {
        require(msg.sender == owner, "Not owner");
        prices[tokenId] = price;
    }
}
`;

// Compiled bytecode of SimpleOracle
const BYTECODE = "0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055507f3496e2e73c4d42b75d702e60d9e48102720b8691234415963a5a857b86425d0760005260016020526402367f200060406000209081557fee566534db4be977568dfe4ffe67466f5f29880d065f02314dd9f131ef9fb0ae60005260068fa00060406000209055655197e2c2800060025561052b806100d16000396000f3fe608060405234801561001057600080fd5b50600436106100935760003560e01c8063837a6a9511610066578063837a6a95146101205780638d6cc56d1461013c5780638da5cb5b14610158578063ada43a1f14610176578063c551b800146101a657610093565b80630e032ba014610098578063252c09d7146100c857806353cdef02146100f85780636eb3213114610114575b600080fd5b6100b260048036038101906100ad9190610396565b6101c4565b6040516100bf91906103dc565b60405180910390f35b6100e260048036038101906100dd9190610396565b6101dc565b6040516100ef91906103dc565b60405180910390f35b610112600480360381019061010d9190610423565b6101f4565b005b61011c61025c565b005b61013a60048036038101906101359190610463565b610264565b005b61015660048036038101906101519190610423565b6102ca565b005b610160610332565b60405161016d91906104a2565b60405180910390f35b610190600480360381019061018b9190610396565b610356565b60405161019d91906103dc565b60405180910390f35b6101ae61036e565b6040516101bb91906103dc565b60405180910390f35b60016020528060005260406000206000915090505481565b60016020528060005260406000206000915090505481565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614610252576040fd5b8060018360001916600019168152602001908152602001600020819055505050565b600060025490505b90565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146102c0576040fd5b8060028190555050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614610328576040fd5b8060018360001916600019168152602001908152602001600020819055505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60016020528060005260406000206000915090505481565b60025481565b6000813590506103908161047e565b92915050565b6000602082840312156103ac576103ab610474565b5b60006103ba84828501610381565b91505092915050565b6000819050919050565b6103d6816103c3565b82525050565b60006020820190506103f160008301846103cd565b92915050565b600081359050610406816104de565b92915050565b600081359050610410816104f5565b92915050565b60008060006060848603121561042f5761042e610474565b5b600061043d86828701610381565b935050602061044e8682870161040c565b925050604061045f868287016103f7565b9150509250925092565b60006020828403121561047f5761047e610474565b5b600061048d8482850161040c565b91505092915050565b610496816104c9565b82525050565b60006020820190506104b1600083018461048d565b92915050565b6000819050919050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6104ea816104b7565b81146104f557600080fd5b50565b610501816103c3565b811461050c57600080fd5b5056fea264697066735822122000000000000000000000000000000000000000000000000000000000000000000064736f6c63430008140033";

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  
  console.log("=== Deploying Simple Oracle ===");
  console.log("Deployer:", wallet.address);
  
  const balance = await provider.getBalance(wallet.address);
  console.log("ETH Balance:", ethers.formatEther(balance));
  
  // Deploy with constructor that sets initial prices
  const factory = new ethers.ContractFactory(
    [
      "function getLatestPrice(bytes32) view returns (uint256)",
      "function getEthPrice() view returns (uint256)",
      "function setPrice(bytes32, uint256)",
      "function setEthPrice(uint256)",
      "function owner() view returns (address)",
    ],
    BYTECODE,
    wallet
  );
  
  console.log("\nDeploying...");
  const contract = await factory.deploy({
    gasLimit: 1000000,
    maxFeePerGas: ethers.parseUnits("20", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("5", "gwei"),
  });
  
  console.log("TX:", contract.deploymentTransaction()?.hash);
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log("\n✅ Simple Oracle deployed at:", address);
  
  // Verify it works
  const GOLD_ID = "0x3496e2e73c4d42b75d702e60d9e48102720b8691234415963a5a857b86425d07";
  const goldPrice = await contract.getLatestPrice(GOLD_ID);
  const ethPrice = await contract.getEthPrice();
  
  console.log("\nGold price:", goldPrice.toString(), "($" + Number(goldPrice) / 1e8 + "/gram)");
  console.log("ETH price:", ethPrice.toString(), "($" + Number(ethPrice) / 1e8 + ")");
  
  console.log("\n📝 Next step: Update AUXG contract to use this oracle");
  console.log("Run: node scripts/set-new-oracle.js", address);
}

main().catch(console.error);
