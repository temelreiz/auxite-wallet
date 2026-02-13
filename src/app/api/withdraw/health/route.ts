// /api/withdraw/health - Hot wallet bakiye kontrolü (withdraw hazırlık durumu)
import { NextResponse } from "next/server";
import { ethers } from "ethers";

export const dynamic = "force-dynamic";

const ETH_MAINNET_RPC = process.env.ETH_MAINNET_RPC ||
  "https://mainnet.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";

const BASE_RPC = process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://mainnet.base.org";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

export async function GET() {
  try {
    const hotWalletAddress = process.env.HOT_WALLET_ETH_ADDRESS;
    const hasPrivateKey = !!process.env.HOT_WALLET_ETH_PRIVATE_KEY || !!process.env.AWS_SECRET_ACCESS_KEY;

    if (!hotWalletAddress) {
      return NextResponse.json({
        ready: false,
        error: "HOT_WALLET_ETH_ADDRESS not configured",
      }, { status: 503 });
    }

    const results: Record<string, any> = {
      hotWalletAddress,
      hasPrivateKey,
      timestamp: new Date().toISOString(),
    };

    // ETH Mainnet checks (for USDT withdrawal)
    try {
      const ethProvider = new ethers.JsonRpcProvider(ETH_MAINNET_RPC);

      // ETH balance on mainnet (for gas)
      const ethBalance = await ethProvider.getBalance(hotWalletAddress);
      results.ethMainnet = {
        ethForGas: ethers.formatEther(ethBalance),
        ethForGasOk: ethBalance > ethers.parseEther("0.01"), // minimum 0.01 ETH for gas
      };

      // USDT balance on mainnet
      const USDT_CONTRACT = process.env.USDT_CONTRACT_ADDRESS || "0xdAC17F958D2ee523a2206206994597C13D831ec7";
      const usdtContract = new ethers.Contract(USDT_CONTRACT, ERC20_ABI, ethProvider);
      const usdtBalance = await usdtContract.balanceOf(hotWalletAddress);
      const usdtDecimals = await usdtContract.decimals();
      const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
      results.ethMainnet.usdt = usdtFormatted;
      results.ethMainnet.usdtOk = parseFloat(usdtFormatted) >= 10; // minimum 10 USDT
    } catch (e: any) {
      results.ethMainnet = { error: e.message };
    }

    // Base chain checks (for ETH withdrawal)
    try {
      const baseProvider = new ethers.JsonRpcProvider(BASE_RPC);
      const baseBalance = await baseProvider.getBalance(hotWalletAddress);
      results.baseChain = {
        ethBalance: ethers.formatEther(baseBalance),
        ethOk: baseBalance > ethers.parseEther("0.001"),
      };
    } catch (e: any) {
      results.baseChain = { error: e.message };
    }

    // Overall readiness
    results.ready = !!(
      hasPrivateKey &&
      results.ethMainnet?.ethForGasOk &&
      results.ethMainnet?.usdtOk
    );

    results.issues = [];
    if (!hasPrivateKey) results.issues.push("Private key not configured");
    if (!results.ethMainnet?.ethForGasOk) results.issues.push("Insufficient ETH for gas on mainnet");
    if (!results.ethMainnet?.usdtOk) results.issues.push("Insufficient USDT balance on mainnet");
    if (!results.baseChain?.ethOk) results.issues.push("Low ETH balance on Base chain");

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({
      ready: false,
      error: error.message,
    }, { status: 500 });
  }
}
