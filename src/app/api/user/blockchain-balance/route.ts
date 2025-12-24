import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, formatUnits } from "viem";
import { sepolia } from "viem/chains";

const client = createPublicClient({
  chain: sepolia,
  transport: http(),
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
    const balances: Record<string, number> = {};

    // Get metal balances (18 decimals)
    for (const [symbol, tokenAddress] of Object.entries(METAL_TOKENS)) {
      try {
        const balance = await client.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [address as `0x${string}`],
        });
        balances[symbol.toLowerCase()] = parseFloat(formatUnits(balance, 18));
      } catch (e) {
        balances[symbol.toLowerCase()] = 0;
      }
    }

    // Get USDT balance (6 decimals)
    try {
      const usdtBalance = await client.readContract({
        address: USDT_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      });
      balances.usdt = parseFloat(formatUnits(usdtBalance, 6));
    } catch (e) {
      balances.usdt = 0;
    }

    // Get ETH balance
    try {
      const ethBalance = await client.getBalance({ address: address as `0x${string}` });
      balances.eth = parseFloat(formatUnits(ethBalance, 18));
    } catch (e) {
      balances.eth = 0;
    }

    return NextResponse.json({
      success: true,
      address: address.toLowerCase(),
      balances,
      source: "blockchain",
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
