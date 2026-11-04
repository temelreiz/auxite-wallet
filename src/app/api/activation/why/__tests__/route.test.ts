/**
 * The survey link must be signed, and opening it must not count as an answer:
 * mail scanners follow every link in a message.
 */
const hset = jest.fn(async () => 1);
jest.mock("@upstash/redis", () => ({ Redis: { fromEnv: () => ({ hset: (...a: unknown[]) => (hset as any)(...a) }) } }));
jest.mock("@/lib/metal-bonus-service", () => ({ BONUS_CONFIG: { enabled: false } }));

jest.mock("next/server", () => ({
  NextRequest: class {},
  NextResponse: class {
    constructor(public html: string, public init: { status?: number }) {}
    get status() { return this.init.status ?? 200; }
  },
}));

import { GET, POST } from "../route";
import { whyToken } from "@/lib/activation-funnel";

type FakeResponse = { html: string; status: number };

const EMAIL = "buyer@example.com";
const get = (qs: string) => GET({ url: `http://x/api/activation/why?${qs}` } as any) as unknown as Promise<FakeResponse>;
const post = (fields: Record<string, string>) =>
  POST({ formData: async () => new Map(Object.entries(fields)) } as any) as unknown as Promise<FakeResponse>;

beforeEach(() => hset.mockClear());

describe("/api/activation/why", () => {
  it("shows the question without recording anything", async () => {
    const res = await get(`email=${encodeURIComponent(EMAIL)}&token=${whyToken(EMAIL)}&lang=tr`);
    expect(res.status).toBe(200);
    expect(res.html).toContain("Almanıza ne engel oldu?");
    expect(res.html).toContain('method="post"');
    expect(hset).not.toHaveBeenCalled();
  });

  it("refuses a wrong token", async () => {
    expect((await get(`email=${encodeURIComponent(EMAIL)}&token=0000000000000000`)).status).toBe(403);
    expect((await post({ email: EMAIL, token: "0000000000000000", reason: "trust" })).status).toBe(403);
    expect(hset).not.toHaveBeenCalled();
  });

  it("refuses an unknown reason", async () => {
    expect((await post({ email: EMAIL, token: whyToken(EMAIL), reason: "<script>" })).status).toBe(400);
    expect(hset).not.toHaveBeenCalled();
  });

  it("saves one answer per email", async () => {
    const res = await post({ email: EMAIL, token: whyToken(EMAIL), reason: "trust", lang: "en" });
    expect(res.status).toBe(200);
    expect(hset).toHaveBeenCalledWith("activation:why", { [EMAIL]: "trust" });
  });
});
