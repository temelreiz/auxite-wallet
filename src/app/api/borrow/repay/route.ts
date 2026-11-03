// src/app/api/borrow/repay/route.ts
// AUXITE BORROW — repay a loan in USDC (full or partial). Cash-first; on full
// repayment the collateral is released. Debits the user's USDC balance.
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/security/require-user";
import { assertAccountActive } from "@/lib/security/account-guard";
import { addTransaction } from "@/lib/redis";
import { repayLoan } from "@/lib/borrow-service";

export const dynamic = "force-dynamic";

// POST /api/borrow/repay  { address, loanId, amountUSDC, twoFactorCode? }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loanId, amountUSDC } = body;
    // Whose collateral and loan this is comes from the login token, not the
    // body — assertAccountActive below stops a suspended caller, not an
    // impersonating one.
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;
    const address = auth.user.address;

    if (body.address && String(body.address).toLowerCase() !== address) {
      return NextResponse.json(
        { success: false, error: "address does not match the authenticated account" },
        { status: 403 },
      );
    }
    if (!address || !loanId || !amountUSDC) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Suspended accounts must not move value through this path either.
    const gate = await assertAccountActive(address);
    if (!gate.ok) {
      return NextResponse.json({ success: false, error: gate.error, code: gate.code }, { status: 403 });
    }
    const amount = parseFloat(amountUSDC);
    if (!(amount > 0)) return NextResponse.json({ error: "amountUSDC must be > 0" }, { status: 400 });

    // Owner check, USDC check-and-debit and the loan update all happen in
    // repayLoan under the user's balance lock — the old read-then-debit here
    // let two concurrent repayments both pass the balance check.
    const res = await repayLoan(address, loanId, amount);
    if (!res.ok) {
      return NextResponse.json({ error: res.error || "Repayment failed" }, { status: res.status || 400 });
    }
    const pay = res.paid!;
    const loan = { metal: res.metal };

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
