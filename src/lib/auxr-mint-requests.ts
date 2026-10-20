// src/lib/auxr-mint-requests.ts
//
// Large AUXR withdrawals, held for Safe co-signature.
//
// Design note: docs/security/auxr-large-mint-approval.md
//
// Above the co-sign threshold the hot wallet does not mint. The customer's
// AUXR is debited and held, a request is recorded, and the mint is left to the
// admin Safe (0xedc9163c…481070, 2 of 3), which already holds MINTER_ROLE.
// Two owners sign in the Safe app; a watcher sees the tokens arrive and
// settles the request.
//
// No Safe owner or delegate key is in this process, and none should be. The
// threat here is an authorisation bug in the API turning into issuance — the
// October incident, where the attacker never held a key. A design where the
// web process can still cause a large mint after an extra check buys nothing,
// because the extra check lives in the process that was the problem.
//
// Sizes come from the real distribution rather than a guess: six accounts hold
// AUXR at all, 61.84 in total, the largest position 50. A threshold of 50
// means "larger than anything any customer currently holds needs a human".

import { getRedis, getUserBalance, incrementBalance } from "@/lib/redis";
import { getOnChainBalance } from "@/lib/auxr-onchain";
import type { Address } from "viem";

const num = (v: string | undefined, d: number) => {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) && n > 0 ? n : d;
};

/**
 * At or below this a withdrawal would mint automatically. Zero by default, so
 * there is no automatic path: every withdrawal is queued for the Safe.
 *
 * It was 50, chosen as "larger than any position any customer holds". That was
 * the right number for a design where the web app mints and the question is
 * how much it may mint unattended. It is the wrong question. The web app no
 * longer holds MINTER_ROLE, so the answer is none.
 *
 * The cost is real: a withdrawal now waits for a human to sign in the Safe,
 * hours rather than seconds. Six accounts hold AUXR, 61.84 in total, the
 * largest position 50 — so today that cost is close to nothing, and this is
 * the cheapest moment the change will ever be.
 *
 * Unlike the other two, this one accepts 0 from the environment; a threshold
 * is a policy that may legitimately be none.
 */
export const COSIGN_THRESHOLD = (() => {
  const raw = parseFloat(String(process.env.AUXR_MINT_REVIEW_THRESHOLD ?? ""));
  return Number.isFinite(raw) && raw >= 0 ? raw : 0;
})();
/** Above this the product does not offer withdrawal at all. */
export const HARD_CEILING = num(process.env.AUXR_MINT_HARD_CEILING, 500);
/** An unsigned request is refunded after this long. */
export const EXPIRY_HOURS = num(process.env.AUXR_MINT_REQUEST_EXPIRY_HOURS, 72);

export type RequestState =
  | "pending_triage"   // awaiting operator review
  | "awaiting_safe"    // operator approved; Safe owners must sign
  | "completed"        // tokens observed on chain, hold consumed
  | "cancelled"        // operator rejected; hold refunded
  | "expired";         // nobody signed in time; hold refunded

export interface MintRequest {
  refId: string;
  address: string;
  destination: string;
  unitsAUXR: number;
  state: RequestState;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  note?: string;
  decidedBy?: string;
  txHash?: string;
  /** Destination's on-chain AUXR when the request was cleared for the Safe.
   *  Settlement is judged against this, so an expiry can never refund AUXR
   *  that the Safe has already minted. */
  baselineOnChain?: string;
}

const KEY = (refId: string) => `auxr:mintreq:${refId}`;
const INDEX = "auxr:mintreq:open";

const parse = (v: unknown): MintRequest | null => {
  try {
    return typeof v === "string" ? JSON.parse(v) : (v as MintRequest);
  } catch {
    return null;
  }
};

async function write(req: MintRequest): Promise<void> {
  const redis = getRedis();
  req.updatedAt = new Date().toISOString();
  await redis.set(KEY(req.refId), JSON.stringify(req));
  const open = req.state === "pending_triage" || req.state === "awaiting_safe";
  if (open) await redis.sadd(INDEX, req.refId);
  else await redis.srem(INDEX, req.refId);
}

export async function getMintRequest(refId: string): Promise<MintRequest | null> {
  return parse(await getRedis().get(KEY(refId)));
}

