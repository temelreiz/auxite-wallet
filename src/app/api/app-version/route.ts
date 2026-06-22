import { NextResponse } from "next/server";

// Minimum required app version - update this when pushing breaking changes.
// Bumped to 1.4.0 (2026-06-22): all 1.3.0 builds (codes 121/126/130) carry a
// React Native JavascriptException that accounts for ~85% of all crashes
// (Play vitals). 1.4.0 is healthy and live in production, so we hard-force every
// pre-1.4.0 user to update via UpdateChecker's non-dismissable modal.
const MIN_VERSION = "1.4.0"; // Users below this MUST update (force update)
const LATEST_VERSION = "1.4.0"; // Latest available version

export async function GET() {
  return NextResponse.json({
    minVersion: MIN_VERSION,
    latestVersion: LATEST_VERSION,
    forceUpdate: false,
    message: "A new version of Auxite Vault is available with stability fixes.",
  });
}
