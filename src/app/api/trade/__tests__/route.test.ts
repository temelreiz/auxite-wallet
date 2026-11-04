/**
 * With on-chain trades enabled, /api/trade pays crypto out of platform wallets.
 * Those conversions follow the withdrawal rules; conversions that only credit the
 * balance do not.
 */
const hashes = new Map<string, Record<string, string>>();
const lists = new Map<string, string[]>();
jest.mock("@upstash/redis", () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: async () => null,
    set: async () => "OK",
    hget: async (k: string, f: string) => hashes.get(k)?.[f] ?? null,
    hgetall: async (k: string) => hashes.get(k) ?? null,
    hset: async () => 1,
    hincrbyfloat: async () => 0,
    lpush: async (k: string, v: string) => { lists.set(k, [v, ...(lists.get(k) ?? [])]); return 1; },
    lrange: async (k: string) => lists.get(k) ?? [],
    ltrim: async () => "OK",
    del: async (k: string) => Number(lists.delete(k)),
    rpush: async (k: string, ...v: string[]) => { lists.set(k, [...(lists.get(k) ?? []), ...v]); return v.length; },
    expire: async () => 1,
    multi: () => {
      const m: any = new Proxy({}, {
        get: (_t, p) => (p === "exec" ? async () => [] : () => m),
      });
      return m;
    },
  })),
}));
jest.mock("next/server", () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, json: async () => body }),
  },
}));

const sendTransaction = jest.fn(async () => "0xtx");
jest.mock("viem", () => {
  const client = {
    getBalance: async () => BigInt(10) ** BigInt(21),
    getGasPrice: async () => BigInt(1),
    waitForTransactionReceipt: async () => ({ status: "success" }),
  };
  return {
    createPublicClient: () => client,
    createWalletClient: () => ({
      account: { address: "0xhot" },
      sendTransaction: (...a: unknown[]) => (sendTransaction as any)(...a),
    }),
    http: () => ({}),
    formatUnits: () => "1",
    formatEther: () => "1",
    parseEther: () => BigInt(1),
  };
});
jest.mock("viem/accounts", () => ({ privateKeyToAccount: () => ({ address: "0xhot" }) }));
jest.mock("viem/chains", () => ({ base: {}, mainnet: {} }));

let verified = false;
jest.mock("@/lib/kyc-limits", () => ({ isKycVerified: async () => verified }));
jest.mock("@/lib/security/require-user", () => ({ requireSelf: () => ({ ok: true }) }));
jest.mock("@/lib/security/rate-limiter", () => ({
  withRateLimit: async () => null,
  tradeLimiter: {},
  checkSuspiciousActivity: async () => ({ suspicious: false }),
}));
jest.mock("@/lib/balance-lock", () => ({
  acquireBalanceLock: async () => ({ key: "lock" }),
  releaseBalanceLock: async () => undefined,
}));
jest.mock("@/lib/security/account-guard", () => ({ assertAccountActive: async () => ({ ok: true }) }));
jest.mock("@/lib/trading-guard", () => ({ checkTradingAllowed: async () => ({ allowed: true }) }));
jest.mock("@/lib/security/audit-logger", () => ({ logTrade: jest.fn(async () => undefined), logAudit: jest.fn(async () => undefined) }));
jest.mock("@/lib/auxiteer-service", () => ({
  getDefaultTier: () => ({ id: "regular", name: "Regular", fee: 1 }),
  getUserTier: async () => ({ tier: { id: "regular", name: "Regular", fee: 1 } }),
  calculateTierFee: (usd: number, pct: number) => (usd * pct) / 100,
}));
jest.mock("@/lib/v6-token-service", () => ({
  updateOraclePrices: jest.fn(),
  buyMetalToken: jest.fn(),
  sellMetalToken: jest.fn(async () => ({ success: true })),
  calculateBuyCost: jest.fn(),
  calculateSellPayout: jest.fn(),
  getTokenPrices: async () => ({ bidPerGram: 120, askPerGram: 130, spreadPercent: { buy: 1, sell: 1 } }),
  checkReserveLimit: jest.fn(),
}));
jest.mock("@/lib/crypto-liquidation-service", () => ({ getCryptoSpotPrice: async () => 2000 }));
jest.mock("@/lib/allocation-service", () => ({
  createAllocation: jest.fn(async () => ({ success: true })),
  reduceAllocations: jest.fn(async () => ({ success: true })),
  assertAvailable: async () => ({ ok: true }),
  getAvailable: async () => 0,
}));
jest.mock("@/lib/auxr-pricing", () => ({ getAuxrPricing: async () => ({ sellPriceUSD: 80 }) }));
jest.mock("@/lib/email", () => ({ sendCertificateEmail: jest.fn(async () => undefined), sendTradeExecutionEmail: jest.fn(async () => undefined) }));
jest.mock("@/lib/user-language", () => ({ getUserLanguage: async () => "en" }));
jest.mock("@/lib/format", () => ({ formatAmount: (n: number) => String(n) }));
jest.mock("@/lib/vault-inventory", () => ({ routeAndDeductSale: jest.fn(async () => ({})), returnSaleToVault: jest.fn(async () => ({})) }));
jest.mock("@/lib/notification-sender", () => ({ notifyTransactionRich: jest.fn(async () => undefined) }));
jest.mock("@/lib/quote-service", () => ({ executeQuote: jest.fn() }));
jest.mock("@/lib/validations", () => ({ validateRequest: jest.fn() }));
jest.mock("@/lib/spread-config", () => ({ getMetalSpread: async () => ({ buy: 1, sell: 1 }) }));
jest.mock("@/lib/bonus-guard", () => ({ recordVolume: jest.fn(async () => undefined) }));
jest.mock("@/config/contracts-v8", () => ({ METAL_TOKENS: {}, USDT_ADDRESS: "0x0" }));
jest.mock("@/lib/telegram", () => ({ notifyTrade: jest.fn(async () => undefined) }));
jest.mock("@/lib/nowpayments-service", () => ({ createCryptoPayout: jest.fn(), checkPayoutBalance: jest.fn() }));
jest.mock("@/lib/procurement-pipeline", () => ({ queueTradeForProcurement: jest.fn(async () => undefined) }));
jest.mock("@/lib/auxm-ledger", () => ({ recordAuxmEntry: jest.fn(async () => undefined) }));

