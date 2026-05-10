// src/app/api/wise/account-details/route.ts
//
// Public endpoint returning Wise receiving-account details for all
// configured currencies. Used by both web (BankWirePanel) and mobile
// (BankWireModal) — single source of truth.
//
// Env-gated per currency: a currency only appears in the response when
// the minimum required fields are set (IBAN for IBAN-rail currencies,
// account+routing for ACH/SWIFT-rail currencies). This lets us add new
// Wise balances by setting env vars — no code change needed.
//
// Currency rail conventions:
//   USD   — ACH (account + routing) + Fedwire SWIFT
//   EUR   — IBAN + SWIFT
//   GBP   — UK sort code + account number
//   HKD   — HK bank code + account number
//   TRY   — IBAN
//   AUD   — BSB + account number
//
// Read from server-side env (NEXT_PUBLIC_WISE_*) — same vars the web UI
// historically read. Mobile fetches on-demand to avoid bundling env values
// (rotation needs only env update + redeploy, no app rebuild).

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
  sortCode?: string | null;
  bsb?: string | null;
  bankCode?: string | null;
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

  // Currency builders. Each returns null when its required fields are missing
  // so the response only advertises actually-configured currencies.
  const accounts: Record<string, AccountDetails> = {};

  const usdAcct = readEnv("NEXT_PUBLIC_WISE_USD_ACCOUNT");
  const usdRouting = readEnv("NEXT_PUBLIC_WISE_USD_ROUTING");
  if (usdAcct && usdRouting) {
    accounts.USD = {
      beneficiary,
      beneficiaryAddress,
      bankName: readEnv("NEXT_PUBLIC_WISE_USD_BANK_NAME") || "Wise (Community Federal Savings Bank)",
      bankAddress: readEnv("NEXT_PUBLIC_WISE_USD_BANK_ADDRESS"),
      accountNumber: usdAcct,
      routingNumber: usdRouting,
      swift: readEnv("NEXT_PUBLIC_WISE_USD_SWIFT"),
    };
  }

  const eurIban = readEnv("NEXT_PUBLIC_WISE_EUR_IBAN");
  if (eurIban) {
    accounts.EUR = {
      beneficiary,
      beneficiaryAddress,
      bankName: readEnv("NEXT_PUBLIC_WISE_EUR_BANK_NAME") || "Wise Europe SA",
      bankAddress: readEnv("NEXT_PUBLIC_WISE_EUR_BANK_ADDRESS"),
      iban: eurIban,
      swift: readEnv("NEXT_PUBLIC_WISE_EUR_SWIFT"),
    };
  }

  const gbpAcct = readEnv("NEXT_PUBLIC_WISE_GBP_ACCOUNT");
  const gbpSort = readEnv("NEXT_PUBLIC_WISE_GBP_SORT_CODE");
  const gbpIban = readEnv("NEXT_PUBLIC_WISE_GBP_IBAN");
  if ((gbpAcct && gbpSort) || gbpIban) {
    accounts.GBP = {
      beneficiary,
      beneficiaryAddress,
      bankName: readEnv("NEXT_PUBLIC_WISE_GBP_BANK_NAME") || "Wise Payments Limited",
      bankAddress: readEnv("NEXT_PUBLIC_WISE_GBP_BANK_ADDRESS"),
      accountNumber: gbpAcct,
      sortCode: gbpSort,
      iban: gbpIban,
      swift: readEnv("NEXT_PUBLIC_WISE_GBP_SWIFT"),
    };
  }

  const hkdAcct = readEnv("NEXT_PUBLIC_WISE_HKD_ACCOUNT");
  const hkdBankCode = readEnv("NEXT_PUBLIC_WISE_HKD_BANK_CODE");
  if (hkdAcct && hkdBankCode) {
    accounts.HKD = {
      beneficiary,
      beneficiaryAddress,
      bankName: readEnv("NEXT_PUBLIC_WISE_HKD_BANK_NAME") || "Wise Hong Kong",
      bankAddress: readEnv("NEXT_PUBLIC_WISE_HKD_BANK_ADDRESS"),
      accountNumber: hkdAcct,
      bankCode: hkdBankCode,
      swift: readEnv("NEXT_PUBLIC_WISE_HKD_SWIFT"),
    };
  }

  const tryIban = readEnv("NEXT_PUBLIC_WISE_TRY_IBAN");
  if (tryIban) {
    accounts.TRY = {
      beneficiary,
      beneficiaryAddress,
      bankName: readEnv("NEXT_PUBLIC_WISE_TRY_BANK_NAME") || "Wise",
      bankAddress: readEnv("NEXT_PUBLIC_WISE_TRY_BANK_ADDRESS"),
      iban: tryIban,
      swift: readEnv("NEXT_PUBLIC_WISE_TRY_SWIFT"),
    };
  }

  const audAcct = readEnv("NEXT_PUBLIC_WISE_AUD_ACCOUNT");
  const audBsb = readEnv("NEXT_PUBLIC_WISE_AUD_BSB");
  if (audAcct && audBsb) {
    accounts.AUD = {
      beneficiary,
      beneficiaryAddress,
      bankName: readEnv("NEXT_PUBLIC_WISE_AUD_BANK_NAME") || "Wise Australia Pty Ltd",
      bankAddress: readEnv("NEXT_PUBLIC_WISE_AUD_BANK_ADDRESS"),
      accountNumber: audAcct,
      bsb: audBsb,
      swift: readEnv("NEXT_PUBLIC_WISE_AUD_SWIFT"),
    };
  }

  return NextResponse.json({
    success: true,
    accounts,
    currencies: Object.keys(accounts),
    referenceFormat: "AUX-{6 hex chars from wallet address}",
    referenceNote: "MUST be included in the wire memo for auto-credit",
    processingTimeBusinessDays: "1-3",
  });
}
