import { NextResponse } from "next/server";

// Platform-aware minimum version.
//
// Android: 1.3.0 builds (codes 121/126/130) carry a React Native
// JavascriptException that accounts for ~85% of all crashes (Play vitals).
// 1.4.0 is healthy and live on Play, so we hard-force every pre-1.4.0 Android
// user to update via UpdateChecker's non-dismissable modal.
//
// iOS: there is NO such crash, and the FIRST App Store release is 1.3.0. A
// global 1.4.0 floor force-updated the build under App Review to a version that
// does not exist on the App Store, blocking review (Guideline 2.1a). iOS must
// therefore never be force-updated below the shipping store build.
//
// The mobile client sends its platform in the `X-Client-Platform` header
// (Platform.OS → "ios" | "android"), so we branch on it.
const ANDROID_MIN = "1.4.0";
const ANDROID_LATEST = "1.4.0";
const IOS_MIN = "1.0.0"; // never hard-force iOS below the shipping store build
const IOS_LATEST = "1.3.0"; // current iOS App Store version

export async function GET(req: Request) {
  const platform = (req.headers.get("x-client-platform") || "").toLowerCase();
  const isIOS = platform === "ios";
  return NextResponse.json({
    minVersion: isIOS ? IOS_MIN : ANDROID_MIN,
    latestVersion: isIOS ? IOS_LATEST : ANDROID_LATEST,
    forceUpdate: false,
    message: "A new version of Auxite Vault is available with stability fixes.",
  });
}
