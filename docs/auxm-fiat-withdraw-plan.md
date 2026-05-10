# AUXM → Fiat (bank withdraw) — Planning Doc

**Status:** Not implemented. Compliance prerequisites must clear before any code work.
**Owner:** bs / Aurum Ledger Limited (Hong Kong)
**Last updated:** 2026-05-10

---

## Why this is hard (and why it's deferred)

Today, the inverse rail is one-directional:

```
fiat (USD/EUR/...)  ─[Wise wire]─►  Aurum Ledger Wise account  ─[webhook]─►  AUXM credit
                                                                              (1:1 USD or daily FX)
```

We auto-credit the user's AUXM balance the moment a wire matches a reference.
We never hold fiat for the user — the conversion happens at receive time, so
we have no fiat custody position to defend.

The reverse direction (`AUXM ─► fiat ─► user's bank`) is fundamentally
different: it requires the operator (Aurum Ledger) to *pay out* fiat to a
third-party bank account that the user controls. That's a regulated activity
in every jurisdiction we touch.

The withdraw modal already supports `AUXM ─► USDC/USDT/ETH/BTC` via crypto
payouts (NowPayments). That covers user liquidity needs without taking on
fiat-payout obligations.

## Compliance prerequisites

Before any backend work, these must be in place:

1. **HK Money Service Operator (MSO) license** — issued by HK Customs &
   Excise. Required to operate as a remittance/money-changer in Hong Kong.
   Six-figure capital + AML compliance officer + annual audit.
   - Application timeline: 3-6 months typical.
   - Status: Not initiated.

2. **AML / KYC uplift** — Sumsub already covers identity verification.
   Need to add:
   - Source-of-funds questionnaire on first withdraw above a threshold
     (proposed: USD 5,000 lifetime).
   - Sanctions screening on payout beneficiary bank (OFAC, UN, EU, HKMA).
   - Travel-rule data (originator + beneficiary) for cross-border wires
     above USD 1,000.
   - Status: Sumsub identity layer live; SoF + sanctions + travel-rule
     not implemented.

3. **Wise Business outbound payments** — current Wise account is set up
   for receiving only. To send via Wise we need:
   - Verified business profile (already done for receiving).
   - Outgoing transfer permissions (separate Wise compliance review).
   - Funded Wise balance in the source currency (today our account auto-
     converts on receive; we'd need to keep fiat float for outbound).
   - Note: keeping a fiat float reintroduces the custody question we
     deliberately avoid today.

4. **Ledger reconciliation** — current `user:{addr}:balance` AUXM is a
   single-currency Redis hash. For payout we need:
   - Reserved/locked AUXM during a pending payout (so the same balance
     can't be double-spent on metal allocation).
   - Atomic debit-on-success / refund-on-failure semantics.
   - Audit trail tying every AUXM debit to a payout instruction id.

## Suggested architecture (when prerequisites clear)

```
┌──────────────┐      ┌─────────────────┐     ┌──────────────┐
│  User: web   │─────►│  /api/withdraw/ │────►│  Sumsub SoF  │
│   /mobile    │      │  fiat (init)    │     │   gate       │
└──────────────┘      └────────┬────────┘     └──────────────┘
                               │ atomic AUXM lock
                               ▼
                      ┌─────────────────┐
                      │  payout queue   │  (Redis stream)
                      │  status: PENDING│
                      └────────┬────────┘
                               │ admin approval (manual stage 1)
                               ▼              ┌──────────────┐
                      ┌─────────────────┐────►│  Wise create │
                      │  payout worker  │     │  transfer    │
                      │  (cron / job)   │◄────│  + fund      │
                      └────────┬────────┘     └──────────────┘
                               │ webhook: SUCCESS or FAILED
                               ▼
                      AUXM debit committed (or refunded)
                      Push + email + Telegram + tx record
```

### Key design decisions to nail down

| Decision | Options | Notes |
|---|---|---|
| Manual vs auto approval | (a) all payouts manual stage 1, (b) auto under threshold | Start (a). Move to (b) only after volume + audit history. |
| Sanctions screening provider | Chainalysis, Refinitiv, ComplyAdvantage | Refinitiv WC-1 most common for HK. |
| FX rate at payout | (a) lock at request time, (b) lock at execution | (a) gives user certainty but exposes us to slippage. Pick (a) with a 5-min quote validity. |
| Failure handling | (a) refund AUXM 1:1, (b) refund original USD value | (a) — user shouldn't bear FX loss on our failure. |
| Min/max per payout | TBD | Suggest min USD 100, max USD 50,000 per single payout (above → manual). |

## Implementation scope (rough)

When all prerequisites clear, expect:

- **Backend** (~2-3 weeks): payout init endpoint, locking semantics,
  Wise outbound integration, worker, status webhook, refund path.
- **Frontend** (~1 week): withdraw modal extension (add "Bank Wire" tab
  alongside crypto payouts), beneficiary bank form, SoF questionnaire,
  status tracking page.
- **Admin** (~1 week): payout review queue, approve/reject, manual
  reconcile for stuck payouts.
- **Compliance dry-run** (~1 week): SoF triggers, sanctions screening,
  travel-rule data capture, audit log review.

Total: **~5-6 weeks engineering** *after* HK MSO license issued.

## What we can do *now* without licensing

Three things that meaningfully help users without taking on payout risk:

1. **AUXM → crypto withdraw** — already shipped (USDC/USDT/ETH/BTC).
   Users wanting cash route via centralized exchange off-ramp themselves.
   This is the de-facto cash-out today and works in every jurisdiction.

2. **AUXG/AUXS physical delivery** — already shipped (vault → courier).
   Users who want to "exit" can convert AUXM → metal → physical pickup,
   which is a non-financial-services transaction (it's commodity sale).

3. **Documentation polish** — make it clear in the help center that
   AUXM is convertible to crypto rails today, and that a fiat off-ramp
   is on the roadmap pending licensing.

## Open questions for next planning session

- Do we want HK MSO, or pursue Singapore PSA license instead (faster,
  but adds new entity + tax complexity)?
- Should the first version of fiat off-ramp be USD-only (single currency)
  to keep compliance scope tight?
- Who is the AML compliance officer? External advisor for now or a
  full-time hire?
- Do we offer beneficiary saving (user can re-use bank details), or
  re-enter every time? (Saving is more PII to protect.)
