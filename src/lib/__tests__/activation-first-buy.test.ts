/**
 * First-buy activation: who is on which track, what the new emails promise, and
 * who counts as a real buyer in the funnel report.
 */
jest.mock("@/lib/metal-bonus-service", () => ({ BONUS_CONFIG: { enabled: false } }));

import { renderActivationEmail, activationPush } from "@/lib/activation-content";
import { SCHEDULES, isFunnelExcluded, recordCardStep, trackOf, whyToken, whyUrl } from "@/lib/activation-funnel";

describe("trackOf", () => {
  it("puts an account with no KYC on the first-buy track from its sign-up date", () => {
    expect(trackOf(null, "1700000000000")).toEqual({ track: "first_buy", since: 1700000000000 });
    expect(trackOf({ status: "none" }, 1700000000000)).toEqual({ track: "first_buy", since: 1700000000000 });
    expect(trackOf(null, "2026-11-01T00:00:00.000Z")?.since).toBe(Date.parse("2026-11-01T00:00:00.000Z"));
  });

  it("leaves an account with no sign-up date out of scope", () => {
    expect(trackOf(null, undefined)?.since).toBe(0);
  });

  it("keeps the existing tracks and skips other KYC states", () => {
    expect(trackOf({ status: "pending", createdAt: 5 }, 1)?.track).toBe("kyc_finish");
    expect(trackOf({ status: "approved", updatedAt: 5 }, 1)?.track).toBe("deposit");
    expect(trackOf({ status: "rejected" }, 1)).toBeNull();
    expect(trackOf({ status: "under_review" }, 1)).toBeNull();
  });
});

describe("schedules", () => {
  it("sends first_buy on day 1 and the survey on day 10", () => {
    expect(SCHEDULES.first_buy).toEqual([{ stage: "first_buy", day: 1 }, { stage: "why_stopped", day: 10 }]);
  });

  it("asks people stuck at verification only after their last reminder", () => {
    const stages = SCHEDULES.kyc_finish.map((s) => s.stage);
    expect(stages[stages.length - 1]).toBe("why_stopped");
    expect(SCHEDULES.kyc_finish[3].day).toBeGreaterThan(SCHEDULES.kyc_finish[2].day);
  });
});

describe("first_buy email", () => {
  it.each(["en", "tr", "ar"])("states limits and risk and offers no bonus in %s", (lang) => {
    const { html } = renderActivationEmail("first_buy", lang, "https://x/unsub");
    expect(html).toContain("500");
    expect(html).toContain("7");
    expect(html).toContain("LBMA");
    expect(html).toContain("https://vault.auxite.io/fund-vault");
    expect(html).not.toMatch(/match|bonus|مكافأة/i);
  });

  it("carries the risk notice", () => {
    expect(renderActivationEmail("first_buy", "en", "https://x/unsub").html).toContain("Unregulated. Value can go down as well as up.");
  });

  it("opens the Buy tab from push", () => {
    expect(activationPush("first_buy", "en").screen).toBe("/(tabs)/allocate");
  });
});

describe("why_stopped email", () => {
  it("links to the signed survey page", () => {
    const link = whyUrl("A@B.com", "tr");
    expect(link).toContain(`token=${whyToken("a@b.com")}`);
    const { html, subject } = renderActivationEmail("why_stopped", "tr", "https://x/unsub", link);
    expect(subject).toBe("Kısa bir soru");
    expect(html).toContain(link);
  });
});

describe("funnel helpers", () => {
  const OLD = process.env.FUNNEL_EXCLUDE_EMAILS;
  afterEach(() => { process.env.FUNNEL_EXCLUDE_EMAILS = OLD; });

  it("excludes internal and listed accounts only", () => {
    process.env.FUNNEL_EXCLUDE_EMAILS = "tester@gmail.com, Other@x.com";
    expect(isFunnelExcluded("bs@auxite.io")).toBe(true);
    expect(isFunnelExcluded("TESTER@gmail.com")).toBe(true);
    expect(isFunnelExcluded("other@x.com")).toBe(true);
    expect(isFunnelExcluded("buyer@gmail.com")).toBe(false);
  });

  it("records only the first time and never throws into a payment", async () => {
    const zadd = jest.fn(async () => 1);
    await recordCardStep({ zadd } as any, "paid", "0xABC");
    expect(zadd).toHaveBeenCalledWith("activation:card:paid", { nx: true }, expect.objectContaining({ member: "0xabc" }));

    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const failing = { zadd: jest.fn(async () => { throw new Error("down"); }) };
    await expect(recordCardStep(failing as any, "paid", "0xabc")).resolves.toBeUndefined();
  });
});
