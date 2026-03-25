import { NextResponse } from "next/server";

// Minimum required app version - update this when pushing breaking changes
const MIN_VERSION = "1.0.0"; // Users below this MUST update (force update)
const LATEST_VERSION = "1.2.0"; // Latest available version

export async function GET() {
  return NextResponse.json({
    minVersion: MIN_VERSION,
    latestVersion: LATEST_VERSION,
    forceUpdate: false,
    message: "New version available with improved vault experience and trust features.",
  });
}
