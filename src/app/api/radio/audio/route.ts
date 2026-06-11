// GET /api/radio/audio?lang=en|de|ar → MP3 of the current radio broadcast.
import { NextRequest, NextResponse } from "next/server";
import { getRadioAudio, getWelcomeAudio, getStaticClip, getQuickUpdate, RADIO_LANGS, type RadioLang } from "@/lib/radio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const lp = sp.get("lang") as RadioLang;
  const lang: RadioLang = RADIO_LANGS.includes(lp) ? lp : "en";
  const origin = new URL(request.url).origin;

  const kind = sp.get("kind");
  const res = kind === "welcome" ? await getWelcomeAudio(lang)
    : kind === "stationid" ? await getStaticClip("stationid", lang)
    : kind === "quick" ? await getQuickUpdate(lang, origin)
    : await getRadioAudio(lang, origin);
  if ("error" in res) {
    return NextResponse.json({ success: false, error: res.error }, { status: 502 });
  }
  const body = new Uint8Array(res.mp3);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(body.length),
      "Cache-Control": "public, max-age=1800",
      "X-Radio-Cached": String((res as any).cached ?? true),
    },
  });
}