export async function listOpenRequests(): Promise<MintRequest[]> {
  const redis = getRedis();
  const ids = ((await redis.smembers(INDEX)) || []) as string[];
  const out: MintRequest[] = [];
  for (const id of ids) {
    const r = parse(await redis.get(KEY(id)));
    if (r) out.push(r);
  }
  return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Debits the customer's AUXR and records a request for co-signature.
 *
 * The debit happens here rather than at approval: leaving the balance spendable
 * while a request is pending would let the same AUXR be withdrawn twice, once
 * through the queue and once through the automatic path.
 */
export async function createMintRequest(params: {
  refId: string;
  address: string;
  destination: string;
  unitsAUXR: number;
}): Promise<{ ok: true; request: MintRequest } | { ok: false; error: string; code: string }> {
  const { refId, address, destination, unitsAUXR } = params;

  const existing = await getMintRequest(refId);
  if (existing) return { ok: true, request: existing };

  const balance = await getUserBalance(address);
  if (balance.auxr < unitsAUXR - 1e-9) {
    return { ok: false, code: "insufficient_balance", error: "Insufficient AUXR balance." };
  }

  await incrementBalance(address, { auxr: -unitsAUXR });

  const now = new Date();
  const request: MintRequest = {
    refId,
    address: address.toLowerCase(),
    destination,
    unitsAUXR,
    state: "pending_triage",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + EXPIRY_HOURS * 3600_000).toISOString(),
  };
  await write(request);
  return { ok: true, request };
}

/** Operator triage: cleared for the Safe, or rejected and refunded. */
export async function decideMintRequest(
  refId: string,
  decision: "approve" | "reject",
  decidedBy: string,
  note?: string,
): Promise<{ ok: boolean; request?: MintRequest; error?: string }> {
  const req = await getMintRequest(refId);
  if (!req) return { ok: false, error: "not_found" };
  if (req.state !== "pending_triage") {
    return { ok: false, error: `request is ${req.state}` };
  }

  if (decision === "reject") {
    await incrementBalance(req.address, { auxr: req.unitsAUXR });
    req.state = "cancelled";
  } else {
    req.state = "awaiting_safe";
    try {
      req.baselineOnChain = (
        await getOnChainBalance(req.destination as Address)
      ).toString();
    } catch (e) {
      // Without a baseline the watcher cannot tell a settled request from an
      // unsettled one, and an expiry would refund tokens the Safe may have
      // already minted. Refuse rather than approve blind.
      console.error("baseline read failed for", refId, e);
      return { ok: false, error: "could not read destination balance; try again" };
    }
  }
  req.decidedBy = decidedBy;
  req.note = note;
  await write(req);
  return { ok: true, request: req };
}

/** The watcher saw the tokens arrive; the hold is consumed, not refunded. */
export async function completeMintRequest(
  refId: string,
  txHash: string,
): Promise<void> {
  const req = await getMintRequest(refId);
  if (!req || req.state === "completed") return;
  req.state = "completed";
  req.txHash = txHash;
  await write(req);
}

/**
 * Refunds anything that nobody acted on in time.
 *
 * A request that expires is a poor experience, not a loss: the customer gets
 * their AUXR back and can ask again. Silently leaving the hold in place would
 * be the loss.
 */
export async function expireStaleRequests(): Promise<{ expired: number; refunded: number }> {
  const now = Date.now();
  let expired = 0;
  let refunded = 0;
  for (const req of await listOpenRequests()) {
    if (new Date(req.expiresAt).getTime() > now) continue;
    // Refunding a request the Safe already signed would hand the customer the
    // tokens and their money back. Check the chain before touching a balance.
    if (req.state === "awaiting_safe" && (await isSettledOnChain(req))) {
      req.state = "completed";
      await write(req);
      continue;
    }
    await incrementBalance(req.address, { auxr: req.unitsAUXR });
    req.state = "expired";
    await write(req);
    expired += 1;
    refunded += req.unitsAUXR;
  }
  return { expired, refunded };
}

/** Has the Safe minted this request yet? Judged on chain, never on trust. */
export async function isSettledOnChain(req: MintRequest): Promise<boolean> {
  if (!req.baselineOnChain) return false;
  try {
    const now = await getOnChainBalance(req.destination as Address);
    const baseline = BigInt(req.baselineOnChain);
    const needed = BigInt(Math.round(req.unitsAUXR * 1e18));
    return now - baseline >= needed;
  } catch (e) {
    console.error("settlement check failed for", req.refId, e);
    return false;
  }
}
