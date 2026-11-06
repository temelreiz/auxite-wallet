jest.mock("next/server", () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock("@/lib/security/require-user", () => ({ requireAdmin: jest.fn() }));
jest.mock("@/lib/procurement-service", () => ({
  PROCUREMENT_LISTS: ["pending", "converting", "purchasing", "completed", "failed", "manualReview"],
  listProcurementOrders: jest.fn(),
}));

import { GET } from "../route";
import { requireAdmin } from "@/lib/security/require-user";
import { listProcurementOrders } from "@/lib/procurement-service";

const mockAdmin = requireAdmin as jest.Mock;
const mockList = listProcurementOrders as jest.Mock;
const request = (query = "") => ({ url: `https://vault.test/api/admin/procurement-audit${query}` }) as any;

const order = (overrides: Record<string, unknown>) => ({
  id: "PROC-1",
  tradeId: "T-1",
  userAddress: "0xSECRET",
  fromToken: "ETH",
  fromAmount: 1,
  fromValueUSD: 100,
  metal: "AUXG",
  metalGrams: 2,
  tradePricePerGram: 50,
  status: "completed",
  statusHistory: [{ status: "completed", timestamp: 1, note: "done" }],
  retryCount: 0,
  createdAt: 1,
  ...overrides,
});

beforeEach(() => {
  delete process.env.KUVEYTTURK_BASE_URL;
  mockAdmin.mockReset().mockResolvedValue({ ok: true });
  mockList.mockReset().mockResolvedValue({ total: 0, orders: [] });
});

describe("/api/admin/procurement-audit", () => {
  it("refuses anyone without an admin session and reads nothing", async () => {
    mockAdmin.mockResolvedValue({ ok: false, response: { status: 401 } });
    expect(((await GET(request())) as any).status).toBe(401);
    expect(mockList).not.toHaveBeenCalled();
  });

  it("labels the bank environment, treating no URL as the test gateway", async () => {
    expect((await (await GET(request())).json()).bankEnvironment).toBe("test");
    process.env.KUVEYTTURK_BASE_URL = "https://prep-gateway.kuveytturk.com.tr";
    expect((await (await GET(request())).json()).bankEnvironment).toBe("test");
    process.env.KUVEYTTURK_BASE_URL = "https://gateway.kuveytturk.com.tr";
    expect((await (await GET(request())).json()).bankEnvironment).toBe("live");
  });

  it("summarizes each list and tells bank references from made-up ones", async () => {
    mockList.mockImplementation(async (list: string) =>
      list === "completed"
        ? {
            total: 5,
            orders: [
              order({
                ktPurchase: { referenceId: "EXEC-9", rateTLPerGram: 6000, totalTL: 12000, completedAt: 2 },
                cryptoConversion: { exchange: "htx", soldAmount: 1, receivedUSDT: 99, rate: 99, completedAt: 2 },
              }),
              order({ id: "PROC-2", ktPurchase: { referenceId: "KT-1793", rateTLPerGram: 1, totalTL: 1, completedAt: 2 } }),
              order({ id: "PROC-3", metal: "AUXS", metalGrams: 10 }),
            ],
          }
        : { total: 0, orders: [] },
    );

    const body = await (await GET(request())).json();
    const completed = body.lists.completed;
    expect(completed.total).toBe(5);
    expect(completed.returned).toBe(3);
    expect(completed.summary).toEqual({
      gramsByMetal: { AUXG: 4, AUXS: 10 },
      chargedUsd: 300,
      cryptoSales: 1,
      cryptoSaleUsdt: 99,
      references: { bank: 1, generated: 1, manual_pending: 0, none: 1 },
    });
    expect(completed.orders[0].bankPurchase.referenceKind).toBe("bank");
    expect(completed.orders[1].bankPurchase.referenceKind).toBe("generated");
    expect(completed.orders[2].bankPurchase).toBe(null);
    expect(body.lists.manualReview.total).toBe(0);
  });

  it("leaves the customer's address out", async () => {
    mockList.mockResolvedValue({ total: 1, orders: [order({})] });
    const text = JSON.stringify(await (await GET(request())).json());
    expect(text).not.toContain("0xSECRET");
  });

  it("caps the limit", async () => {
    await GET(request("?limit=99999"));
    expect(mockList).toHaveBeenCalledWith("completed", 1000);
    mockList.mockClear();
    await GET(request("?limit=abc"));
    expect(mockList).toHaveBeenCalledWith("completed", 200);
  });
});
