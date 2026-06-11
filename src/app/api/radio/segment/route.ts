// GET /api/radio/segment?lang=en        → MP3 of the current scheduled segment
// GET /api/radio/segment?lang=en&meta=1  → { type, title } (for the now-playing label)
import { NextRequest, NextResponse } from "next/server";
import { getSegmentAudio, currentSegment, RADIO_LANGS, type RadioLang } from "@/lib/radio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const lp = sp.get("lang") as RadioLang;
  const lang: RadioLang = RADIO_LANGS.includes(lp) ? lp : "en";

  if (sp.get("meta") === "1") {
    const seg = currentSegment();
    return NextResponse.json({ success: true, type: seg.type, title: seg.title, topic: seg.topic ?? null });
  }

  const res = await getSegmentAudio(lang, new URL(request.url).origin);
  if ("error" in res) return NextResponse.json({ success: false, error: res.error }, { status: 502 });

  const body = new Uint8Array(res.mp3);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(body.length),
      "Cache-Control": "public, max-age=600",
    },
  });
}
