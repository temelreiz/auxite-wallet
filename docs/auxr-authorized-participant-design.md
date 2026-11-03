# AUXR Authorized Participant (AP) Tier — Design

**Status:** Design, not implemented.
**Owner:** bs / Aurum Ledger Limited (Hong Kong)
**Last updated:** 2026-11-03

---

## Problem

AUXR's secondary price on Base should stay within a narrow band around NAV.
That only happens if someone can profitably arbitrage the gap, at size, fast.
Today the loop exists but is built for retail:

| Leg | Today | Why it fails as a peg |
|---|---|---|
| DEX > NAV (create) | AUXM → `/api/auxr/buy` (+125 bps) → `/api/auxr/withdraw-onchain` | 250 AUXR/day per account, 1,000 AUXR/day global (`auxr-mint-limits.ts`), manual review above 100, cosign, hard ceiling 500 |
| DEX < NAV (redeem) | send AUXR to deposit address → scanner credits → `/api/auxr/sell` (−125 bps) → AUXM → `/api/withdraw` to USDC | 4 hops, deposit only attributed from the user's primary wallet, AUXM intermediate, extra withdraw fee and delay |
| NAV redemption engine | `/api/redeem/nav` + `cron/nav-redemption-settle` | covers AUXG/AUXS/AUXPT/AUXPD only — **not AUXR** |

Round-trip cost is ~250 bps plus fees and settlement risk, so the peg band is
roughly ±2–3% at best and collapses entirely once the 1,000 AUXR/day global cap
is hit (~$100k).

## Goal

- A small set of contracted, KYB'd market makers ("APs") can **create** and
  **redeem** AUXR directly against USDC at NAV ± a tight AP spread.
- Settlement in minutes, on-chain, to and from whitelisted addresses only.
- Capacity sized to the reserve, not to retail anti-fraud caps.
- Retail limits and flows are unchanged.

Target band: **±25–50 bps** around NAV.

## Non-goals

- No change to `AUXR.sol`. Existing `MINTER_ROLE` mint and `burnWithRef` are enough.
- No AP access to fiat rails.
- No AP-funded volume programmes. APs quote and arbitrage; they do not trade with
  themselves (see Agreement terms).

---

## AP registry

Redis hash `auxr:ap:{apId}` (managed via a new admin route, audit-logged):

```ts
interface AuthorizedParticipant {
  apId: string;                 // slug, e.g. "mm-acme"
  entity: string;               // legal name
  agreementRef: string;         // signed AP agreement id
  kybStatus: "approved";        // KYB of the entity; KYC "enhanced" on signers
  status: "active" | "suspended";
  primaryAddress: string;       // Auxite account used for auth
  depositAddresses: string[];   // on-chain addresses allowed to burn/deposit
  payoutAddresses: string[];    // on-chain addresses allowed to receive USDC/AUXR
  spreadBps: { create: number; redeem: number };   // e.g. 35 / 35
  limits: {
    perOrderAuxr: number;       // e.g. 2,500
    dailyCreateAuxr: number;    // e.g. 10,000
    dailyRedeemAuxr: number;    // e.g. 10,000
  };
  createdAt: number;
  updatedAt: number;
}
```

- Address lists change only via admin route + Telegram alert + 24h cooldown
  before a new payout address is usable.
- `auxr:ap:by-address:{address}` → `apId` index for scanner attribution.
- A suspended AP is rejected at every entry point (same pattern as
  `assertAccountActive`).

## Flow 1 — Create (DEX price > NAV)

1. `POST /api/auxr/ap/create/quote { units }` → quote at `NAV × (1 + create bps)`,
   locked for 60s. Uses `getAuxrPricing()`; refuses if NAV is older than
   `NAV_MAX_AGE_SECONDS` (300s) — same circuit breaker as `nav-redemption.ts`.
2. AP sends USDC on Base to the treasury address with the quote id in a
   companion `POST /api/auxr/ap/create/confirm { quoteId, txHash }`.
3. Worker verifies the USDC transfer (amount, sender ∈ `depositAddresses`,
   confirmations), then checks:
   - AP daily/per-order limits
   - AP global cap (separate pool from retail `DAILY_CAP_GLOBAL`)
   - **reserve headroom**: post-mint liability must stay covered by the latest
     backing statement (`getBackingReport()`). No headroom → order waits for the
     treasury metal purchase and is filled after it lands.
