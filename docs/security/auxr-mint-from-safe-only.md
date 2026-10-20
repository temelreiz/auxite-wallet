# AUXR is minted by the Safe, not by the web app

## Why this changed

Three times in October the web application was made to move value it should
not have. Each time the answer was a control inside the web application:
identity checks, daily caps, a kill switch, Telegram alerts, a co-signature
band above 50 AUXR. Each of those is worth having. None of them addresses the
shape of the problem, which is that **a web server could mint money**, and the
controls bounding that capability ran in the same process as the bugs.

The October incidents were not clever. `/api/debug/wallet` wrote any balance to
any address with no authentication and had done so since it was written;
`/api/capital-lock` refunded a lock as many times as you asked it to in
parallel. What made them expensive was not their sophistication but that a
fabricated balance could become a real token.

So the capability is gone rather than constrained.

## What it looks like now

| | before | after |
|---|---|---|
| `MINTER_ROLE` | hot wallet `0xd4cecfdf…a1658` + admin Safe | admin Safe only |
| minting key | `AUXR_MINTER_PRIVATE_KEY` in Vercel, Production **and Preview** | removed |
| withdrawal ≤ 50 AUXR | minted automatically | queued |
| withdrawal > 50 AUXR | queued | queued |
| `mintOnChain()` from the app | mints | throws unless `AUXR_ALLOW_HOT_MINT=true` |
| `/api/admin/auxr/mint-onchain` | signed a real mint | removed |
| `/admin/auxr` on-chain mint form | minted | builds a Safe transaction to paste |

`AUXR_MINT_REVIEW_THRESHOLD` now defaults to `0`, which means every withdrawal
is queued as a mint request. The threshold still exists, and still works, for
whoever decides later that some amount is small enough to release
automatically — but that decision needs a signer service, not an environment
variable in the app the money is withdrawn from.

Three locks, deliberately:

1. **On-chain.** The hot wallet holds no role, so a mint from the app reverts.
2. **In code.** `mintOnChain` refuses on a flag, so a future code path that
   reaches it fails with a sentence someone can read, rather than on a revert
   in a log nobody opens.
3. **Watched.** The ops watchdog asserts every five minutes that the hot wallet
   still holds no role. This is the control most easily undone — one
   `revokeRole` of work to put back, for a good-sounding reason at two in the
   morning — so it is asserted rather than assumed.

## What it costs

A withdrawal waits for a human to sign in the Safe. Hours, not seconds.

At the time of writing six accounts hold AUXR, 61.84 units between them, the
largest position 50. The cost of this today is close to nothing, which is
exactly why it was done today: every month of growth makes it harder, and the
argument for keeping an automatic path gets more persuasive as the amount at
risk gets larger.

The honest limitation: the Safe is 2-of-3 and all three keys are held by one
person, so "two humans approve" is not what this buys. What it buys is that
the keys are not in the web process — and every October incident would have
stopped at the queue.

When volume makes manual signing untenable, the thing to build is a separate
signing service with its own policy engine and its own keys, not a flag that
turns this back on.

## Doing it

```bash
node scripts/safe-revoke-hot-minter.mjs
```

Prints the Safe transaction and refuses to print one that would strand
issuance — it checks that the Safe holds `MINTER_ROLE` and
`DEFAULT_ADMIN_ROLE` first, because a revoke that leaves nobody able to mint
is worse than the problem it solves.

Then, in order:

1. Sign the `revokeRole` in the Safe — 2 of 3, and execute from an owner that
   has gas.
2. Delete `AUXR_MINTER_PRIVATE_KEY` from Vercel, **Production and Preview**. A
   preview deployment holding a minting key is a live key somewhere nobody
   looks.
3. Leave `AUXR_ALLOW_HOT_MINT` unset.

### Who pays the gas

The Safe does not. `execTransaction` is called by an owner and that caller
pays, which is why this Safe has executed eight transactions while holding no
ETH. An earlier version of this note and of the script checked the Safe's
balance and reported a working lever — including `pause()` — as unusable. That
was wrong.

What matters is that at least one owner can execute. Signing is off-chain and
free, so the other owners need nothing. At the time of writing one of the three
owners holds about 0.0028 ETH, which is enough for many transactions on Base
but thin for the only funded signer: an emergency is a bad time to find out the
one owner who can execute has run out.

Related: [auxr-large-mint-approval.md](./auxr-large-mint-approval.md) for the
queue the requests land in.
