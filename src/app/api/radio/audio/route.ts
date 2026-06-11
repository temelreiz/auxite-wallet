// GET /api/radio/audio?lang=en|de|ar → MP3 of the current radio broadcast.
import { NextRequest, NextResponse } from "next/server";
import { getRadioAudio, RADIO_LANGS, type RadioLang } from "@/lib/radio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const lp = new URL(request.url).searchParams.get("lang") as RadioLang;
  const lang: RadioLang = RADIO_LANGS.includes(lp) ? lp : "en";
  const origin = new URL(request.url).origin;

  const res = await getRadioAudio(lang, origin);
  if ("error" in res) {
    return NextResponse.json({ success: false, error: res.error }, { status: 502 });
  }
  return new NextResponse(res.mp3, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(res.mp3.length),
      "Cache-Control": "public, max-age=1800",
      "X-Radio-Cached": String(res.cached),
    },
  });
}
