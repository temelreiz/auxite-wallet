/**
 * Conversions to crypto only change the balance: nothing is sent from a platform
 * wallet or through NOWPayments, even with on-chain trades enabled. Paying out
 * and crediting the balance as well would pay the same amount twice.
 */
const hashes = new Map<string, Record<string, string>>();
const multiOps: [string, string, number][] = [];
jest.mock("@upstash/redis", () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: async () => null,
    set: async () => "OK",
    hget: async (k: string, f: string) => hashes.get(k)?.[f] ?? null,
    hgetall: async (k: string) => hashes.get(k) ?? null,
    hset: async () => 1,
    hincrbyfloat: async () => 0,
    lpush: async () => 1,
    lrange: async () => [],
    ltrim: async () => "OK",
    expire: async () => 1,
    multi: () => {
      const m: any = new Proxy({}, {
        get: (_t, p) => {
          if (p === "exec") return async () => [];
          if (p === "hincrbyfloat") {
            return (k: string, f: string, d: number) => { multiOps.push([k, f, d]); return m; };
          }
          return () => m;
        },
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
jest.mock("viem", () => ({
  createPublicClient: () => ({
    getBalance: async () => BigInt(10) ** BigInt(21),
    getGasPrice: async () => BigInt(1),
    waitForTransactionReceipt: async () => ({}),
  }),
  createWalletClient: () => ({
    account: { address: "0xhot" },
    sendTransaction: (...a: unknown[]) => (sendTransaction as any)(...a),
  }),
  http: () => ({}),
  formatUnits: () => "1",
  formatEther: () => "1",
  parseEther: () => BigInt(1),
}));
jest.mock("viem/accounts", () => ({ privateKeyToAccount: () => ({ address: "0xhot" }) }));
jest.mock("viem/chains", () => ({ base: {}, mainnet: {} }));

const createCryptoPayout = jest.fn(async () => ({ success: true, payoutId: "p" }));
jest.mock("@/lib/nowpayments-service", () => ({
  createCryptoPayout: (...a: unknown[]) => (createCryptoPayout as any)(...a),
  checkPayoutBalance: async () => ({ sufficient: true }),
}));

jest.mock("@/lib/kyc-limits", () => ({ isKycVerified: async () => true }));
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
jest.mock("@/lib/procurement-pipeline", () => ({ queueTradeForProcurement: jest.fn(async () => undefined) }));
jest.mock("@/lib/auxm-ledger", () => ({ recordAuxmEntry: jest.fn(async () => undefined) }));

const ADDRESS = "0x1111111111111111111111111111111111111111";
process.env.ENABLE_BLOCKCHAIN_TRADES = "true";
process.env.HOT_WALLET_ETH_PRIVATE_KEY = "0xkey";

// Required, not imported: the route reads the flag when it loads, and imports
// would run before the assignment above.
const { POST } = require("../route");

const trade = (body: Record<string, unknown>) =>
  POST({ headers: { get: () => null }, json: async () => ({ address: ADDRESS, ...body }) });
const balanceKey = `user:${ADDRESS}:balance`;
const credited = (field: string) =>
  multiOps.filter(([k, f, d]) => k === balanceKey && f === field && d > 0).reduce((n, [, , d]) => n + d, 0);

beforeEach(() => {
  hashes.clear();
  multiOps.length = 0;
  sendTransaction.mockClear();
  createCryptoPayout.mockClear();
  jest.spyOn(console, "log").mockImplementation(() => undefined);
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("POST /api/trade conversions to crypto", () => {
  it("credits AUXM to ETH once, with no on-chain send", async () => {
    hashes.set(balanceKey, { auxm: "500" });
    const res = await trade({ type: "buy", fromToken: "AUXM", toToken: "ETH", fromAmount: 500 });
    expect(res.status).toBe(200);
    expect(sendTransaction).not.toHaveBeenCalled();
    expect(credited("eth")).toBeCloseTo(0.2475, 6); // $495 after the 1% fee, at $2,000
  });

  it("credits metal to ETH once, with no on-chain send", async () => {
    hashes.set(balanceKey, { auxg: "2" });
    const res = await trade({ type: "sell", fromToken: "AUXG", toToken: "ETH", fromAmount: 2, executeOnChain: false });
    expect(res.status).toBe(200);
    expect(sendTransaction).not.toHaveBeenCalled();
    expect(credited("eth")).toBeCloseTo(0.1188, 6); // $237.60 after the 1% fee, at $2,000
  });

  it.each(["BTC", "XRP", "SOL"])("does not pay %s through NOWPayments", async (token) => {
    hashes.set(balanceKey, { auxm: "500" });
    hashes.set(`user:${ADDRESS}:info`, { [`${token.toLowerCase()}Wallet`]: "external-wallet" });
    const res = await trade({ type: "buy", fromToken: "AUXM", toToken: token, fromAmount: 500 });
    expect(res.status).toBe(200);
    expect(createCryptoPayout).not.toHaveBeenCalled();
    expect(credited(token.toLowerCase())).toBeGreaterThan(0);
  });
});
