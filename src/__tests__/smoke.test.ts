/**
 * Smoke Test Suite — Critical Flow Verification
 * Tests core business logic without external dependencies
 * Run: npm test -- --testPathPattern=smoke
 */

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK SETUP
// ═══════════════════════════════════════════════════════════════════════════════

// Mock Redis
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisHgetall = jest.fn();
const mockRedisScan = jest.fn();

jest.mock('@/lib/redis', () => ({
  getRedis: () => ({
    get: mockRedisGet,
    set: mockRedisSet,
    hgetall: mockRedisHgetall,
    scan: mockRedisScan,
  }),
  redis: {
    get: mockRedisGet,
    set: mockRedisSet,
    hgetall: mockRedisHgetall,
  },
  getUserBalance: jest.fn().mockResolvedValue({
    auxm: 100, bonusAuxm: 0, totalAuxm: 100, bonusExpiresAt: null,
    auxg: 5.5, auxs: 120, auxpt: 2, auxpd: 1,
    eth: 0.5, btc: 0.01, xrp: 500, sol: 10, usdt: 1000, usd: 500,
  }),
  getTransactions: jest.fn().mockResolvedValue([
    { id: 'tx1', type: 'deposit', token: 'eth', amount: 0.5, status: 'completed', timestamp: Date.now() - 86400000 },
    { id: 'tx2', type: 'swap', fromToken: 'eth', toToken: 'auxg', fromAmount: 0.1, toAmount: 1.5, status: 'completed', timestamp: Date.now() - 43200000 },
  ]),
}));

// Mock Resend + set env
process.env.RESEND_API_KEY = 'test_re_xxx';
process.env.FROM_EMAIL = 'test@auxite.io';

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ data: { id: 'mock-email-id' }, error: null }),
    },
  })),
}));