4. Mint `units` to the AP's payout address via the existing `MINTER_ROLE` path
   (`auxr-mint-requests` / MintGuard), `refId = orderId`.
   AP orders within the AP's pre-approved limits skip per-order manual review;
   orders above `perOrderAuxr` still go to cosign.
5. `recordMint` updates the reserve ledger; treasury buys the basket metals.

If the quote expires before USDC arrives, the order is re-priced at fill time
and the AP may cancel for a refund to the sending address.

## Flow 2 — Redeem (DEX price < NAV)

1. `POST /api/auxr/ap/redeem/quote { units }` → quote at `NAV × (1 − redeem bps)`,
   locked 60s, returns `orderId` (bytes32).
2. AP calls `AUXR.burnWithRef(amount, orderId)` from an address in
   `depositAddresses`. No custodial deposit, no AUXM.
3. Scanner (extend `cron/scan-auxr-deposits` to also read `AuxrBurned` events)
   matches `refId → orderId`, checks sender and amount.
4. Order goes to the existing settlement queue; extend
   `cron/nav-redemption-settle` with an `auxr_ap` order type that pays USDC via
   `processWithdraw(..., "base")` to a whitelisted payout address. The metal debit
   step becomes a reserve `recordBurn` instead.
5. Burns that don't match an open order (wrong sender, expired, unknown refId)
   are held for manual review — tokens are already destroyed, so the AP is paid
   at the order's quote after review, or at the lower of quote and NAV at review
   time if the quote had expired.

## Pricing and limits

| Parameter | Proposed start | Notes |
|---|---|---|
| AP create / redeem spread | 35 / 35 bps | vs 125 bps retail |
| Quote TTL | 60s | |
| NAV max age | 300s | shared constant |
| Per-order cap | 2,500 AUXR | above → cosign |
| Per-AP daily | 10,000 AUXR each side | |
| AP global daily | 25,000 AUXR each side | separate from retail cap |
| USDC float for redemptions | ≥ 1 day of AP redeem cap | treasury ops |

All values in env / registry, not code.

## Risk controls

- Whitelisted addresses only, both directions; payout address change cooldown.
- Kill switch: `checkTradingAllowed("metalTrading")` plus a dedicated
  `config:auxr:ap:enabled`.
- Reserve headroom check on every create; backing alert state
  (`backingAlertState`) at `critical` halts creates.
- Taint check (`auxr-taint.ts`) on every redeem sender.
- Telegram + email on each AP order; daily AP reconciliation (orders ↔ mints/burns
  ↔ USDC transfers) attached to the monthly backing statement.
- MINTER_ROLE remains behind MintGuard / Safe; AP flow never holds a key itself.

## AP agreement terms (legal)

- KYB, beneficial owners, sanctions screening; signers at KYC `enhanced`.
- Obligation to quote two-sided on the Aerodrome AUXR/USDC pool within an agreed
  band and minimum depth.
- **Prohibition on wash trading, self-matching and volume inflation**, with audit
  rights and termination. Required both for market-abuse rules and for exchange
  listing reviews (Binance flags this on-chain).
- Fees, settlement SLA, error/refund handling for mismatched burns.

## Implementation plan

1. `src/lib/auxr-ap.ts` — registry types, getters, limit accounting (pattern of
   `auxr-mint-limits.ts`), unit tests.
2. `src/app/api/admin/auxr/ap/route.ts` — CRUD + audit log.
3. `src/app/api/auxr/ap/{create,redeem}/{quote,confirm}` routes.
4. Scanner: `AuxrBurned` event support + AP attribution.
5. Settlement: `auxr_ap` order type in `nav-redemption-settle` (dry-run default
   stays).
6. Admin panel tab under `admin/auxr`.
7. Staging run with one AP at low limits, then raise.

## Open decisions

- Spread and cap starting values.
- USDT in addition to USDC?
- Who funds the USDC redemption float and how large.
- Whether the AP agreement is signed by Aurum Ledger Limited directly or an SPV
  (see `institutional-readiness-spv-audit.md`).
