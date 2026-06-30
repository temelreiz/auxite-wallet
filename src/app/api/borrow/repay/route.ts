// src/app/api/borrow/repay/route.ts
// AUXITE BORROW — repay a loan in USDC (full or partial). Cash-first; on full
// repayment the collateral is released. Debits the user's USDC balance.
import { NextRequest, NextResponse } from "next/server";
import { incrementBalance, addTransaction, getUserBalance } from "@/lib/redis";
import { getUserLoans, repayLoan } from "@/lib/borrow-service";

export const dynamic = "force-dynamic";

// POST /api/borrow/repay  { address, loanId, amountUSDC, twoFactorCode? }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, loanId, amountUSDC } = body;
    if (!address || !loanId || !amountUSDC) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const amount = parseFloat(amountUSDC);
    if (!(amount > 0)) return NextResponse.json({ error: "amountUSDC must be > 0" }, { status: 400 });

    // Find the loan + how much is owed (cap the payment so we never over-debit).
    const loans = await getUserLoans(address);
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) return NextResponse.json({ error: "Loan not found for this user" }, { status: 404 });
    if (loan.status !== "active") return NextResponse.json({ error: `Loan already ${loan.status}` }, { status: 400 });

    const pay = Math.min(amount, loan.owed);

    // Repayment is in CASH (USDC) — check the user has it.
    const bal = await getUserBalance(address);
    const usdc = Number((bal as any)?.usdc || 0);
    if (usdc + 1e-6 < pay) {
      return NextResponse.json({ error: `Insufficient USDC: need ${pay}, have ${usdc}. Top up to repay.`, needUSDC: pay, haveUSDC: usdc }, { status: 400 });
    }

    // Debit the user's USDC, then apply the repayment (releases collateral if closed).
    await incrementBalance(address, { usdc: -pay } as any);
    const res = await repayLoan(loanId, pay);
    if (!res.ok) {
      // refund on failure
      await incrementBalance(address, { usdc: pay } as any);
      return NextResponse.json({ error: res.error || "Repayment failed" }, { status: 400 });
    }

    await addTransaction(address, {
      type: "borrow_repay",
      token: "USDC",
      amount: pay,
      status: "completed",
      metadata: { loanId, closed: res.closed, releasedGrams: res.releasedGrams, remainingOwed: res.remainingOwed, metal: loan.metal },
    } as any);

    return NextResponse.json({
      success: true,
      paidUSDC: pay,
      closed: res.closed,
      remainingOwed: res.remainingOwed,
      releasedGrams: res.releasedGrams,
    });
  } catch (e: any) {
    console.error("borrow/repay POST error:", e);
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}
