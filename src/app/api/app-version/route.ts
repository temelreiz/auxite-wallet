import { NextResponse } from "next/server";

// Minimum required app version - update this when pushing breaking changes
const MIN_VERSION = "1.0.0";
const LATEST_VERSION = "1.0.0";

export async function GET() {
  return NextResponse.json({
    minVersion: MIN_VERSION,
    latestVersion: LATEST_VERSION,
    forceUpdate: false,
    message: "",
  });
}
