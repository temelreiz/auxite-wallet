// src/lib/demo-accounts.ts
// Single source of truth for test/demo accounts (App Store / Apple review,
// internal QA) whose balances are LOADED for review — not real users. They are
// excluded from on-chain mint reconciliation (rwa-mint-sync) AND hidden from the
// admin Users list. Extend the list via the RWA_SYNC_EXCLUDE env var
// (comma-separated, lower- or mixed-case addresses).

export const DEMO_ACCOUNTS = new Set(
  [
    "0x7cffdf3cda3350cc727049b0aba34af6dc6821ed", // App Store / Apple review demo account
    ...(process.env.RWA_SYNC_EXCLUDE || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ].map((a) => a.toLowerCase()),
);

export const isDemoAccount = (addr?: string | null): boolean =>
  !!addr && DEMO_ACCOUNTS.has(addr.toLowerCase());
