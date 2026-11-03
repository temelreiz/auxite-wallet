/**
 * AP redeem sources: deposits from an AP's registered wallet are credited to
 * the AP, but only after the cooldown, never by re-pointing an existing
 * source, and never for the AP's exchange destination.
 */
const hashes = new Map<string, Map<string, string>>();
const h = (k: string) => hashes.get(k) ?? hashes.set(k, new Map()).get(k)!;
const fake = {
  hget: jest.fn(async (k: string, f: string) => h(k).get(f) ?? null),
  hgetall: jest.fn(async (k: string) => Object.fromEntries(h(k))),
  hset: jest.fn(async (k: string, o: Record<string, string>) => {
    for (const [f, v] of Object.entries(o)) h(k).set(f, v);
    return 1;
  }),
  hsetnx: jest.fn(async (k: string, f: string, v: string) => {
    if (h(k).has(f)) return 0;
    h(k).set(f, v);
    return 1;
  }),
  hdel: jest.fn(async (k: string, f: string) => Number(h(k).delete(f))),
};
jest.mock("@/lib/redis", () => ({ getRedis: () => fake }));
jest.mock("@/lib/email", () => ({ sendEmail: jest.fn() }));
jest.mock("@/lib/auxr-pricing", () => ({ AUXR_GRAMS_PER_UNIT: {} }));
jest.mock("@/lib/auxr-onchain", () => ({}));
jest.mock("@/lib/auxr-reserve", () => ({}));
jest.mock("@/lib/balance-lock", () => ({}));
jest.mock("@/lib/auxr-role-watch", () => ({ EXPECTED_MINTER: "0xedc9163c5f8a2a76bd1cdda6baa4eb576b481070" }));

import {
  setAp, removeAp, addApSource, resolveApSource, listApSources, AP_SOURCE_COOLDOWN_MS,
} from "@/lib/auxr-ap";

const AP = "0x00000000000000000000000000000000000000a1";
const DEST = "0x00000000000000000000000000000000000000d1";
const SRC = "0x00000000000000000000000000000000000000c1";
const T0 = Date.parse("2026-11-03T00:00:00Z");

beforeEach(async () => {
  hashes.clear();
  await setAp({ address: AP, label: "LBANK MM", destination: DEST });
});

describe("AP redeem sources", () => {
  it("holds a new source in cooldown, then resolves it to the AP", async () => {
    const res = await addApSource(AP, SRC.toUpperCase().replace("0X", "0x"), T0);
    expect(res.ok).toBe(true);
    expect((await resolveApSource(SRC, T0 + 1000)).status).toBe("cooling_down");
    const live = await resolveApSource(SRC, T0 + AP_SOURCE_COOLDOWN_MS);
    expect(live.status).toBe("active");
    if (live.status === "active") expect(live.ap.address).toBe(AP);
  });

  it("never re-points or re-times an existing source", async () => {
    await addApSource(AP, SRC, T0);
    const other = "0x00000000000000000000000000000000000000a2";
    await setAp({ address: other, label: "Other", destination: "0x00000000000000000000000000000000000000d2" });
    expect(await addApSource(other, SRC, T0 + 5)).toEqual({ ok: false, error: "source_taken" });
    expect(await addApSource(AP, SRC, T0 + 5)).toEqual({ ok: false, error: "source_taken" });
    const s = await listApSources(AP);
    expect(s).toHaveLength(1);
    expect(s[0].addedAt).toBe(T0);
  });

  it("rejects the AP's exchange destination and unknown APs", async () => {
    expect(await addApSource(AP, DEST, T0)).toEqual({ ok: false, error: "source_is_destination" });
    expect(await addApSource("0x00000000000000000000000000000000000000ff", SRC, T0))
      .toEqual({ ok: false, error: "ap_not_found" });
  });

  it("refuses the admin Safe and the founder treasury as sources", async () => {
    for (const s of [
      "0xEdC9163c5f8A2a76BD1CdDa6BAA4Eb576B481070",
      "0x0a5dFC442Ba42a83f3f2F040025E1b4B0b625Fe3",
    ]) {
      expect(await addApSource(AP, s, T0)).toEqual({ ok: false, error: "source_protected" });
    }
  });

  it("never resolves a protected wallet stored before it was protected", async () => {
    const safe = "0xedc9163c5f8a2a76bd1cdda6baa4eb576b481070";
    h("auxr:ap:sources").set(safe, JSON.stringify({ source: safe, apAddress: AP, addedAt: 0, activeAt: 0 }));
    expect((await resolveApSource(safe, T0)).status).toBe("none");
  });

  it("drops an AP's sources when the AP is removed", async () => {
    await addApSource(AP, SRC, T0);
    await removeAp(AP);
    expect(await listApSources()).toHaveLength(0);
    expect((await resolveApSource(SRC, T0 + AP_SOURCE_COOLDOWN_MS)).status).toBe("none");
  });
});
