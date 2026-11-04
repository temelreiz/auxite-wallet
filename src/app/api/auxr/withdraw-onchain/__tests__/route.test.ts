/**
 * AUXR leaving on chain is irreversible, so value still under the card hold must
 * not reach the bridge even from a verified account.
 */
const hashes = new Map<string, Record<string, string>>();
const lists = new Map<string, string[]>();
jest.mock("@upstash/redis", () => ({
  Redis: jest.fn().mockImplementation(() => ({
    hgetall: async (k: string) => hashes.get(k) ?? null,
    lpush: async (k: string, v: string) => { lists.set(k, [v, ...(lists.get(k) ?? [])]); return 1; },
    lrange: async (k: string) => lists.get(k) ?? [],
    ltrim: async () => "OK",
    del: async (k: string) => Number(lists.delete(k)),
    rpush: async (k: string, ...v: string[]) => { lists.set(k, [...(lists.get(k) ?? []), ...v]); return v.length; },
  })),
}));
jest.mock("next/server", () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, json: async () => body }),
  },
}));

jest.mock("viem", () => ({ isAddress: (a: string) => /^0x[0-9a-f]{40}$/i.test(a) }));

const ADDRESS = "0x1111111111111111111111111111111111111111";
const DESTINATION = "0x3333333333333333333333333333333333333333";
const idempotent = new Map<string, string>();

const withdrawToChain = jest.fn(async () => ({ state: "completed", refId: "ref-00000001", txHash: "0xtx" }));
jest.mock("@/lib/auxr-bridge", () => ({
  withdrawToChain: (...a: unknown[]) => (withdrawToChain as any)(...a),
  getWithdrawRecord: jest.fn(async () => null),
}));
jest.mock("@/lib/redis", () => ({
  redis: {
    get: async (k: string) => (k.startsWith("kyc:") ? JSON.stringify({ status: "approved" }) : idempotent.get(k) ?? null),
    set: async () => "OK",
  },
  getUserBalance: async () => ({ auxr: 10 }),
}));
jest.mock("@/lib/security/require-user", () => ({ requireUser: () => ({ ok: true, user: { address: ADDRESS } }) }));
jest.mock("@/lib/security/account-guard", () => ({ assertAccountActive: async () => ({ ok: true }) }));
jest.mock("@/lib/auxr-onchain", () => ({ isPaused: async () => false }));
jest.mock("@/lib/auxr-ap", () => ({ getAp: async () => null, withdrawFromInventory: jest.fn() }));
jest.mock("@/lib/auxr-mint-requests", () => ({ createMintRequest: jest.fn(), COSIGN_THRESHOLD: 1000, HARD_CEILING: 10000 }));
jest.mock("@/lib/auxr-mint-limits", () => ({
  reserveMintAllowance: async () => ({ ok: true }),
  releaseMintAllowance: jest.fn(async () => undefined),
  DAILY_CAP_PER_ACCOUNT: 1000,
}));
jest.mock("@/lib/telegram", () => ({ notifyAuxrMint: jest.fn(async () => undefined) }));
jest.mock("@/lib/kyc-limits", () => ({ isKycVerified: async () => true }));
jest.mock("@/lib/v6-token-service", () => ({ getTokenPrices: async () => ({ bidPerGram: 120 }) }));
jest.mock("@/lib/crypto-liquidation-service", () => ({ getCryptoSpotPrice: async () => 2000 }));
jest.mock("@/lib/allocation-service", () => ({ getAvailable: async () => 0 }));
jest.mock("@/lib/auxr-pricing", () => ({ getAuxrPricing: async () => ({ sellPriceUSD: 80 }) }));

import { POST } from "../route";
import { recordCardFundingHold } from "@/lib/withdrawal-guard";

const withdraw = (units: number, refId = "ref-00000001") =>
  POST({ json: async () => ({ destination: DESTINATION, unitsAUXR: units, refId }) } as any);

beforeEach(() => {
  hashes.clear();
  lists.clear();
  idempotent.clear();
  withdrawToChain.mockClear();
  hashes.set(`user:${ADDRESS}:balance`, { auxr: "10" }); // $800 at the mocked sell price
});

describe("POST /api/auxr/withdraw-onchain", () => {
  it("does not withdraw AUXR still under the card hold", async () => {
    await recordCardFundingHold(ADDRESS, 800, "pi_1");
    const res = await withdraw(5);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("card_funding_hold");
    expect(withdrawToChain).not.toHaveBeenCalled();
  });

  it("lets settled AUXR leave beside a hold", async () => {
    await recordCardFundingHold(ADDRESS, 400, "pi_1"); // $400 of the $800 is free
    await withdraw(5);
    expect(withdrawToChain).toHaveBeenCalledTimes(1);
  });

  it("still withdraws for an account with no holds", async () => {
    await withdraw(5);
    expect(withdrawToChain).toHaveBeenCalledTimes(1);
  });

  it("replays a finished withdrawal even once a hold exists", async () => {
    idempotent.set("auxr:withdraw:idempotency:ref-00000001", JSON.stringify({ success: true, state: "completed" }));
    await recordCardFundingHold(ADDRESS, 800, "pi_1");
    const res = await withdraw(5);
    expect(res.status).toBe(200);
    expect(withdrawToChain).not.toHaveBeenCalled();
  });
});
