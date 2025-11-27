{
  "name": "auxite-contracts",
  "version": "1.0.0",
  "description": "Auxite metal-backed token smart contracts",
  "scripts": {
    "compile": "hardhat compile",
    "test": "hardhat test",
    "deploy:sepolia": "hardhat run scripts/deploy.ts --network sepolia",
    "deploy:local": "hardhat run scripts/deploy.ts --network localhost",
    "node": "hardhat node",
    "verify": "hardhat verify --network sepolia"
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^4.0.0",
    "@nomicfoundation/hardhat-verify": "^2.0.0",
    "@openzeppelin/contracts": "^5.0.0",
    "@typechain/ethers-v6": "^0.5.0",
    "@typechain/hardhat": "^9.0.0",
    "@types/node": "^20.0.0",
    "hardhat": "^2.19.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.0.0"
  }
}