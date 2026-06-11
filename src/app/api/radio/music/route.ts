// GET /api/radio/music?mood=chill|calm|focus
// Redirects to a fresh Mubert music-bed track (clean, token-free MP3 URL).
// The widget calls this for each track and loops for a continuous music bed.
import { NextRequest, NextResponse } from "next/server";
import { getMusicUrl, MOODS, type Mood } from "@/lib/mubert";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const mp = new URL(request.url).searchParams.get("mood") || "chill";
  const mood: Mood = (mp in MOODS ? mp : "chill") as Mood;
  const json = new URL(request.url).searchParams.get("format") === "json";

  const url = await getMusicUrl(mood);
  if (!url) {
    return NextResponse.json({ success: false, error: "music unavailable" }, { status: 502 });
  }
  if (json) return NextResponse.json({ success: true, mood, url });
  return NextResponse.redirect(url, 302);
}
