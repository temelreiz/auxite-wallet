import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, formatUnits } from "viem";
import { base } from "viem/chains";
import { METAL_TOKENS, USDT_ADDRESS } from "@/config/contracts-v8";

// Base Mainnet for metal tokens
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || process.env.BASE_RPC_URL || "https://mainnet.base.org";

const client = createPublicClient({
  chain: base,
  transport: http(RPC_URL, { timeout: 10000 }),
});

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
