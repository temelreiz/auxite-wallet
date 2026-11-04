/**
 * /api/transfer moves value out of an account: ETH and metals go to any external
 * address. An unverified card buyer must not reach that, and a held card purchase
 * must not leave through a second account.
 */
const hashes = new Map<string, Record<string, string>>();
const lists = new Map<string, string[]>();
const num = (v: unknown) => parseFloat(String(v ?? "0")) || 0;
const incr = (k: string, f: string, d: number) => {
  const h = hashes.get(k) ?? {};
  h[f] = String(num(h[f]) + d);
  hashes.set(k, h);
};
jest.mock("@upstash/redis", () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: async () => null,
    set: async () => "OK",
    incr: async () => 1,
    expire: async () => 1,
    zremrangebyscore: async () => 0,
    zcard: async () => 0,
    zadd: async () => 1,
    hget: async (k: string, f: string) => hashes.get(k)?.[f] ?? null,
    hgetall: async (k: string) => hashes.get(k) ?? null,
    hset: async (k: string, v: Record<string, unknown>) => {
      hashes.set(k, { ...(hashes.get(k) ?? {}), ...(v as Record<string, string>) });
      return 1;
    },
    hincrbyfloat: async (k: string, f: string, d: number) => { incr(k, f, d); return 0; },
    lpush: async (k: string, v: string) => { lists.set(k, [v, ...(lists.get(k) ?? [])]); return 1; },
    lrange: async (k: string) => lists.get(k) ?? [],
    ltrim: async () => "OK",
    del: async (k: string) => Number(lists.delete(k)),
    rpush: async (k: string, ...v: string[]) => { lists.set(k, [...(lists.get(k) ?? []), ...v]); return v.length; },
    multi: () => {
      const ops: (() => void)[] = [];
      const m = {
        hincrbyfloat: (k: string, f: string, d: number) => { ops.push(() => incr(k, f, d)); return m; },
        exec: async () => { ops.forEach((o) => o()); return []; },
      };
      return m;
    },
  })),
}));

const SENDER = "0x1111111111111111111111111111111111111111";
const MULE = "0x2222222222222222222222222222222222222222";
const EXTERNAL = "0x3333333333333333333333333333333333333333";

let verified = false;
const processWithdraw = jest.fn(async () => ({ success: true, txHash: "0xtx" }));
jest.mock("@/lib/security/require-user", () => ({
  requireUser: () => ({ ok: true, user: { address: SENDER } }),
}));
jest.mock("@/lib/kyc-limits", () => ({ isKycVerified: async () => verified }));
jest.mock("@/lib/blockchain-service", () => ({ processWithdraw: (...a: unknown[]) => (processWithdraw as any)(...a) }));
jest.mock("@/lib/kms-wallet", () => ({
  getUserIdFromAddress: async (a: string) => (a.toLowerCase() === EXTERNAL ? null : "uid"),
  sendETH: jest.fn(),
  sendERC20: jest.fn(),
}));
jest.mock("@/lib/security/account-guard", () => ({ assertAccountActive: async () => ({ ok: true }) }));
jest.mock("@/lib/balance-lock", () => ({
  acquireBalanceLock: async () => ({ key: "lock" }),
  releaseBalanceLock: async () => undefined,
}));
jest.mock("@/lib/allocation-service", () => ({
  assertAvailable: async () => ({ ok: true }),
  getAvailable: async () => 0,
}));
jest.mock("@/lib/bonus-guard", () => ({ checkTransferAllowed: async () => ({ allowed: true }) }));
jest.mock("@/lib/v6-token-service", () => ({ getTokenPrices: async () => ({ bidPerGram: 120 }) }));
jest.mock("@/lib/crypto-liquidation-service", () => ({ getCryptoSpotPrice: async () => 2000 }));
jest.mock("@/lib/telegram", () => ({ notifyValueMovement: jest.fn(async () => undefined) }));
jest.mock("@/lib/email-service", () => ({ sendTransferSentEmail: jest.fn(async () => undefined), sendTransferReceivedEmail: jest.fn(async () => undefined) }));
jest.mock("@/lib/user-language", () => ({ getUserLanguage: async () => "en" }));
jest.mock("@/lib/notification-sender", () => ({ notifyTransactionRich: jest.fn(async () => undefined) }));
jest.mock("@/config/contracts-v8", () => ({ METAL_TOKENS: {} }));

// The suite runs under jsdom (jest.setup.js needs window), which has no fetch Response.
jest.mock("next/server", () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, json: async () => body }),
  },
}));

import { POST } from "../route";
import { recordCardFundingHold } from "@/lib/withdrawal-guard";

const send = (body: Record<string, unknown>) => POST({ json: async () => body } as any);
const balanceKey = (a: string) => `user:${a}:balance`;

beforeEach(() => {
  hashes.clear();
  lists.clear();
  processWithdraw.mockClear();
  verified = false;
  jest.spyOn(console, "log").mockImplementation(() => undefined);
});

describe("POST /api/transfer", () => {
  it("does not let an unverified account send ETH to an external address", async () => {
    hashes.set(balanceKey(SENDER), { eth: "0.25" });
    const res = await send({ toAddress: EXTERNAL, token: "ETH", amount: 0.25 });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("kyc_required");
    expect(processWithdraw).not.toHaveBeenCalled();
    expect(num(hashes.get(balanceKey(SENDER))?.eth)).toBe(0.25);
  });

  it("does not let an unverified account move AUXM to another account", async () => {
    hashes.set(balanceKey(SENDER), { auxm: "500" });
    const res = await send({ toAddress: MULE, token: "AUXM", amount: 500 });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("kyc_required");
    expect(hashes.get(balanceKey(MULE))).toBeUndefined();
  });

  it("does not let a verified account send held ETH to an external address", async () => {
    verified = true;
    hashes.set(balanceKey(SENDER), { eth: "0.25" });
    await recordCardFundingHold(SENDER, 500, "pi_1");
    const res = await send({ toAddress: EXTERNAL, token: "ETH", amount: 0.25 });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("card_funding_hold");
    expect(processWithdraw).not.toHaveBeenCalled();
  });

  it("does not let held value escape the hold through a second account", async () => {
    verified = true;
    hashes.set(balanceKey(SENDER), { auxm: "500" });
    await recordCardFundingHold(SENDER, 500, "pi_1");
    const res = await send({ toAddress: MULE, token: "AUXM", amount: 500 });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("card_funding_hold");
    expect(hashes.get(balanceKey(MULE))).toBeUndefined();
    expect(num(hashes.get(balanceKey(SENDER))?.auxm)).toBe(500);
  });

  it("still transfers for a verified account with no holds", async () => {
    verified = true;
    hashes.set(balanceKey(SENDER), { auxm: "500" });
    const res = await send({ toAddress: MULE, token: "AUXM", amount: 200 });
    expect(res.status).toBe(200);
    expect(num(hashes.get(balanceKey(SENDER))?.auxm)).toBe(300);
    expect(num(hashes.get(balanceKey(MULE))?.auxm)).toBe(200);
  });
});
