const { ethers } = require("hardhat");

async function main() {
  const oracle = await ethers.getContractAt(
    "AuxiteMetalOracleV2", 
    "0x8ccA0FC65B5b745cdF8C427cb43e1EC29A95a51d"
  );
  
  const ORACLE_ROLE = "0x68e79a7bf1e0bc45d0a330c573bc367f9cf464fd326078812f301165fbda4ef1";
  const HOT_WALLET = "0xaE4d3eb67558423f74E8D80F56fbdfc1F91F3213";
  
  console.log("Granting ORACLE_ROLE to hot wallet...");
  const tx = await oracle.grantRole(ORACLE_ROLE, HOT_WALLET);
  await tx.wait();
  console.log("Done!", tx.hash);
}

main();
