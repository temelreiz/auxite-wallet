# Contract Hardening & Institutional-Readiness Go-Live

Companion to [institutional-readiness-spv-audit.md](./institutional-readiness-spv-audit.md).
Covers the **code-side** gaps from the 5-gate self-audit and the ops needed to take
the new on-chain PoR + NAV-redemption work live.

---

## 1. MINTER_ROLE revoke (Gate 5) — READY, runnable

**Risk:** `AuxiteMetal` grants `MINTER_ROLE` to the deploy admin at construction
("bootstrap; revoke after wiring the signer"). While that grant stands, a single
compromised key can mint unlimited supply — a classic DD red flag.

**Tooling:** [`scripts/harden-roles.js`](../scripts/harden-roles.js)
- Read-only role report across all 4 metal tokens + AUXR.
- With `DEPLOY_ADMIN` + `BACKEND_SIGNER` set, prints **Safe-ready calldata** for
  the grant/revoke transactions. It never signs or sends — the admin is the
  governance **Safe multisig**, so the irreversible op stays in the multisig.

```bash
# point BASE_RPC_URL at a premium endpoint (public mainnet.base.org drops calls)
BASE_RPC_URL=<alchemy/base rpc> \
DEPLOY_ADMIN=0x<address holding bootstrap MINTER_ROLE> \
BACKEND_SIGNER=0x<KMS reconciliation signer> \
  node scripts/harden-roles.js
```

**Procedure (per contract):**
1. Confirm the KMS backend signer holds `MINTER_ROLE` (grant via Safe if not).
2. Confirm the grant on-chain.
3. Revoke `MINTER_ROLE` from the deploy admin via Safe.
4. Re-run the script → expect "✅ Already hardened" for every contract.

> Order matters: never revoke before the signer's grant is confirmed, or a
> contract is left with no minter.

---

## 2. Pause + supply cap on metal tokens (Gate 5) — DECIDED: mitigate in place

**The constraint:** `AuxiteMetal` is **deployed and immutable** (no proxy). Unlike
`AUXR` (which has `ERC20Pausable` + `MAX_SUPPLY`), the metal tokens have **no pause
and no on-chain cap**, and you cannot retrofit either onto a live immutable
contract.

**Decision: do NOT deploy a replacement token contract.** The live metal tokens
(AUXG/AUXS/AUXPT/AUXPD) are the **canonical addresses registered on rwa.xyz,
rwa.io, and DefiLlama**. A `V9` migration would change those addresses and forfeit
the listings, the "On-chain Represented" status, holder continuity, and supply
history. That cost is not worth an on-chain pause/cap. The gap is closed
**operationally** instead:

- **MINTER_ROLE revoked** from the deploy admin (§1) — removes the single largest
  abuse vector with no contract change.
- **Admin = Safe multisig** (governance) for any remaining role action.
- **Supply-delta monitoring + alerting** on the daily reconciliation — the
  off-chain circuit-breaker that substitutes for an on-chain pause.
- **On-chain PoR feed** (§3a, `ReserveAttestation`) makes any divergence between
  attested reserves and supply publicly visible and timestamped.

> **Note — additive vs replacement contracts:** the *only* thing ruled out is a new
> **token** contract that replaces the listed metal tokens. `ReserveAttestation.sol`
> is an **additive auxiliary** contract at its own address; it does not touch the
> metal tokens or their listings and is safe to deploy. Net result: on-chain
> pause/cap is accepted as **operational, not contract-enforced** — a deliberate,
> defensible trade-off given the rwa.xyz / rwa.io / DefiLlama integrations.

---

## 3. Go-live ops for the new on-chain PoR + NAV-redemption work

The code is built and tested; these are the deployment/wiring steps to activate it.

### 3a. On-chain Proof-of-Reserve ([ReserveAttestation.sol](../contracts/ReserveAttestation.sol))
- [ ] Generate the **attestor signing key** held by The Network Firm (or a key
      they control). Set `RESERVE_ATTESTOR_KEY` (server) — never commit it.
- [ ] Deploy `ReserveAttestation(admin = Safe, attestor = attestor address)` to Base.
- [ ] Set `RESERVE_ATTESTATION_ADDRESS` env so
      `/api/proof-of-reserves/attestation` cross-checks the on-chain anchor.
- [ ] Add a **daily posting cron**: build the signed report
      (`generateAttestation()` → `toMetalInputs()`), call `postAttestation(...)`.
- [ ] Link the signed attestation from the `/proof-of-reserves` page (surface the
      signer + on-chain match), and formalize The Network Firm's recurring cadence
      (see SPV/audit roadmap Part 2b).
- Optional: set `RESERVE_ATTESTOR_LABEL` if the attestor name differs from default.

### 3b. NAV-redemption settlement ([/api/redeem/nav](../src/app/api/redeem/nav/route.ts))
The endpoint quotes and records orders (`redeem:nav:queue`); it deliberately does
**not** move funds. To complete the loop:
- [ ] Build a **treasury settlement worker** that drains `redeem:nav:queue`: for
      each `pending_settlement` order, burn the metal token and pay the stablecoin
      (USDC/USDT) to `payoutAddress`, then mark the order settled. This is the only
      step that moves money and must run under the authorized treasury signer.
- [ ] Decide the NAV-redemption fee schedule (defaults in `nav-redemption.ts`:
      AUXG 0.50%, AUXS 0.75%, PGM 1.00%) — these set the lower NAV band.
- [ ] Confirm `metal:prices:cache` freshness SLA matches `NAV_MAX_AGE_SECONDS`
      (300s) so the circuit-breaker behaves as intended.

### 3c. Contract roles (§1)
- [ ] Run `harden-roles.js`, submit the Safe txs, confirm "Already hardened".

### 3d. Security audit (Gate 5)
- [ ] Engage a security audit firm for `AuxiteMetal`, `AUXR`, `ReserveAttestation`
      (see SPV/audit roadmap Part 2a). Audit `ReserveAttestation` in the same pass.

---

## Status snapshot (2026-06-19)

| Item | State |
|---|---|
| On-chain PoR contract + tests | ✅ built, 14 tests pass |
| Signed attestation lib + API + tests | ✅ built, 7 tests pass |
| NAV-redemption quote engine + route + tests | ✅ built, 7 tests pass |
| MINTER_ROLE revoke tooling | ✅ built, Safe-calldata planner verified |
| Pause/cap on metal tokens | ✅ decided: mitigate in place (no V9 — preserves rwa.xyz/rwa.io/DefiLlama listings) |
| PoR deploy + attestor key + posting cron | ⬜ ops |
| NAV-redemption settlement worker | ⬜ ops (moves funds — authorized signer) |
| SPV / bankruptcy-remote + audits | ⬜ founder/legal track |

_Last updated: 2026-06-19_
