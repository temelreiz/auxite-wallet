// src/app/api/wise/account-details/route.ts
//
// Public endpoint returning Wise receiving-account details (USD + EUR)
// for display in user-facing wire deposit screens.
//
// These are PUBLIC bank account details (the same ones we show on the web
// page) — no auth required. Mobile fetches on-demand instead of bundling
// the values, which keeps the mobile app rebuild-free when account
// details change.
//
// Read from server-side env (NEXT_PUBLIC_WISE_*) — same vars the web UI
// reads. Returns null fields where unconfigured so the client can show a
// friendly placeholder.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface AccountDetails {
  beneficiary: string | null;
  beneficiaryAddress: string | null;
  bankName: string | null;
  bankAddress: string | null;
  iban?: string | null;
  accountNumber?: string | null;
  routingNumber?: string | null;
  swift?: string | null;
}

function readEnv(...keys: string[]): string | null {
  for (const k of keys) {
    const v = process.env[k];
    if (v && v.trim()) return v.trim();
  }
  return null;
}

export async function GET() {
  const beneficiary = readEnv("NEXT_PUBLIC_WISE_BENEFICIARY_NAME") || "Aurum Ledger Limited";
  const beneficiaryAddress = readEnv("NEXT_PUBLIC_WISE_BENEFICIARY_ADDRESS");

  const usd: AccountDetails = {
    beneficiary,
    beneficiaryAddress,
    bankName: readEnv("NEXT_PUBLIC_WISE_USD_BANK_NAME") || "Wise (Community Federal Savings Bank)",
    bankAddress: readEnv("NEXT_PUBLIC_WISE_USD_BANK_ADDRESS"),
    accountNumber: readEnv("NEXT_PUBLIC_WISE_USD_ACCOUNT"),
    routingNumber: readEnv("NEXT_PUBLIC_WISE_USD_ROUTING"),
    swift: readEnv("NEXT_PUBLIC_WISE_USD_SWIFT"),
  };

  const eur: AccountDetails = {
    beneficiary,
    beneficiaryAddress,
    bankName: readEnv("NEXT_PUBLIC_WISE_EUR_BANK_NAME") || "Wise Europe SA",
    bankAddress: readEnv("NEXT_PUBLIC_WISE_EUR_BANK_ADDRESS"),
    iban: readEnv("NEXT_PUBLIC_WISE_EUR_IBAN"),
    swift: readEnv("NEXT_PUBLIC_WISE_EUR_SWIFT"),
  };

  return NextResponse.json({
    success: true,
    accounts: { USD: usd, EUR: eur },
    referenceFormat: "AUX-{6 hex chars from wallet address}",
    referenceNote: "MUST be included in the wire memo for auto-credit",
    processingTimeBusinessDays: "1-3",
  });
}
