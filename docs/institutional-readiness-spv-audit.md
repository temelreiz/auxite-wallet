# Auxite Institutional Readiness — SPV / Bankruptcy-Remote Structure & Audit Roadmap

> **Why this exists:** Institutional RWA buyers run due diligence before allocating. Our 5-gate
> self-audit (2026-06-19) found the operational/redemption side is mature, but the two items
> institutions check *first* are missing: **(1) bankruptcy-remote asset isolation** and
> **(2) independent smart-contract + reserve audit**. Token authenticity is necessary but not
> sufficient — without these, institutions bounce regardless of how real the metal is. This is
> the likely root cause of "lots of installs, zero institutional flow."
>
> This is the **founder/legal track** (not code). The code-side gaps (on-chain PoR feed,
> NAV-redemption endpoint, contract hardening) are tracked separately and run in parallel.
> **Not legal advice — scoping for counsel.**

---

## Part 1 — Bankruptcy-Remote / SPV Structure (Gate 4)

### The goal in one sentence
If Aurum Ledger / Auxite (the operator) goes bankrupt, the physical metal backing the tokens
must **not** fall into the operator's bankruptcy estate. Token holders must keep a direct,
enforceable claim on the metal. Today the operator (Aurum Ledger Ltd, HK) appears to hold the
custody relationship directly — no isolation described in code or docs.

### What "good" looks like (the PAXG benchmark)
PAX Gold is held by **Paxos Trust Company** (a NYDFS-chartered trust): the gold is customer
property held in trust, segregated, off Paxos's balance sheet, not reachable by Paxos's
creditors. Physical gold ETFs use the same pattern — an independent **trustee** holds bullion
for the benefit of holders. That trust wrapper is exactly what we lack.

### Three viable structures (pick one with counsel)

| Structure | How it works | Pros | Cons |
|---|---|---|---|
| **A. Declaration of Trust** (recommended start) | Independent trustee holds the metal (in segregated allocated accounts at Silver Bullion SG) **on trust** for token holders. Token = beneficial interest. | Closest to PAXG/ETF model; cleanest holder claim; widely understood by institutions | Needs a licensed/professional trustee; ongoing trustee fees |
| **B. Orphan SPV** | A special-purpose company (independent directors, no other business, non-petition + separateness covenants) owns the custody relationship; metal pledged/declared for holders | Classic securitization isolation; non-consolidation opinion available | More moving parts; needs independent directors; heavier |
| **C. Custodian segregation + tri-party agreement** | Silver Bullion SG holds **allocated, segregated, non-rehypothecatable** metal titled to a trustee/SPV, governed by a tri-party agreement naming holders as beneficiaries | Leverages existing custodian; lighter | Depends on custodian's willingness/legal capacity; weaker without a trust/SPV layer on top |

> **Recommendation:** **A (Declaration of Trust)** as the spine, **C** as the operational
> mechanics underneath it (segregated allocated accounts + no rehypothecation), with the option
> to graduate to **B** if a future regulated venue requires it.

### Non-negotiable legal features (the DD checklist institutions apply)
- [ ] **Segregated, allocated** metal (specific bars/serial numbers, not a pooled unallocated claim)
- [ ] **No rehypothecation / no lending** of backing metal without explicit holder-protective terms
      *(note: this interacts with the leasing/encumbrance ledger — leased metal cannot also be
      counted as redemption backing; reconcile the two)*
- [ ] **Redemption right runs to the holder** (enforceable even if operator fails)
- [ ] **Independent trustee or independent directors** (not operator-controlled)
- [ ] **Non-consolidation / true-sale legal opinion** (the document institutions ask for by name)
- [ ] **Asset isolation survives operator insolvency** (the whole point)

### Jurisdiction (aligns with the Pretex Phase-1 = ADGM plan)
- **ADGM (Abu Dhabi)** — strong common-law trust + Foundation regime, RWA-friendly regulator,
  matches the metals-first jurisdiction plan and Gulf gold market. **Lead candidate.**
- **Switzerland / Liechtenstein** — banking-grade credibility; fits the Phase-2 securities venue.
- **Jersey / Guernsey** — classic SPV/trust jurisdictions for funds; institutionally familiar.
- Avoid pure offshore (BVI/Cayman *alone*) for the trustee layer — credibility discount with
  institutions unless paired with a recognized trustee.

