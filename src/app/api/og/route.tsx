import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
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
          background: "linear-gradient(135deg, #0B1420 0%, #0D1825 100%)",
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
            opacity: 0.4,
          }}
        />

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "40px",
            backgroundColor: "#121A2A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ color: "#3A4A5A", fontSize: 12, letterSpacing: 1 }}>
            vault.auxite.io
          </span>
        </div>

        {/* Logo circle */}
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: "50%",
            border: "1.5px solid rgba(191, 161, 129, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 28,
            background: "rgba(191, 161, 129, 0.06)",
          }}
        >
          <span
            style={{
              fontSize: 32,
              fontWeight: 600,
              color: "#BFA181",
              letterSpacing: 2,
            }}
          >
            Au
          </span>
        </div>

        {/* Brand */}
        <span
          style={{
            fontSize: 52,
            fontWeight: 300,
            color: "#BFA181",
            letterSpacing: 14,
            marginBottom: 16,
          }}
        >
          AUXITE
        </span>

        {/* Tagline */}
        <span
          style={{
            fontSize: 20,
            fontWeight: 400,
            color: "#8FA3B8",
            letterSpacing: 1.5,
            marginBottom: 20,
          }}
        >
          Institutional Precious Metal Custody
        </span>

        {/* Features */}
        <span
          style={{
            fontSize: 14,
            color: "#4A5E73",
            letterSpacing: 0.5,
            marginBottom: 28,
          }}
        >
          Fully Allocated · Segregated Storage · LBMA Approved Vaults
        </span>

        {/* Metal badges */}
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { label: "GOLD", color: "#D4A017" },
            { label: "SILVER", color: "#A8A9AD" },
            { label: "PLATINUM", color: "#7B8794" },
            { label: "PALLADIUM", color: "#B87333" },
          ].map((m) => (
            <div
              key={m.label}
              style={{
                padding: "6px 16px",
                borderRadius: 6,
                backgroundColor: `${m.color}15`,
                border: `1px solid ${m.color}30`,
                display: "flex",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: m.color,
                  letterSpacing: 1,
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
