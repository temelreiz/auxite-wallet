/**
 * The hold-and-refund accounting around Safe co-signature.
 *
 * The failure that matters here is not a refused withdrawal — it is paying a
 * customer twice. A request whose mint the Safe has already signed must never
 * be refunded by the expiry sweep, and the only thing standing between those
 * two outcomes is the on-chain check, so it gets a test.
 */
const store = new Map<string, unknown>();
const sets = new Map<string, Set<string>>();
const balances = new Map<string, number>();
let chainBalance = 0n;

jest.mock("@/lib/redis", () => ({
  getRedis: () => ({
    get: jest.fn(async (k: string) => store.get(k) ?? null),
    set: jest.fn(async (k: string, v: unknown) => void store.set(k, v)),
    sadd: jest.fn(async (k: string, m: string) => {
      if (!sets.has(k)) sets.set(k, new Set());
      sets.get(k)!.add(m);
    }),
    srem: jest.fn(async (k: string, m: string) => void sets.get(k)?.delete(m)),
    smembers: jest.fn(async (k: string) => [...(sets.get(k) ?? [])]),
  }),
  getUserBalance: jest.fn(async (a: string) => ({ auxr: balances.get(a) ?? 0 })),
  incrementBalance: jest.fn(async (a: string, u: Record<string, number>) => {
    balances.set(a, (balances.get(a) ?? 0) + (u.auxr ?? 0));
    return true;
  }),
}));

jest.mock("@/lib/auxr-onchain", () => ({
  getOnChainBalance: jest.fn(async () => chainBalance),
}));

import {
  createMintRequest,
  decideMintRequest,
  expireStaleRequests,
  getMintRequest,
  listOpenRequests,
} from "@/lib/auxr-mint-requests";

const USER = "0xuser000000000000000000000000000000000001";
const DEST = "0xdest000000000000000000000000000000000002";

const age = async (refId: string) => {
  const r = JSON.parse(String(store.get(`auxr:mintreq:${refId}`)));
  r.expiresAt = new Date(Date.now() - 1000).toISOString();
  store.set(`auxr:mintreq:${refId}`, JSON.stringify(r));
};

beforeEach(() => {
  store.clear();
  sets.clear();
  balances.clear();
  chainBalance = 0n;
  balances.set(USER, 200);
});

describe("createMintRequest", () => {
  it("debits the customer so the same AUXR cannot also go out automatically", async () => {
    const r = await createMintRequest({ refId: "r1", address: USER, destination: DEST, unitsAUXR: 80 });
    expect(r.ok).toBe(true);
    expect(balances.get(USER)).toBe(120);
  });

  it("refuses when the balance will not cover it", async () => {
    const r = await createMintRequest({ refId: "r2", address: USER, destination: DEST, unitsAUXR: 500 });
    expect(r).toMatchObject({ ok: false, code: "insufficient_balance" });
    expect(balances.get(USER)).toBe(200);
  });

  it("is idempotent on refId", async () => {
    await createMintRequest({ refId: "r3", address: USER, destination: DEST, unitsAUXR: 60 });
    await createMintRequest({ refId: "r3", address: USER, destination: DEST, unitsAUXR: 60 });
    expect(balances.get(USER)).toBe(140); // debited once
  });
});

describe("triage", () => {
  it("refunds on rejection", async () => {
    await createMintRequest({ refId: "r4", address: USER, destination: DEST, unitsAUXR: 70 });
    await decideMintRequest("r4", "reject", "admin:test");
    expect(balances.get(USER)).toBe(200);
    expect((await getMintRequest("r4"))!.state).toBe("cancelled");
  });

  it("records the destination's balance when clearing for the Safe", async () => {
    chainBalance = 5n * 10n ** 18n;
    await createMintRequest({ refId: "r5", address: USER, destination: DEST, unitsAUXR: 70 });
    await decideMintRequest("r5", "approve", "admin:test");
    const req = (await getMintRequest("r5"))!;
    expect(req.state).toBe("awaiting_safe");
    expect(req.baselineOnChain).toBe((5n * 10n ** 18n).toString());
  });

  it("leaves a decided request alone on a second decision", async () => {
    await createMintRequest({ refId: "r6", address: USER, destination: DEST, unitsAUXR: 70 });
    await decideMintRequest("r6", "approve", "admin:test");
    const again = await decideMintRequest("r6", "reject", "admin:test");
    expect(again.ok).toBe(false);
    expect(balances.get(USER)).toBe(130); // not refunded a second time
  });
});

describe("expiry", () => {
  it("refunds a request nobody signed", async () => {
    await createMintRequest({ refId: "r7", address: USER, destination: DEST, unitsAUXR: 90 });
    await decideMintRequest("r7", "approve", "admin:test");
    await age("r7");
    const res = await expireStaleRequests();
    expect(res.expired).toBe(1);
    expect(balances.get(USER)).toBe(200);
  });

  it("does NOT refund one the Safe already minted", async () => {
    chainBalance = 0n;
    await createMintRequest({ refId: "r8", address: USER, destination: DEST, unitsAUXR: 90 });
    await decideMintRequest("r8", "approve", "admin:test");
    // The Safe signs: the destination now holds the tokens.
    chainBalance = 90n * 10n ** 18n;
    await age("r8");

    const res = await expireStaleRequests();
    expect(res.expired).toBe(0);
    expect(balances.get(USER)).toBe(110); // still debited — paid in tokens
    expect((await getMintRequest("r8"))!.state).toBe("completed");
  });

  it("leaves requests that have not expired yet", async () => {
    await createMintRequest({ refId: "r9", address: USER, destination: DEST, unitsAUXR: 50 });
    expect((await expireStaleRequests()).expired).toBe(0);
    expect((await listOpenRequests()).length).toBe(1);
  });
});
