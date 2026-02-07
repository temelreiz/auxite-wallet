// test-price.js
import { ethers } from "ethers";
import "dotenv/config";

const RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL 
  || process.env.SEPOLIA_RPC_URL;

const AUXG = "0x5B18e37006B605c64b6d296409c7A98e136d68e9";

async function main() {
  if (!RPC_URL) {
    throw new Error("RPC_URL / NEXT_PUBLIC_SEPOLIA_RPC_URL yok");
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  const auxg = new ethers.Contract(
    AUXG,
    [
      "function pricePerGramAskE6() view returns (uint256)",
      "function pricePerGramBidE6() view returns (uint256)",
    ],
    provider
  );

  const askE6 = await auxg.pricePerGramAskE6();
  const bidE6 = await auxg.pricePerGramBidE6();

  console.log("AUXG ask:", Number(askE6) / 1e6, "USD/g");
  console.log("AUXG bid:", Number(bidE6) / 1e6, "USD/g");
}

main().catch(console.error);
