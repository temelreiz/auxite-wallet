# AUXPAY — settlement layer (Phase 0 skeleton)

AUXPAY is the consolidation of Auxite's scattered money-movement code into one
crypto-first settlement rail. This directory is the **Phase 0 skeleton**:
interfaces and types only. **Nothing here is wired into live money paths yet.**

## The core decision: AUXP

`AUXP` is AUXPAY's single internal unit of account: **1 AUXP = 1 USD**, off-chain,
a platform liability to the user.

It is **not a new concept** — it is the AUXPAY name for the balance that today
lives in the `auxm` field of `user:{addr}:balance` (`src/lib/redis.ts`,
`src/lib/auxm-ledger.ts`). Every fiat rail already credits into that field; every
withdrawal / AUXR buy debits it. AUXP renames that role, 1:1, no value change.

We do **not** rename the storage field in Phase 0 (too invasive). AUXP maps onto
the existing `auxm` field via `UNIT_TO_LEGACY_FIELD` during the coexistence
window; a field rename is a later, isolated migration.

## Why this layer exists

The current state (mapped from the codebase):

- User balances = one Redis hash per user (`user:{addr}:balance`), mutated with
  single-sided `hincrbyfloat`.
- Many money routes call `redis.hincrbyfloat(balanceKey, ...)` **directly**
  (withdraw, settlement-service, auxr/buy, wise/stripe/coinbase/transak
  webhooks), bypassing the `redis.ts` helpers — so the AUXM journal only catches
  a subset.
- There is **no double-entry**: value is created/destroyed by a single write,
  reconciled after the fact (`reconcileAuxm`) rather than structurally.

AUXPAY fixes this with one chokepoint.

## Components

| File | Role |
|------|------|
| `units.ts` | `Unit` type (AUXP, USD, USDC/USDT, ETH/BTC, metal grams, AUXR) + legacy-field map |
| `ledger.ts` | `SettlementLedger.post()` — balanced, idempotent, append-only double-entry |
| `rails.ts` | `PaymentRail` adapter interface + registry + map of already-wired rails |

### Double-entry model

A `Posting` is a set of signed `Entry` legs. It is valid iff, **for every unit,
the deltas net to zero** (`assertBalanced`). Value only moves between accounts;
cross-unit conversions (USD→USDC) balance each unit independently.

Accounts are namespaced ids: `user:{addr}:{unit}`, `treasury:{venue}:{unit}`,
`rail:{name}:inflight:{unit}`, `fee:income:{unit}`, `reserve:{unit}`,
`equity:genesis:{unit}`.

Example — a Wise wire of $100 in becomes one posting instead of a bare
`hincrbyfloat(userKey, 'auxm', +100)`:

```
reason: wise_wire   idempotencyKey: <wise event id>
  treasury:bank-usd:USD   +100   (asset received)
  equity:genesis:USD      -100   (contra: fiat entered the system)
  user:0xabc:AUXP         +100   (liability to user)
  equity:genesis:AUXP     +100   (contra of the AUXP liability)
```

(Exact contra-account convention is finalized with the Redis impl; the invariant
is per-unit zero-sum.)

### Rails

`PaymentRail` normalizes every edge behind `quote / payIn / payOut / status /
handleWebhook`. A rail **emits postings, never mutates balances**. `RailRegistry`
resolves rails and orders failover candidates so no single provider is a SPOF.
`EXISTING_RAIL_MAP` is the adapter checklist for migrating current code.

## Roadmap within Phase 0

1. ✅ Units + ledger interface + rail interface (this skeleton).
2. ☐ Redis-backed `SettlementLedger` impl (`createSettlementLedger`), mirroring
   writes to the legacy `user:{addr}:balance` fields during coexistence.
3. ☐ Adapters for the wired rails (wise, bridge, deposit-credit, withdraw) that
   call `post()` — behind a flag, shadow-writing first to validate balancing.
4. ☐ Flip reads (`GET /balance`) to `userBalances()`; retire direct
   `hincrbyfloat` money mutations.

New rails (Reap, Rain) implement `PaymentRail` from the start.
