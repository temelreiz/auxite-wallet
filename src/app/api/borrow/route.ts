// src/app/api/borrow/route.ts
// AUXITE BORROW — list loans / quote (GET) and create a loan (POST).
import { NextRequest, NextResponse } from "next/server";
import { isKycVerified } from "@/lib/kyc-limits";
import { incrementBalance, addTransaction } from "@/lib/redis";
import { getMetalTotals } from "@/lib/allocation-service";
import { verifyTwoFactor, isUsPerson } from "@/lib/borrow-compliance";
import {
  BORROW_PARAMS, APR_BY_TERM, VALID_TERMS, POOL_CAP_USDC, MIN_LOAN_USDC,
  ORIGINATION_FEE, LIQUIDATION_FEE,
  quoteLoan, createLoan, getUserLoans, getPool,
} from "@/lib/borrow-service";

export const dynamic = "force-dynamic";

const BORROW_METALS = ["AUXG", "AUXS", "AUXPT", "AUXPD"];

// GET /api/borrow?address=0x..               → user's loans + pool + params
// GET /api/borrow?address=&metal=&grams=&term= → + a live quote
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const address = sp.get("address");
    if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });

    const [loans, pool, balArr] = await Promise.all([
      getUserLoans(address),
      getPool(),
      Promise.all(BORROW_METALS.map((m) => getMetalTotals(address, m))),
    ]);
    // Per-metal collateral available to pledge (total − already locked − yielding).
    const balances: Record<string, { total: number; locked: number; yielding: number; available: number }> =
      Object.fromEntries(BORROW_METALS.map((m, i) => [m, balArr[i]]));

    let quote = null;
    const metal = sp.get("metal");
    const grams = parseFloat(sp.get("grams") || sp.get("collateralGrams") || "0");
    const term = parseInt(sp.get("term") || sp.get("termMonths") || "0");
    if (metal && grams > 0 && VALID_TERMS.includes(term)) {
      quote = await quoteLoan(metal, grams, term);
    }

    return NextResponse.json({
      loans, pool, quote, balances,
      params: BORROW_PARAMS,
      aprByTerm: APR_BY_TERM,
      validTerms: VALID_TERMS,
      originationFee: ORIGINATION_FEE,
      liquidationFee: LIQUIDATION_FEE,
      minLoanUSDC: MIN_LOAN_USDC,
      poolCapUSDC: POOL_CAP_USDC,
    });
  } catch (e: any) {
    console.error("borrow GET error:", e);
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}

// POST /api/borrow  { address, metal, collateralGrams, principalUSDC, termMonths,
//                     termsAccepted, twoFactorCode }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, metal, collateralGrams, principalUSDC, termMonths, termsAccepted, twoFactorCode } = body;

    if (!address || !metal || !collateralGrams || !principalUSDC || !termMonths) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    // T&C — must accept the loan agreement (collateral locked for term + liquidation disclosure).
    if (termsAccepted !== true) {
      return NextResponse.json({ error: "You must accept the loan Terms & Conditions" }, { status: 400 });
    }
    // KYC gate.
    const kyc = await isKycVerified(address);
    if (!kyc) {
      return NextResponse.json({ error: "KYC verification required to borrow", needsKyc: true }, { status: 403 });
    }

    // Geofence — borrowing is not offered to US persons (regulatory).
    if (await isUsPerson(address)) {
      return NextResponse.json({ error: "Borrowing is not available in your region.", geoblocked: true }, { status: 403 });
    }

    // 2FA — borrowing moves money + locks collateral (same bar as withdrawals).
    const twoFa = await verifyTwoFactor(address, twoFactorCode || "");
    if (!twoFa.valid) {
      return NextResponse.json(
        { error: twoFa.error || "2FA verification failed", needs2FA: true, twoFaEnabled: twoFa.enabled },
        { status: 400 },
      );
    }
    // TODO(pilot): route through manual ops approval before disbursement.

    // Create the loan (LTV + pool + collateral-lock checks happen inside).
    const result = await createLoan({ address, metal, collateralGrams, principalUSDC, termMonths });
    if (!result.ok || !result.loan) {
      return NextResponse.json({ error: result.error || "Could not create loan" }, { status: 400 });
    }

    // Disburse net USDC (principal − origination fee) to the user's balance.
    const net = result.netDisbursedUSDC || 0;
    await incrementBalance(address, { usdc: net } as any);
    await addTransaction(address, {
      type: "borrow",
      token: "USDC",
      amount: net,
      status: "completed",
      metadata: {
        loanId: result.loan.id,
        metal: result.loan.metal,
        collateralGrams: result.loan.collateralGrams,
        principalUSDC: result.loan.principalUSDC,
        originationFeeUSDC: result.originationFeeUSDC,
        apr: result.loan.apr,
        termMonths: result.loan.termMonths,
        maturityDate: result.loan.maturityDate,
        liquidationPrice: result.loan.liquidationPrice,
      },
    } as any);

    return NextResponse.json({
      success: true,
      loan: result.loan,
      disbursedUSDC: net,
      originationFeeUSDC: result.originationFeeUSDC,
    });
  } catch (e: any) {
    console.error("borrow POST error:", e);
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}
