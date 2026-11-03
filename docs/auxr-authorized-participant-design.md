# AUXR Authorized Participants — Gaps in the Live Gateway

**Status:** Gap analysis. The AP gateway itself is live (#153, #154).
**Owner:** bs / Aurum Ledger Limited (Hong Kong)
**Last updated:** 2026-11-03

This replaces an earlier draft that designed an AP tier from scratch without
the gateway in `src/lib/auxr-ap.ts`. Only what the gateway does not cover is
left here.

---

## What the gateway already does

| Area | Implementation |
|---|---|
| Registry | `auxr:ap:accounts`, admin `/api/admin/auxr/ap` (add / remove) |
| Spread | `AUXR_AP_SPREAD` 25 bps each side via `quoteBuy` / `quoteSell` overrides |
| Create | `/api/auxr/buy` at NAV + 25 bps (AUXM / USDT / USDC rails), then `/api/auxr/withdraw-onchain` transfers from the pre-minted inventory wallet, no Safe wait |
| Create controls | one registered destination per AP (`ap_destination_mismatch`), `AUXR_AP_DAILY_CAP` 300/day, inventory target 600 / low 150 |
| Redeem | AP sends AUXR back, scanner credits and burns, `/api/auxr/sell` at NAV − 25 bps paid in withdrawable USDT |
| Hedge | every AP buy/sell emails the hedge desk the basket grams; net position `auxr:ap:net-units` |
| Supply | inventory excluded from liability and `/api/supply` circulating supply |

## Gaps

### 1. Redeem attribution from exchange wallets

`acknowledgeDepositFromChain` credits a deposit only when `fromAddress` is a
known Auxite user wallet (`findUserByWallet`). An AP's AUXR sits on the
exchange; a withdrawal from there comes from the exchange's hot wallet, which
is not the AP's account, so the deposit is `skipped_unattributed` and waits for
manual review. Creating is instant; redeeming is not, so the AP can only push
the price **down** to NAV quickly, not up.

**Fix:** let each AP register one or more *source* addresses (its own EOA the
exchange withdraws to). The scanner attributes transfers or burns from a
registered source to that AP. The AP flow becomes: exchange → own EOA →
deposit/burn → credited automatically. Same cooldown and alerting as the
destination address when a source is added.

### 2. No NAV staleness guard on AP pricing

`getAuxrPricing()` uses whatever the metal price cache returns, including the
stale fallback. Retail has 125 bps of spread to absorb a stale NAV; an AP has
25 bps. A stale NAV during a fast metals move is a free option against the
treasury.

**Fix:** for AP quotes, refuse when the price timestamp is older than
`NAV_MAX_AGE_SECONDS` (300s, `src/lib/nav-redemption.ts`), the same breaker
NAV redemption and cash settlement already use.

### 3. Capacity

300 AUXR/day per AP and a 600 AUXR inventory (~$30k / ~$60k at NAV ~$100) are
enough for today's books ($400–750 within 2% of NAV per venue) but cap how far
an AP can arbitrage a DEX pool or a larger CEX move. Raise per AP through the
registry rather than the global env, once hedging is automated
(see the hedge gap below).

### 4. Hedge is manual

Every AP flow emails grams to hedge by hand. At 25 bps the treasury carries
metal price risk from the AP trade until the hedge is placed. This is the
existing hedge gap, not AP-specific, but tighter AP spreads make it bite
sooner.

### 5. AP agreement (legal, not code)

- KYB of the entity, beneficial owners, sanctions screening.
- Quoting obligation (band and minimum depth per venue, including the Aerodrome
  pool once it exists).
- **Prohibition on wash trading, self-matching and volume inflation**, with
  audit rights and termination. Market-abuse rules and exchange listing
  reviews (Binance Alpha) both look for this.

## Proposed order

1. NAV staleness guard on AP quotes (small change in `auxr-pricing` callers).
2. Source-address registry and scanner attribution.
3. AP agreement template.
4. Per-AP caps in the registry; raise once hedging is automated.
