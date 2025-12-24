import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, formatUnits } from "viem";
import { sepolia } from "viem/chains";

const RPC_URL = process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";

const client = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL, { timeout: 10000 }),
});

const METAL_TOKENS: Record<string, `0x${string}`> = {
  AUXG: "0xBF74Fc9f0dD50A79f9FaC2e9Aa05a268E3dcE6b6",
  AUXS: "0x705D9B193e5E349847C2Efb18E68fe989eC2C0e9",
  AUXPT: "0x1819447f624D8e22C1A4F3B14e96693625B6d74F",
  AUXPD: "0xb23545dE86bE9F65093D3a51a6ce52Ace0d8935E",
};

const USDT_ADDRESS = "0x738e3134d83014B7a63CFF08C13CBBF0671EEeF2" as `0x${string}`;

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export async function GET(request: NextRequest) {
  const address = new URL(request.url).searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }

  try {
    const balances: Record<string, number> = {
      auxg: 0, auxs: 0, auxpt: 0, auxpd: 0, usdt: 0, eth: 0,
    };

    const promises = Object.entries(METAL_TOKENS).map(async ([symbol, tokenAddress]) => {
      try {
        const balance = await client.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [address as `0x${string}`],
        });
        return { symbol: symbol.toLowerCase(), balance: parseFloat(formatUnits(balance, 18)) };
      } catch {
        return { symbol: symbol.toLowerCase(), balance: 0 };
      }
    });

    promises.push(
      client.readContract({
        address: USDT_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      }).then(b => ({ symbol: "usdt", balance: parseFloat(formatUnits(b, 6)) })).catch(() => ({ symbol: "usdt", balance: 0 }))
    );

    promises.push(
      client.getBalance({ address: address as `0x${string}` })
        .then(b => ({ symbol: "eth", balance: parseFloat(formatUnits(b, 18)) }))
        .catch(() => ({ symbol: "eth", balance: 0 }))
    );

    const results = await Promise.all(promises);
    results.forEach(r => { balances[r.symbol] = r.balance; });

    return NextResponse.json({
      success: true,
      address: address.toLowerCase(),
      balances,
      source: "blockchain",
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("Blockchain balance error:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
      balances: { auxg: 0, auxs: 0, auxpt: 0, auxpd: 0, usdt: 0, eth: 0 },
    }, { status: 200 });
  }
}
