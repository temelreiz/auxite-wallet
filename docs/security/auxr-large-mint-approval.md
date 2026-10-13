# Large AUXR withdrawals: Safe co-signature

Design note, 13 October 2026. Decision needed before implementation.

## The gap this closes

PR #80 refuses any single withdrawal above `AUXR_MINT_REVIEW_THRESHOLD`
(currently 100 AUXR) with `manual_review_required`. There is no queue behind
that refusal and no way to release one, so a customer asking for 150 AUXR is
simply stuck and has to be handled by hand, out of band. The cap works; the
release path does not exist.

## What we are defending against

Not a stolen Safe key. The threat the October incident demonstrated is an
**authorisation bug in the API** turning into unlimited issuance, because
`AUXR_MINTER_PRIVATE_KEY` lives in the web process and any request that reaches
`mintOnChain()` spends it. The attacker never held a key.

So the property worth buying is: **above some size, no single compromised
system can issue AUXR.** That rules out any design where the hot wallet still
signs after an extra check, because the extra check lives in the same process
that was the problem.

## On-chain facts

| | |
|---|---|
| Admin Safe | `0xedc9163c5f8a2a76bd1cdda6baa4eb576b481070` |
| Threshold | **2 of 3** |
| Owners | `0xf6fd0b49…88cdf`, `0x45a1a0e5…57064a`, `0x7227130e…03f5a0` |
| Safe roles | `DEFAULT_ADMIN`, `MINTER_ROLE`, `PAUSER_ROLE` |
| Hot minter | `0xd4cecfdf…0a1658`, `MINTER_ROLE` only |

The Safe already holds `MINTER_ROLE`, so it can mint today without any contract
change. Nothing needs redeploying.

## Proposed flow

Three bands, by withdrawal size:

| Band | Size | Path |
|---|---|---|
| Automatic | ≤ `REVIEW_THRESHOLD` | Hot wallet mints, subject to the daily caps |
| Co-signed | above threshold | Safe transaction, 2 of 3 owners sign |
| Refused | above a hard ceiling | Not offered through the product at all |

### Co-signed band, step by step

1. The customer requests the withdrawal. The off-chain AUXR is **debited and
   held**, not released — so the balance cannot be spent twice while the
   request is pending.
2. A request record is written: `auxr:mintreq:{refId}` with state `pending`,
   the destination, the amount, the requesting account and the time.
3. A Safe transaction is proposed through the Safe Transaction Service:
   `AUXR.mint(destination, amount)`, from the Safe.
4. Telegram announces it, with the Safe URL and the amount.
5. Two owners sign in the Safe app. The Safe executes; tokens are minted.
6. A watcher (the existing deposit-scan cron is the natural home) sees the
   execution, marks the request `completed`, and releases the hold.
7. If no execution within a configured window — 72 hours is a reasonable
   default — the request expires, the hold is reversed, and the customer's
   AUXR returns to their balance.

### What the API can and cannot do

The API may **propose**. It cannot sign, because no Safe owner key is in the
web process, and it must stay that way — if one ends up there, this design buys
nothing.

Cancelling a pending request is an operator action through the admin endpoint;
it reverses the hold without touching the chain. Owners can also simply decline
to sign, which is the same outcome after the expiry.

## What this costs

**Latency.** A large withdrawal stops being instant and waits for two humans.
Given current volume — the off-chain ledger holds 2,616 AUXR in total — large
withdrawals are rare, so the cost falls on few customers. The threshold is the
dial: set it where the automatic band covers ordinary use.

**An operational obligation.** Somebody must watch for pending requests. If
nobody signs, the customer waits out the expiry and is refunded, which is a
poor experience but not a loss. The Telegram alert and a count on the admin
dashboard are the minimum.

**Integration work.** Safe Transaction Service for Base, proposing with an
API key, plus the watcher. Estimate: a day, most of it in the watcher and the
hold/expiry accounting rather than the Safe call itself.

## Alternatives considered

**Admin approves, hot wallet mints.** Much cheaper to build and keeps the flow
inside the product. Rejected as the primary mechanism: approval would live in
the same process as the bug class we are defending against, so a compromised
admin session reproduces October exactly, one step later. Worth having *as
well*, as triage before proposing to the Safe — not instead.

**Timelock with cancellation.** The request executes automatically after a
delay unless cancelled. Attractive because the happy path needs no human. But
it depends on someone watching during the window, and the 605 AUXR in this
incident left at 00:22 local time. A delay that nobody is awake to use is a
delay that buys nothing.

**Lower the caps instead.** Simplest of all, and the caps in #80 already bound
the damage. But caps alone mean a legitimate large withdrawal is impossible
rather than slow, which pushes it out of band into manual minting — the thing
with the least oversight of all.

## Decisions needed

1. **Threshold** between the automatic and co-signed bands. 100 AUXR is the
   current default and was a guess; it should be set from real withdrawal
   sizes.
2. **Hard ceiling**, if any, above which the product does not offer withdrawal
   at all.
3. **Expiry window** for an unsigned request. 72 hours proposed.
4. **Whether to build the admin triage step** before the Safe proposal, or
   propose directly on request.
