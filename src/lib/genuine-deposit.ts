// Which "deposit" ledger rows are real money coming in.
//
// The ledger still holds deposit rows that were never real:
//   - source "debug_add_balance": fabricated through the unauthenticated
//     /api/debug/wallet endpoint (exploited 2026-10-19/20, closed in #99).
//     The balances were zeroed, but the rows are kept as evidence.
//   - admin_* sources: internal mints/transfers, not customer funding.
// Anything that counts deposits (conversion tracking, summaries, reports)
// must use this instead of `type === "deposit"`. Ledger views that show a
// user their own history should keep showing every row.

export const FABRICATED_DEPOSIT_SOURCES = ["debug_add_balance"] as const;

export function depositSource(tx: Record<string, any>): string {
  return String(tx?.source ?? tx?.metadata?.source ?? tx?.subType ?? "").toLowerCase();
}

export function isGenuineDeposit(tx: Record<string, any> | null | undefined): boolean {
  if (!tx || tx.type !== "deposit") return false;
  if ((tx.status ?? "completed") !== "completed") return false;
  const src = depositSource(tx);
  if ((FABRICATED_DEPOSIT_SOURCES as readonly string[]).includes(src)) return false;
  if (src.startsWith("admin")) return false;
  return true;
}
