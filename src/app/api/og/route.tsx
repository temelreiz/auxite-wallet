import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  // Fetch the logo from public folder
  const logoUrl = new URL("/auxite.png", request.url);
  const logoData = await fetch(logoUrl).then((res) => res.arrayBuffer());
  const logoBase64 = `data:image/png;base64,${Buffer.from(logoData).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0B1420 0%, #0D1825 50%, #0F1C2E 100%)",
          position: "relative",
        }}
      >
        {/* Top gold accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: "linear-gradient(90deg, transparent, #BFA181, transparent)",
            opacity: 0.5,
          }}
        />

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "44px",
            backgroundColor: "#0A1018",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderTop: "1px solid rgba(191, 161, 129, 0.1)",
          }}
        >
          <span style={{ color: "#4A5E73", fontSize: 13, letterSpacing: 2, fontWeight: 400 }}>
            vault.auxite.io
          </span>
        </div>

        {/* Auxite Logo */}
        <img
          src={logoBase64}
          width={120}
          height={108}
          style={{
            marginBottom: 32,
          }}
        />

        {/* Brand */}
        <span
          style={{
            fontSize: 48,
            fontWeight: 300,
            color: "#BFA181",
            letterSpacing: 16,
            marginBottom: 24,
          }}
        >
          AUXITE
        </span>

        {/* Divider */}
        <div
          style={{
            width: 80,
            height: 1,
            background: "linear-gradient(90deg, transparent, #BFA181, transparent)",
            marginBottom: 24,
            opacity: 0.6,
          }}
        />

        {/* Title */}
        <span
          style={{
            fontSize: 22,
            fontWeight: 500,
            color: "#D4CBB8",
            letterSpacing: 1.2,
            marginBottom: 14,
            textAlign: "center",
          }}
        >
          Institutional Access to Fully Allocated Precious Metals
        </span>

        {/* Description */}
        <span
          style={{
            fontSize: 15,
            fontWeight: 400,
            color: "#6B7F94",
            letterSpacing: 2,
            marginBottom: 36,
            textAlign: "center",
          }}
        >
          Secure ownership · Independent custody · Institutional execution
        </span>

        {/* Metal badges */}
        <div style={{ display: "flex", gap: 14 }}>
          {[
            { label: "GOLD", color: "#D4A017" },
            { label: "SILVER", color: "#A8A9AD" },
            { label: "PLATINUM", color: "#7B8794" },
            { label: "PALLADIUM", color: "#B87333" },
          ].map((m) => (
            <div
              key={m.label}
              style={{
                padding: "7px 18px",
                borderRadius: 6,
                backgroundColor: `${m.color}12`,
                border: `1px solid ${m.color}25`,
                display: "flex",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: m.color,
                  letterSpacing: 1.5,
                }}
              >
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