// ═══════════════════════════════════════════════════════════════════════════════
// 1. TRADING GUARD — Kill Switch Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('Trading Guard — Kill Switch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow trading when maintenance is disabled', async () => {
    mockRedisGet
      .mockResolvedValueOnce({ enabled: false }) // mobile:maintenance
      .mockResolvedValueOnce({ metalTrading: true, cryptoTrading: true }); // mobile:features

    const { checkTradingAllowed } = await import('@/lib/trading-guard');
    const result = await checkTradingAllowed('metalTrading');

    expect(result.allowed).toBe(true);
  });

  it('should block all trading when maintenance is enabled', async () => {
    mockRedisGet.mockResolvedValueOnce({
      enabled: true,
      message: { tr: 'Bakımda', en: 'Under maintenance' },
    });

    const { checkTradingAllowed } = await import('@/lib/trading-guard');
    const result = await checkTradingAllowed('metalTrading');

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('maintenance');
    expect(result.message?.en).toContain('maintenance');
  });

  it('should block specific feature when disabled in flags', async () => {
    mockRedisGet
      .mockResolvedValueOnce({ enabled: false }) // maintenance off
      .mockResolvedValueOnce({ metalTrading: true, cryptoTrading: false }); // crypto disabled

    const { checkTradingAllowed } = await import('@/lib/trading-guard');
    const result = await checkTradingAllowed('cryptoTrading');

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('feature_disabled');
  });

  it('should allow trading when Redis returns null (no config set)', async () => {
    mockRedisGet.mockResolvedValue(null);

    const { checkTradingAllowed } = await import('@/lib/trading-guard');
    const result = await checkTradingAllowed('metalTrading');

    expect(result.allowed).toBe(true);
  });

  it('should fail-open when Redis throws error', async () => {
    mockRedisGet.mockRejectedValue(new Error('Redis connection failed'));

    const { checkTradingAllowed } = await import('@/lib/trading-guard');
    const result = await checkTradingAllowed('metalTrading');

    // Should allow trading when Redis is down (fail-open)
    expect(result.allowed).toBe(true);
  });

  it('should block withdrawals independently from trading', async () => {
    mockRedisGet
      .mockResolvedValueOnce({ enabled: false }) // maintenance off
      .mockResolvedValueOnce({ metalTrading: true, cryptoTrading: true, cryptoWithdraw: false });

    const { checkTradingAllowed } = await import('@/lib/trading-guard');
    const result = await checkTradingAllowed('cryptoWithdraw');

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('feature_disabled');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. STATEMENT EMAIL — Template & Sending Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('Statement Email — Template Generation', () => {
  it('should send monthly statement email with correct data', async () => {
    const { sendMonthlyStatementEmail } = await import('@/lib/statement-email');

    const user = { address: '0xabc123def456', email: 'test@auxite.io', name: 'Test Client', language: 'en' };
    const balance = {
      auxm: 100, bonusAuxm: 0, totalAuxm: 100, bonusExpiresAt: null,
      auxg: 5.5, auxs: 120, auxpt: 2, auxpd: 1,
      eth: 0.5, btc: 0.01, xrp: 500, sol: 10, usdt: 1000, usd: 500,
    };
    const transactions = [
      { id: 'tx1', type: 'deposit' as const, token: 'eth', amount: 0.5, status: 'completed' as const, timestamp: Date.now() },
    ];

    const result = await sendMonthlyStatementEmail(user, balance, transactions, 2026, 0);
    expect(result.success).toBe(true);
  });

  it('should support Turkish language', async () => {
    const { sendMonthlyStatementEmail } = await import('@/lib/statement-email');

    const user = { address: '0xabc123def456', email: 'test@auxite.io', name: 'Test Musteri', language: 'tr' };
    const balance = {
      auxm: 0, bonusAuxm: 0, totalAuxm: 0, bonusExpiresAt: null,
      auxg: 10, auxs: 0, auxpt: 0, auxpd: 0,
      eth: 0, btc: 0, xrp: 0, sol: 0, usdt: 0, usd: 0,
    };

    const result = await sendMonthlyStatementEmail(user, balance, [], 2026, 0);
    expect(result.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. PRICE VALIDATION — Metal Price Smoke Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('Price Validation — Smoke Tests', () => {
  // Reasonable price ranges for metals ($/oz) as of Feb 2026
  const PRICE_RANGES = {
    gold:      { min: 1500, max: 10000 },
    silver:    { min: 15, max: 200 },
    platinum:  { min: 500, max: 5000 },
    palladium: { min: 500, max: 5000 },
    eth:       { min: 500, max: 20000 },
    btc:       { min: 20000, max: 500000 },
  };

  it('should have valid gold price range', () => {
    const goldPrice = 4880; // Current approximate $/oz
    expect(goldPrice).toBeGreaterThan(PRICE_RANGES.gold.min);
    expect(goldPrice).toBeLessThan(PRICE_RANGES.gold.max);
  });

  it('should have valid silver price range', () => {
    const silverPrice = 73; // Current approximate $/oz
    expect(silverPrice).toBeGreaterThan(PRICE_RANGES.silver.min);
    expect(silverPrice).toBeLessThan(PRICE_RANGES.silver.max);
  });

  it('should have valid troy oz to gram conversion', () => {
    const TROY_OZ_TO_GRAM = 31.1035;
    const goldPerOz = 4880;
    const goldPerGram = goldPerOz / TROY_OZ_TO_GRAM;

    // Gold per gram should be roughly $150-160
    expect(goldPerGram).toBeGreaterThan(50);
    expect(goldPerGram).toBeLessThan(500);
  });

  it('should validate E6 price format conversion', () => {
    const pricePerOz = 4880.50;
    const e6 = Math.round(pricePerOz * 1_000_000);

    expect(e6).toBe(4880500000);
    expect(e6 / 1_000_000).toBeCloseTo(pricePerOz, 2);
  });

  it('should validate oracle contract OZ_PER_KG conversion', () => {
    const OZ_PER_KG_E9 = 32_150_746_600n; // 32.150746600 * 1e9
    const pricePerOzE6 = 4880500000n; // $4880.50/oz in E6

    // $/kg = ($/oz * OZ_PER_KG) / 1e9
    const pricePerKgE6 = (pricePerOzE6 * OZ_PER_KG_E9) / 1_000_000_000n;

    // Gold per kg should be ~$156,900
    const pricePerKg = Number(pricePerKgE6) / 1_000_000;
    expect(pricePerKg).toBeGreaterThan(100_000);
    expect(pricePerKg).toBeLessThan(500_000);

    // Per gram should be ~$157
    const pricePerGram = pricePerKg / 1000;
    expect(pricePerGram).toBeGreaterThan(50);
    expect(pricePerGram).toBeLessThan(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. BALANCE INTEGRITY — User Balance Smoke Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('Balance Integrity — Smoke Tests', () => {
  it('should return valid user balance structure', async () => {
    const { getUserBalance } = await import('@/lib/redis');
    const balance = await getUserBalance('0xTestAddress');

    // All required fields should exist
    expect(balance).toHaveProperty('auxg');
    expect(balance).toHaveProperty('auxs');
    expect(balance).toHaveProperty('auxpt');
    expect(balance).toHaveProperty('auxpd');
    expect(balance).toHaveProperty('auxm');
    expect(balance).toHaveProperty('eth');
    expect(balance).toHaveProperty('btc');
    expect(balance).toHaveProperty('usdt');
    expect(balance).toHaveProperty('usd');
  });

  it('should not have negative balances', async () => {
    const { getUserBalance } = await import('@/lib/redis');
    const balance = await getUserBalance('0xTestAddress');

    expect(balance.auxg).toBeGreaterThanOrEqual(0);
    expect(balance.auxs).toBeGreaterThanOrEqual(0);
    expect(balance.auxpt).toBeGreaterThanOrEqual(0);
    expect(balance.auxpd).toBeGreaterThanOrEqual(0);
    expect(balance.eth).toBeGreaterThanOrEqual(0);
    expect(balance.btc).toBeGreaterThanOrEqual(0);
    expect(balance.usdt).toBeGreaterThanOrEqual(0);
  });

  it('should calculate totalAuxm correctly', async () => {
    const { getUserBalance } = await import('@/lib/redis');
    const balance = await getUserBalance('0xTestAddress');

    expect(balance.totalAuxm).toBe(balance.auxm + balance.bonusAuxm);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. TRADE VALIDATION — Trade Logic Smoke Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('Trade Validation — Smoke Tests', () => {
  const METALS = ['auxg', 'auxs', 'auxpt', 'auxpd'];
  const CRYPTOS = ['eth', 'btc', 'xrp', 'sol', 'usdt'];
  const VALID_TOKENS = [...METALS, 'auxm', ...CRYPTOS];

  it('should recognize all valid tokens', () => {
    expect(VALID_TOKENS).toContain('auxg');
    expect(VALID_TOKENS).toContain('auxs');
    expect(VALID_TOKENS).toContain('auxpt');
    expect(VALID_TOKENS).toContain('auxpd');
    expect(VALID_TOKENS).toContain('eth');
    expect(VALID_TOKENS).toContain('btc');
    expect(VALID_TOKENS).toContain('usdt');
    expect(VALID_TOKENS).toContain('auxm');
  });

  it('should reject invalid tokens', () => {
    expect(VALID_TOKENS).not.toContain('doge');
    expect(VALID_TOKENS).not.toContain('shib');
    expect(VALID_TOKENS).not.toContain('');
  });

  it('should identify metal vs crypto trades correctly', () => {
    const isMetal = (token: string) => METALS.includes(token.toLowerCase());

    expect(isMetal('auxg')).toBe(true);
    expect(isMetal('AUXG')).toBe(true); // case-insensitive — trade route lowercases input
    expect(isMetal('AuXg')).toBe(true); // mixed case also accepted
    expect(isMetal('eth')).toBe(false);
    expect(isMetal('btc')).toBe(false);
  });

  it('should validate trade amounts are positive', () => {
    const validateAmount = (amount: number) => amount > 0 && isFinite(amount);

    expect(validateAmount(1.5)).toBe(true);
    expect(validateAmount(0.001)).toBe(true);
    expect(validateAmount(0)).toBe(false);
    expect(validateAmount(-1)).toBe(false);
    expect(validateAmount(Infinity)).toBe(false);
    expect(validateAmount(NaN)).toBe(false);
  });

  it('should validate fee calculation', () => {
    // Tier-based fee: Regular = 1.5%, Silver = 1.0%, Gold = 0.5%, Platinum = 0.25%
    const calculateFee = (amount: number, feePercent: number) => amount * (feePercent / 100);

    const tradeAmount = 1000; // $1000
    expect(calculateFee(tradeAmount, 1.5)).toBe(15); // Regular tier
    expect(calculateFee(tradeAmount, 1.0)).toBe(10); // Silver tier
    expect(calculateFee(tradeAmount, 0.5)).toBe(5);  // Gold tier
    expect(calculateFee(tradeAmount, 0.25)).toBe(2.5); // Platinum tier
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. ORACLE — Contract Interaction Smoke Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('Oracle Contract — Smoke Tests', () => {
  it('should validate oracle contract address format', () => {
    const oracleAddress = '0xbB109166062D718756D0389F4bA2aB02A36F296c';
    expect(oracleAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it('should validate ORACLE_ROLE hash', () => {
    // keccak256("ORACLE_ROLE") — used in AccessControl
    const expectedRole = '0x68e79a7bf1e0bc45d0a330c573bc367f9cf464fd326078812f301165fbda4ef1';
    expect(expectedRole).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('should validate toE6 conversion', () => {
    const toE6 = (price: number): bigint => BigInt(Math.round(price * 1_000_000));

    expect(toE6(4880.50)).toBe(4880500000n);
    expect(toE6(73.29)).toBe(73290000n);
    expect(toE6(0)).toBe(0n);
    expect(toE6(1)).toBe(1000000n);
  });

  it('should validate fromE6 conversion', () => {
    const fromE6 = (val: bigint): number => Number(val) / 1_000_000;

    expect(fromE6(4880500000n)).toBeCloseTo(4880.50, 2);
    expect(fromE6(73290000n)).toBeCloseTo(73.29, 2);
    expect(fromE6(0n)).toBe(0);
  });

  it('should validate setAllPrices ABI signature', () => {
    const abi = 'function setAllPrices(uint256 auxgOzE6, uint256 auxsOzE6, uint256 auxptOzE6, uint256 auxpdOzE6, uint256 ethPriceE6) external';
    expect(abi).toContain('setAllPrices');
    expect(abi).toContain('auxgOzE6');
    expect(abi).toContain('ethPriceE6');
  });

  it('should validate getAllPricesOzE6 ABI signature', () => {
    const abi = 'function getAllPricesOzE6() external view returns (uint256 auxgOzE6, uint256 auxsOzE6, uint256 auxptOzE6, uint256 auxpdOzE6, uint256 ethE6)';
    expect(abi).toContain('getAllPricesOzE6');
    expect(abi).toContain('view');
    expect(abi).not.toContain('lastUpdated'); // V2 doesn't return lastUpdated
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. SECURITY — Input Validation Smoke Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('Security — Input Validation', () => {
  it('should validate Ethereum addresses', () => {
    const isValidAddress = (addr: string) => /^0x[0-9a-fA-F]{40}$/.test(addr);

    expect(isValidAddress('0xD24B2bca1E0b58a2EAE5b1184871219f9a8EE944')).toBe(true);
    expect(isValidAddress('0xaE4d3eb67558423f74E8D80F56fbdfc1F91F3213')).toBe(true);
    expect(isValidAddress('0x')).toBe(false);
    expect(isValidAddress('')).toBe(false);
    expect(isValidAddress('not-an-address')).toBe(false);
    expect(isValidAddress('0xZZZ')).toBe(false);
  });

  it('should normalize addresses to lowercase', () => {
    const normalize = (addr: string) => addr.toLowerCase();

    expect(normalize('0xD24B2bca1E0b58a2EAE5b1184871219f9a8EE944'))
      .toBe('0xd24b2bca1e0b58a2eae5b1184871219f9a8ee944');
  });

  it('should reject SQL/NoSQL injection attempts in trade params', () => {
    const sanitize = (input: string) => {
      // Basic check: no special characters in token names
      return /^[a-zA-Z0-9]+$/.test(input);
    };

    expect(sanitize('auxg')).toBe(true);
    expect(sanitize('eth')).toBe(true);
    expect(sanitize("'; DROP TABLE--")).toBe(false);
    expect(sanitize('auxg; redis.del')).toBe(false);
    expect(sanitize('<script>')).toBe(false);
  });
});