const ADDRESS = "0x1111111111111111111111111111111111111111";
process.env.ENABLE_BLOCKCHAIN_TRADES = "true";
process.env.HOT_WALLET_ETH_PRIVATE_KEY = "0xkey";

// Required, not imported: the route reads the flag when it loads, and imports
// would run before the assignment above.
const { POST } = require("../route");
const { recordCardFundingHold } = require("@/lib/withdrawal-guard");

const trade = (body: Record<string, unknown>) =>
  POST({ headers: { get: () => null }, json: async () => ({ address: ADDRESS, ...body }) });
const balanceKey = `user:${ADDRESS}:balance`;

beforeEach(() => {
  hashes.clear();
  lists.clear();
  sendTransaction.mockClear();
  verified = false;
  jest.spyOn(console, "log").mockImplementation(() => undefined);
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("POST /api/trade with on-chain payouts", () => {
  it("does not pay ETH out to an unverified account", async () => {
    hashes.set(balanceKey, { auxm: "500" });
    const res = await trade({ type: "buy", fromToken: "AUXM", toToken: "ETH", fromAmount: 500 });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("kyc_required");
    expect(sendTransaction).not.toHaveBeenCalled();
  });

  it("does not pay ETH out for metal bought by an unverified account", async () => {
    hashes.set(balanceKey, { auxg: "2" });
    const res = await trade({ type: "sell", fromToken: "AUXG", toToken: "ETH", fromAmount: 2 });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("kyc_required");
    expect(sendTransaction).not.toHaveBeenCalled();
  });

  it("does not pay out value still under the card hold", async () => {
    verified = true;
    hashes.set(balanceKey, { auxg: "2" });
    await recordCardFundingHold(ADDRESS, 240, "pi_1");
    const res = await trade({ type: "sell", fromToken: "AUXG", toToken: "ETH", fromAmount: 2 });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("card_funding_hold");
    expect(sendTransaction).not.toHaveBeenCalled();
  });

  it("pays out to a verified account with no holds", async () => {
    verified = true;
    hashes.set(balanceKey, { auxm: "500" });
    await trade({ type: "buy", fromToken: "AUXM", toToken: "ETH", fromAmount: 500 });
    expect(sendTransaction).toHaveBeenCalledTimes(1);
  });

  it("leaves conversions that only credit the balance open to unverified accounts", async () => {
    hashes.set(balanceKey, { auxg: "2" });
    const res = await trade({ type: "sell", fromToken: "AUXG", toToken: "AUXM", fromAmount: 2 });
    expect(res.status).not.toBe(403);
    expect(sendTransaction).not.toHaveBeenCalled();
  });
});
