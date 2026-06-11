// Keeps the Auxite Radio music bed warm: regenerates the "current" Mubert track
// per mood every few minutes so the first listener doesn't wait on generation.
import { NextRequest, NextResponse } from "next/server";
import { getMusicUrl, MOODS, type Mood } from "@/lib/mubert";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const SECRET = process.env.CRON_SECRET || "";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (SECRET && auth !== `Bearer ${SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const out: Record<string, boolean> = {};
  // Warm the default mood (chill) primarily; others on demand.
  for (const mood of ["chill"] as Mood[]) {
    const url = await getMusicUrl(mood, true).catch(() => null);
    out[mood] = !!url;
  }
  return NextResponse.json({ success: true, warmed: out });
}
