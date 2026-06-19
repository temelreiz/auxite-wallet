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

## 2. Pause + supply cap on metal tokens (Gate 5) — DECISION REQUIRED

**The constraint:** `AuxiteMetal` is **deployed and immutable** (no proxy). Unlike
`AUXR` (which has `ERC20Pausable` + `MAX_SUPPLY`), the metal tokens have **no pause
and no on-chain cap**, and you cannot retrofit either onto a live immutable
contract. There are only two honest paths:

| Path | What it means | Trade-off |
|---|---|---|
| **A. Mitigate in place** (recommended now) | Keep the immutable tokens; reduce risk operationally: admin = Safe multisig, MINTER_ROLE revoked (§1), supply-delta monitoring + alerting on the daily reconciliation, off-chain circuit-breaker | Zero migration; no on-chain pause/cap, so emergency response is operational not contract-enforced |
| **B. Migrate to a hardened V9** | Deploy `AuxiteMetalV9` with `ERC20Pausable` + supply cap + same mint/burn API, migrate holder balances | True on-chain pause/cap; but a **token migration touches every holder** — real cost, comms, and risk |

**Recommendation:** do **A now** (it's free and closes most of the risk via §1 +
monitoring), and treat **B** as a separate, planned decision — ideally folded into
the same redeploy that adds any other contract changes, so holders migrate once.

> A ready `AuxiteMetalV9` (ERC20Pausable + cap, mint/burn parity, full test suite)
> can be authored on green-light. It is intentionally **not** built yet because the
> migration is a holder-impacting product decision, not a mechanical fix.

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
| Pause/cap on metal tokens | ⚠️ decision: mitigate-in-place vs V9 migration |
| PoR deploy + attestor key + posting cron | ⬜ ops |
| NAV-redemption settlement worker | ⬜ ops (moves funds — authorized signer) |
| SPV / bankruptcy-remote + audits | ⬜ founder/legal track |

_Last updated: 2026-06-19_
