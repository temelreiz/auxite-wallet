/**
 * AUXR buy-reward campaign: only net in-window buys count, rewards need KYC,
 * a non-US/UK person, an active non-AP account and the bought AUXR still held
 * (balance or stake), are capped per user, scaled to the pool, and paid once.
 */
const hashes = new Map<string, Map<string, string>>();
const strings = new Map<string, string>();
const h = (k: string) => hashes.get(k) ?? hashes.set(k, new Map()).get(k)!;
const fake = {
  hget: jest.fn(async (k: string, f: string) => h(k).get(f) ?? null),
  hgetall: jest.fn(async (k: string) => Object.fromEntries(h(k))),
  hsetnx: jest.fn(async (k: string, f: string, v: string) => (h(k).has(f) ? 0 : (h(k).set(f, v), 1))),
  hincrbyfloat: jest.fn(async (k: string, f: string, by: number) => {
    const n = Number(h(k).get(f) || 0) + by;
    h(k).set(f, String(n));
    return n;
  }),
  set: jest.fn(async (k: string, v: string, o?: { nx?: boolean }) => {
    if (o?.nx && strings.has(k)) return null;
    strings.set(k, v);
    return "OK";
  }),
  pipeline: () => {
    const ops: (() => Promise<unknown>)[] = [];
    const p = {
      hincrbyfloat: (k: string, f: string, by: number) => (ops.push(() => fake.hincrbyfloat(k, f, by)), p),
      exec: async () => { for (const op of ops) await op(); return []; },
    };
    return p;
  },
};
const kyc: Record<string, unknown> = {};
const stakes: Record<string, unknown[]> = {};
const inactive = new Set<string>();
const aps = new Set<string>();
const minted: { unitsAUXR: number; walletAddress?: string }[] = [];

jest.mock("@/lib/redis", () => ({
  getRedis: () => fake,
  redis: { get: async (k: string) => kyc[k.replace("kyc:", "")] ?? null },
  addTransaction: jest.fn(async () => "tx"),
}));
jest.mock("@/lib/auxr-reserve", () => ({ recordMint: jest.fn(async (p: any) => { minted.push(p); }) }));
jest.mock("@/lib/security/account-guard", () => ({ assertAccountActive: async (a: string) => ({ ok: !inactive.has(a) }) }));
jest.mock("@/lib/auxr-ap", () => ({ getAp: async (a: string) => (aps.has(a) ? { address: a } : null) }));
jest.mock("@/lib/staking/ledger", () => ({ readPositions: async (a: string) => stakes[a] || [] }));

import { CAMPAIGN, recordCampaignTrade, settleCampaign } from "@/lib/auxr-buy-reward";

const IN = CAMPAIGN.startAt + 1000;
const addr = (n: number) => `0x${n.toString(16).padStart(40, "0")}`;
const approve = (a: string, country = "TUR") => { kyc[a] = { status: "approved", personalInfo: { country, nationality: country } }; };
const hold = (a: string, units: number) => h(`user:${a}:balance`).set("auxr", String(units));

beforeEach(() => {
  hashes.clear(); strings.clear(); minted.length = 0; inactive.clear(); aps.clear();
  for (const k of Object.keys(kyc)) delete kyc[k];
  for (const k of Object.keys(stakes)) delete stakes[k];
});

describe("AUXR buy-reward campaign", () => {
  it("counts only net in-window, non-AP trades", async () => {
    const a = addr(1);
    await recordCampaignTrade(a, "buy", 500, 6, false, CAMPAIGN.startAt - 1);
    await recordCampaignTrade(a, "buy", 500, 6, true, IN);
    await recordCampaignTrade(a, "buy", 350, 4, false, IN);
    await recordCampaignTrade(a, "sell", 100, 1.2, false, IN);
    await recordCampaignTrade(a, "buy", 500, 6, false, CAMPAIGN.endAt);
    expect(Number(h(`auxr:reward:${CAMPAIGN.id}:usd`).get(a))).toBeCloseTo(250);
  });

  it("pays floor(net/100) × 0.05, capped at 0.5, only once and not before settleAt", async () => {
    const a = addr(2), b = addr(3);
    await recordCampaignTrade(a, "buy", 350, 4, false, IN);
    await recordCampaignTrade(b, "buy", 5000, 60, false, IN);
    approve(a); approve(b); hold(a, 4); hold(b, 60);

    expect(await settleCampaign(CAMPAIGN.settleAt - 1)).toBeNull();
    const r = await settleCampaign(CAMPAIGN.settleAt);
    expect(r!.awards.find((x) => x.address === a)!.reward).toBeCloseTo(0.15);
    expect(r!.awards.find((x) => x.address === b)!.reward).toBeCloseTo(0.5);
    expect(Number(h(`user:${a}:balance`).get("auxr"))).toBeCloseTo(4.15);
    expect(await settleCampaign(CAMPAIGN.settleAt + 1)).toBeNull();
    expect(minted).toHaveLength(2);
  });

  it("skips unverified, US/UK, inactive, AP and sold-off accounts; counts stakes as held", async () => {
    const [noKyc, uk, us, banned, ap, sold, staked] = [10, 11, 12, 13, 14, 15, 16].map(addr);
    for (const a of [noKyc, uk, us, banned, ap, sold, staked]) {
      await recordCampaignTrade(a, "buy", 200, 2.5, false, IN);
      hold(a, 2.5);
    }
    approve(uk, "GBR"); approve(us, "USA"); approve(banned); approve(ap); approve(sold); approve(staked);
    inactive.add(banned); aps.add(ap); hold(sold, 1); hold(staked, 0.5);
    stakes[staked] = [{ status: "active", metal: "auxr", amount: 2 }];

    const r = await settleCampaign(CAMPAIGN.settleAt);
    const reasons = Object.fromEntries(r!.skipped.map((s) => [s.address, s.reason.split(" ")[0]]));
    expect(reasons).toEqual({
      [noKyc]: "kyc_not_approved", [uk]: "excluded_country", [us]: "excluded_country",
      [banned]: "account_inactive", [ap]: "ap_account", [sold]: "not_held",
    });
    expect(r!.awards.map((x) => x.address)).toEqual([staked]);
  });

  it("scales pro-rata so the total never exceeds the pool", async () => {
    for (let i = 0; i < 150; i++) {
      const a = addr(100 + i);
      await recordCampaignTrade(a, "buy", 1000, 12, false, IN);
      approve(a); hold(a, 12);
    }
    const r = await settleCampaign(CAMPAIGN.settleAt);
    expect(r!.totalBeforeScaling).toBeCloseTo(75);
    expect(r!.totalPaid).toBeLessThanOrEqual(CAMPAIGN.POOL_AUXR);
    expect(r!.totalPaid).toBeGreaterThan(CAMPAIGN.POOL_AUXR - 0.001);
  });
});
