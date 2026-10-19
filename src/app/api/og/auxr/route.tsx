// GET /api/og/auxr — 1200×630 share card for /auxr with the live NAV.
// Cached 5 min at the edge: X and others fetch the card once per post, so
// the number is "NAV when shared", which the timestamp on the card says.

import { readFile } from "fs/promises";
import path from "path";
import { ImageResponse } from "next/og";
import { getAuxrPricing } from "@/lib/auxr-pricing";

export const runtime = "nodejs";
export const revalidate = 300;

const GOLD = "#BFA181";

export async function GET() {
  let nav: number | null = null;
  let ts = Date.now();
  try {
    const p = await getAuxrPricing();
    // ts=0 is the hardcoded fallback — never print that as a live price.
    if (p.timestamp > 0) {
      nav = p.navUSD;
      ts = p.timestamp;
    }
  } catch {
    nav = null;
  }
  const icon = await readFile(path.join(process.cwd(), "public", "auxr_icon.png"));
  const iconSrc = `data:image/png;base64,${icon.toString("base64")}`;
  const when = new Date(ts).toISOString().slice(0, 16).replace("T", " ") + " UTC";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px 48px",
          background: "linear-gradient(135deg, #0B1420 0%, #0D1825 50%, #0F1C2E 100%)",
          color: "#E6DFD0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <img src={iconSrc} width={88} height={88} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 44, fontWeight: 600, letterSpacing: 2 }}>AUXR</span>
            <span style={{ fontSize: 22, color: "#8A9AAD", letterSpacing: 1 }}>Auxite Reserve · ERC-20 on Base</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 24, color: GOLD, letterSpacing: 4 }}>NET ASSET VALUE PER AUXR</span>
          <span style={{ fontSize: 132, fontWeight: 600, letterSpacing: -2, lineHeight: 1.1 }}>
            {nav != null ? `$${nav.toFixed(2)}` : "Live NAV"}
          </span>
          <span style={{ fontSize: 26, color: "#8A9AAD" }}>
            55% gold · 30% silver · 10% platinum · 5% palladium, at global spot
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "#4A5E73" }}>
          <span>{nav != null ? `As of ${when}` : "vault.auxite.io/auxr"}</span>
          <span>vault.auxite.io/auxr</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
