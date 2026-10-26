// src/app/api/auth/link-wallet/route.ts
//
// Disabled. This route bound ANY wallet address to the caller's account with
// no proof of ownership (no signature) and returned a fresh JWT carrying that
// address. API identity is the JWT's walletAddress, so it was an account
// takeover for every address without a `wallet:` mapping. No client calls it.
// Rebuild it with a signed-message ownership proof before bringing it back
// (previous implementation: git history before this commit).

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ success: false, error: 'Not available' }, { status: 410 });
}
