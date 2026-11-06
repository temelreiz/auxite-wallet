const load = (appChainId?: string, appEnv?: string) => {
  jest.resetModules();
  if (appChainId === undefined) delete process.env.NEXT_PUBLIC_APP_CHAIN_ID;
  else process.env.NEXT_PUBLIC_APP_CHAIN_ID = appChainId;
  if (appEnv === undefined) delete process.env.NEXT_PUBLIC_APP_ENV;
  else process.env.NEXT_PUBLIC_APP_ENV = appEnv;
  return require("@/config/chains") as typeof import("@/config/chains");
};

describe("APP_CHAIN", () => {
  const saved = { id: process.env.NEXT_PUBLIC_APP_CHAIN_ID, env: process.env.NEXT_PUBLIC_APP_ENV };

  afterAll(() => {
    load(saved.id, saved.env);
  });

  it("is Base for the live settings, including the old Ethereum value", () => {
    expect(load("8453").APP_CHAIN.chainId).toBe(8453);
    expect(load("1").APP_CHAIN.chainId).toBe(8453);
    expect(load(undefined, "production").APP_CHAIN.chainId).toBe(8453);
  });

  it("stays on Sepolia for test settings", () => {
    expect(load("11155111", "production").APP_CHAIN.chainId).toBe(11155111);
    expect(load(undefined, "development").APP_CHAIN.chainId).toBe(11155111);
  });

  it("allows Base and no longer allows Ethereum in production", () => {
    const { isAllowedChain } = load("1");
    expect(isAllowedChain(8453)).toBe(true);
    expect(isAllowedChain(1)).toBe(false);
    expect(isAllowedChain(null)).toBe(true);
  });
});
