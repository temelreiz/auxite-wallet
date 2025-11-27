import { NextResponse } from "next/server";
import { METALS } from "@/lib/metals";

const API_BASE = "https://api.auxite.io/api/prices";

const API_SYMBOL_BY_ID: Record<string, string> = {
  AUXG: "XAU",
  AUXS: "XAG",
  AUXPT: "XPT",
  AUXPD: "XPD",
};

export async function GET() {
  try {
    // Auxite fiyat API'sinden fiyatları çekiyoruz
    const res = await fetch(`${API_BASE}?chain=84532`, {
      cache: "no-cache",
    });

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: "api_fetch_error" });
    }

    const json = await res.json();

    // UI'ın istediği format:
    const metals = METALS.map((m) => {
      const priceObj = json.data.find((p: any) => p.symbol === m.id);

      return {
        id: m.id,
        symbol: m.symbol,
        name: m.name,
        priceOz: priceObj?.price ?? null,
        ts: priceObj?.ts ?? null,
      };
    });

    return NextResponse.json({
      ok: true,
      data: metals,
      updatedAt: json.updatedAt,
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err.message || "unknown_error",
    });
  }
}