### Owners & rough effort
- **Who:** offshore/trust counsel (ADGM-qualified) + a licensed professional trustee + the
  custodian (Silver Bullion SG) legal team. Overlaps directly with **Trutina's legal trio**
  (SPV / perfection / custody counsel) — reuse that workstream.
- **Cost (rough):** trust/SPV setup + legal opinion typically **$30k–$120k** one-off depending on
  jurisdiction and opinion scope; trustee **ongoing annual fee**.
- **Timeline:** **6–12 weeks** for structure + opinion (faster if reusing Trutina counsel).

---

## Part 2 — Independent Audits (Gate 5 + Gate 2 support)

Two *different* audits — institutions expect both, and people conflate them:

### 2a. Smart-contract security audit (Gate 5)
Scope is small and in our favor: two ERC-20 contracts (`AuxiteMetal.sol`, `AUXR.sol`) +
oracle + mirror. No proxy/upgradeability. Battle-tested OZ base. → low-end scope.

| Firm tier | Examples | Rough cost | Timeline |
|---|---|---|---|
| Top-tier | Trail of Bits, OpenZeppelin, Spearbit/Cantina, Zellic | $40k–$80k+ | 2–4 wks |
| Strong mid | Halborn, Quantstamp, Hacken | $15k–$40k | 1–3 wks |
| Competitive/contest | Cantina/Code4rena contest | variable | 1–2 wks |

- **Recommendation:** one strong mid-tier audit now (cost-effective for 2 small contracts),
  publish the report; upgrade to a top-tier name before the Pretex third-party venue phase.
- **Pre-audit hygiene (do first, tracked in the contract-hardening task):** revoke `MINTER_ROLE`
  from the deploy admin after wiring the backend signer; decide pause coverage for metal tokens;
  on-chain supply-cap backstop. A clean pre-audit state lowers cost and findings.

### 2b. Reserve attestation (Gate 2)
This proves the metal actually exists 1:1 — separate from code security.
- **The Network Firm** is already named as attestor in the contracts. **Action: formalize the
  engagement** — signed attestation reports on a fixed cadence (monthly recommended; real-time
  on-chain PoR feed as the stretch goal, tracked in the on-chain-PoR code task).
- Alternative/complement: Big-4 (Deloitte already referenced internally) for a name institutions
  recognize instantly — higher cost.
- **Deliverable institutions want:** a **published, signed, recurring** attestation tied to the
  on-chain supply, reachable from `/proof-of-reserves` (not just a docstring mention).

### Owners & rough effort
- **Who:** founder engages audit firm (security) + formalizes The Network Firm (reserve).
- **Cost (rough):** security **$15k–$80k** one-off; reserve attestation **recurring** (monthly).
- **Timeline:** security **2–4 wks**; reserve cadence **live within ~1 month** of engagement.

---

## Part 3 — Sequenced Plan (what unblocks institutional flow fastest)

```
Week 0–2   Engage ADGM trust counsel (reuse Trutina trio) + scope security audit firm
           Pre-audit hygiene merged (MINTER_ROLE revoke, pause decision) ← code task
Week 2–4   Security audit runs; The Network Firm attestation engagement formalized
Week 4–8   Declaration of Trust + segregation terms with Silver Bullion SG drafted
Week 6–12  Non-consolidation legal opinion delivered; published audit + recurring attestation
           live and linked from /proof-of-reserves
```

### Definition of "institutional-ready" (the checklist to hand a DD team)
- [ ] Bankruptcy-remote trust/SPV in place + non-consolidation opinion (Part 1)
- [ ] Segregated, allocated, non-rehypothecated metal reconciled against leased metal (Part 1)
- [ ] Published smart-contract audit report (Part 2a)
- [ ] Recurring signed reserve attestation tied to on-chain supply (Part 2b)
- [ ] On-chain PoR feed + NAV-redemption + hardened contracts (parallel code tasks)

---

## Cross-references
- Self-audit & gate scorecard: memory `project_pretex_rwa_venue.md`
- Reuse legal workstream: Trutina `CHECKLIST_phase0_deal1.md` (SPV / perfection / custody trio)
- Operator entity: Aurum Ledger Ltd (HK) — see `project_aurum_ledger_equity_offering`

_Last updated: 2026-06-19_
