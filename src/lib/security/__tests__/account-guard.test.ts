/**
 * Regression guard: freezing an account must actually stop it.
 *
 * Before this suite existed, `frozen` and `banned` were written by the
 * emergency and admin routes but read by nothing on the value-moving paths,
 * so a "frozen" account could still trade and request withdrawals.
 */

const store = new Map<string, unknown>();
const hashes = new Map<string, Record<string, unknown>>();

jest.mock("@/lib/redis", () => ({
  redis: {
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    hgetall: jest.fn(async (key: string) => hashes.get(key) ?? null),
  },
}));

import { assertAccountActive } from "@/lib/security/account-guard";
import { redis } from "@/lib/redis";

const ADDR = "0xabc0000000000000000000000000000000000001";

const frozenConfig = (extra: Record<string, unknown> = {}) => ({
  frozen: true,
  panicMode: false,
  trustedContacts: [],
  cooldownPeriod: 24,
  securityLevel: "standard",
  frozenAt: new Date().toISOString(),
  frozenReason: "Manuel dondurma",
  ...extra,
});

beforeEach(() => {
  store.clear();
  hashes.clear();
  jest.clearAllMocks();
});

describe("assertAccountActive", () => {
  it("allows an account with no flags set", async () => {
    await expect(assertAccountActive(ADDR)).resolves.toEqual({ ok: true });
  });

  it("blocks a frozen account", async () => {
    store.set(`user:emergency:${ADDR}`, JSON.stringify(frozenConfig()));

    const gate = await assertAccountActive(ADDR);

    expect(gate.ok).toBe(false);
    expect(gate).toMatchObject({ code: "frozen", error: "Manuel dondurma" });
  });

  it("blocks an account in panic mode", async () => {
    store.set(
      `user:emergency:${ADDR}`,
      JSON.stringify(frozenConfig({ panicMode: true }))
    );

    expect(await assertAccountActive(ADDR)).toMatchObject({ ok: false, code: "panic" });
  });

  it("blocks a banned account even when no freeze is set", async () => {
    hashes.set(`user:${ADDR}:info`, { banned: "true" });

    expect(await assertAccountActive(ADDR)).toMatchObject({ ok: false, code: "banned" });
  });

  it("blocks a vault-frozen account", async () => {
    store.set(`user:address:${ADDR}`, "uid_1");
    hashes.set("user:uid_1", { vaultFrozen: "true" });

    expect(await assertAccountActive(ADDR)).toMatchObject({ ok: false, code: "vault_frozen" });
  });

  it("releases a temporary freeze once frozenUntil has passed", async () => {
    store.set(
      `user:emergency:${ADDR}`,
      JSON.stringify(
        frozenConfig({ frozenUntil: new Date(Date.now() - 60_000).toISOString() })
      )
    );

    await expect(assertAccountActive(ADDR)).resolves.toEqual({ ok: true });
  });

  it("finds a config stored under the raw (mixed-case) address", async () => {
    const mixed = "0xAbC0000000000000000000000000000000000001";
    store.set(`user:emergency:${mixed}`, JSON.stringify(frozenConfig()));

    expect(await assertAccountActive(mixed)).toMatchObject({ ok: false, code: "frozen" });
  });

  it("fails closed when Redis is unreachable", async () => {
    (redis.get as jest.Mock).mockRejectedValueOnce(new Error("connection refused"));

    expect(await assertAccountActive(ADDR)).toMatchObject({ ok: false });
  });
});
