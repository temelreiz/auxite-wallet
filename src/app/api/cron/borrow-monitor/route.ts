// /api/cron/borrow-monitor — margin calls and liquidations for Auxite Borrow.
//
// Every open loan is checked against its collateral's current price:
//   • LTV ≥ liqLtv, or maturity passed  → margin call: the borrower and ops
//     get one email, and the loan is stamped marginCallAt.
//   • still in breach MARGIN_CALL_GRACE_MS (24 h) after the call → liquidate.
//   • back out of breach (repaid / price recovered) → the call is cleared.
// Emails go out on these transitions only, never on every run. A loan whose
// price is stale is skipped: nobody is liquidated on an old price.
//
// Before this, liquidateLoan existed but nothing called it — a loan past its
// liquidation LTV or its maturity simply stayed open.

import { NextRequest, NextResponse } from "next/server";
import { isCronRequest } from "@/lib/security/require-user";
import { getRedis } from "@/lib/redis";
import { sendEmail } from "@/lib/email";
import { getUserLanguage } from "@/lib/user-language";
import {
  BORROW_PARAMS, MARGIN_CALL_GRACE_MS, PRICE_MAX_AGE_MS,
  listActiveLoans, collateralPrice, currentLtv, amountOwed, liquidateLoan, unitOf,
  type Loan,
} from "@/lib/borrow-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OPS_EMAIL = process.env.BORROW_OPS_EMAIL || process.env.EOD_REPORT_TO || "bs@auxite.io";
const APP_URL = "https://vault.auxite.io/borrow";

async function userEmail(address: string): Promise<string | null> {
  const r = getRedis();
  const uid = await r.get(`user:address:${address.toLowerCase()}`);
  const u = (uid ? await r.hgetall(`user:${uid}`) : await r.hgetall(`user:${address.toLowerCase()}`)) as Record<string, unknown> | null;
  return (u?.email as string) || null;
}

function describe(loan: Loan, ltv: number, reason: "ltv" | "maturity"): string {
  const unit = unitOf(loan.metal);
  return reason === "maturity"
    ? `matured on ${loan.maturityDate.slice(0, 10)} and has not been repaid`
    : `is at ${(ltv * 100).toFixed(1)}% LTV, past the ${(BORROW_PARAMS[loan.metal].liqLtv * 100).toFixed(0)}% liquidation level (collateral ${loan.collateralGrams} ${unit === "g" ? "g " : ""}${loan.metal})`;
}

async function mail(to: string | null, subject: string, html: string) {
  if (!to) return;
  await sendEmail({ to, subject, html }).catch((e) => console.error(`[borrow-monitor] email to ${to} failed:`, e?.message));
}

export async function GET(request: NextRequest) {
  if (!isCronRequest(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const r = getRedis();
  const now = Date.now();
  const results = { checked: 0, marginCalls: 0, liquidated: 0, cleared: 0, skippedStale: 0, errors: [] as string[] };

  for (const loan of await listActiveLoans()) {
    results.checked++;
    try {
      const { price, timestamp } = await collateralPrice(loan.metal);
      if (!(timestamp > 0) || now - timestamp > PRICE_MAX_AGE_MS || !(price > 0)) {
        results.skippedStale++;
        continue;
      }
      const ltv = currentLtv(loan, price, now);
      const matured = now >= new Date(loan.maturityDate).getTime();
      const overLtv = ltv >= BORROW_PARAMS[loan.metal].liqLtv;
      const reason: "ltv" | "maturity" | null = overLtv ? "ltv" : matured ? "maturity" : null;
      const owed = amountOwed(loan, now);

      if (!reason) {
        if (loan.marginCallAt) {
          await r.hdel(`loan:${loan.id}`, "marginCallAt");
          results.cleared++;
          await mail(OPS_EMAIL, `[Borrow] Margin call cleared — ${loan.id}`, `<p>Loan ${loan.id} (${loan.address}) is back within limits: LTV ${(ltv * 100).toFixed(1)}%.</p>`);
        }
        continue;
      }

      if (!loan.marginCallAt) {
        await r.hset(`loan:${loan.id}`, { marginCallAt: new Date(now).toISOString(), marginCallReason: reason });
        results.marginCalls++;
        const deadline = new Date(now + MARGIN_CALL_GRACE_MS).toISOString().replace("T", " ").slice(0, 16) + " UTC";
        const tr = (await getUserLanguage(loan.address).catch(() => "en")) === "tr";
        await mail(
          await userEmail(loan.address),
          tr ? "Auxite: Krediniz için teminat uyarısı" : "Auxite: Margin call on your loan",
          tr
            ? `<p>Kredi ${loan.id}: ${reason === "maturity" ? "vadesi doldu ve geri ödenmedi" : `teminat oranı tasfiye seviyesine ulaştı (LTV %${(ltv * 100).toFixed(1)})`}.</p>
               <p>Güncel borç: <b>${owed.toFixed(2)} USDC</b>. Lütfen <b>${deadline}</b> tarihine kadar geri ödeme yapın; aksi halde borcu ve %2 tasfiye ücretini karşılayacak kadar teminat tasfiye edilir, kalanı hesabınıza iade edilir.</p>
               <p><a href="${APP_URL}">${APP_URL}</a></p>`
            : `<p>Your loan ${loan.id} ${describe(loan, ltv, reason)}.</p>
               <p>Amount owed: <b>${owed.toFixed(2)} USDC</b>. Please repay by <b>${deadline}</b>. Otherwise enough collateral to cover the debt plus a 2% liquidation fee will be liquidated, and the rest returned to your account.</p>
               <p><a href="${APP_URL}">${APP_URL}</a></p>`,
        );
        await mail(OPS_EMAIL, `[Borrow] Margin call — ${loan.id}`, `<p>Loan ${loan.id} (${loan.address}) ${describe(loan, ltv, reason)}. Owed ${owed.toFixed(2)} USDC. Liquidation after ${deadline} unless repaid.</p>`);
        continue;
      }

      if (now - new Date(loan.marginCallAt).getTime() < MARGIN_CALL_GRACE_MS) continue;

      const liq = await liquidateLoan(loan.id, reason);
      if (!liq.ok) {
        results.errors.push(`${loan.id}: ${liq.error}`);
        continue;
      }
      results.liquidated++;
      const unit = unitOf(loan.metal);
      const summary = `sold ${liq.soldGrams}${unit === "g" ? "g" : " AUXR"} ${loan.metal === "AUXR" ? "" : loan.metal} (≈${liq.coveredUSDC.toFixed(2)} USD), returned ${liq.returnedGrams}${unit === "g" ? "g" : " AUXR"}`;
      await mail(await userEmail(loan.address), "Auxite: Your loan was liquidated", `<p>Loan ${loan.id} was liquidated (${reason === "maturity" ? "unpaid at maturity" : "collateral below the liquidation level"}): ${summary}. The loan is closed.</p>`);
      await mail(OPS_EMAIL, `[Borrow] LIQUIDATED — ${loan.id}`, `<p>Loan ${loan.id} (${loan.address}) liquidated (${reason}): ${summary}. Owed was ${owed.toFixed(2)} USDC.</p>`);
    } catch (e: any) {
      results.errors.push(`${loan.id}: ${e?.message || e}`);
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
