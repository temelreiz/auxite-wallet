jest.mock("next/server", () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

import { GET, POST } from "../route";
import { requireAdmin } from "@/lib/security/require-user";

jest.mock("@/lib/security/require-user", () => ({ requireAdmin: jest.fn() }));

const mockAdmin = requireAdmin as jest.Mock;
const fetchMock = jest.fn();

function engineReply(body: unknown, status = 200) {
  return { status, json: async () => body };
}

const post = (body: unknown) => POST({ json: async () => body } as any) as any;
const get = () => GET({} as any) as any;

beforeEach(() => {
  process.env.PARTNERS_ENGINE_ADMIN_KEY = "engine-key";
  process.env.PARTNERS_ENGINE_URL = "https://engine.test";
  mockAdmin.mockResolvedValue({ ok: true, user: { token: "t" } });
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe("/api/admin/partners", () => {
  it("refuses anyone without an admin session and never calls the engine", async () => {
    mockAdmin.mockResolvedValue({ ok: false, response: { status: 401 } });
    expect((await get()).status).toBe(401);
    expect((await post({ action: "halt", partnerId: "xyz" })).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("combines overview, orders and certificates using the server-side key", async () => {
    fetchMock.mockImplementation(async (url: string) => engineReply({ url }));
    const res = await get();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.overview.url).toBe("https://engine.test/admin/overview");
    expect(body.orders.url).toContain("/admin/orders");
    expect(body.certificates.url).toContain("/admin/certificates");
    expect(body.applications.url).toContain("/admin/applications");
    expect(body.fiatOrders.url).toContain("/admin/fiat-orders");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer engine-key");
  });

  it("never returns the engine key to the browser", async () => {
    fetchMock.mockImplementation(async () => engineReply({ ok: true }));
    expect(JSON.stringify(await (await get()).json())).not.toContain("engine-key");
  });

  it("maps halt and resume to the engine's stop switch", async () => {
    fetchMock.mockImplementation(async () => engineReply({ id: "xyz" }));
    await post({ action: "halt", partnerId: "xyz" });
    await post({ action: "resume", partnerId: "xyz" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://engine.test/admin/partners/xyz/halt");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ halted: true });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ halted: false });
  });

  it("forwards spread and add, and passes the engine's errors back", async () => {
    fetchMock.mockImplementation(async () => engineReply({ error: "invalid_spread" }, 400));
    const spread = await post({ action: "spread", partnerId: "xyz", spreadBps: 10 });
    expect(spread.status).toBe(400);
    expect((await spread.json()).error).toBe("invalid_spread");
    expect(fetchMock.mock.calls[0][0]).toContain("/admin/partners/xyz/spread");

    fetchMock.mockImplementation(async () => engineReply({ apiKey: "axp_new" }, 201));
    const added = await post({ action: "add", id: "abc", wallet: "0x1", brand: "ABC" });
    expect(added.status).toBe(201);
    expect(fetchMock.mock.calls[1][0]).toBe("https://engine.test/admin/partners");
  });

  it("maps approve and reject to the application routes", async () => {
    fetchMock.mockImplementation(async () => engineReply({ status: "approved" }));
    await post({ action: "approve", wallet: "0xabc" });
    await post({ action: "reject", wallet: "0xabc", note: "Missing documents" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://engine.test/admin/applications/0xabc/approve");
    expect(fetchMock.mock.calls[1][0]).toBe("https://engine.test/admin/applications/0xabc/reject");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ note: "Missing documents" });
  });

  it("forwards a confirmed transfer with its amount and bank reference", async () => {
    fetchMock.mockImplementation(async () => engineReply({ status: "delivered" }));
    await post({ action: "fiat-confirm", reference: "AXP1", amountTry: "60000", bankReference: "B1", extra: "ignored" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://engine.test/admin/fiat-orders/AXP1/confirm");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ amountTry: "60000", bankReference: "B1" });
    await post({ action: "fiat-retry", reference: "AXP1" });
    await post({ action: "fiat-cancel", reference: "AXP1" });
    expect(fetchMock.mock.calls[1][0]).toContain("/AXP1/retry");
    expect(fetchMock.mock.calls[2][0]).toContain("/AXP1/cancel");
  });

  it("can't be steered to another engine path through the partner id", async () => {
    fetchMock.mockImplementation(async () => engineReply({}));
    await post({ action: "halt", partnerId: "../../overview" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://engine.test/admin/partners/..%2F..%2Foverview/halt");
  });

  it("refuses unknown actions without calling the engine", async () => {
    expect((await post({ action: "drain" })).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers 503 when the key is missing or the engine is down", async () => {
    delete process.env.PARTNERS_ENGINE_ADMIN_KEY;
    expect((await get()).status).toBe(503);
    process.env.PARTNERS_ENGINE_ADMIN_KEY = "engine-key";
    fetchMock.mockRejectedValue(new Error("connect refused"));
    const res = await post({ action: "halt", partnerId: "xyz" });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("engine_unavailable");
  });
});
