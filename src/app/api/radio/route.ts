// GET /api/radio?lang=en|de|ar → the current radio script (text) for display.
import { NextRequest, NextResponse } from "next/server";
import { getRadioScript, RADIO_LANGS, type RadioLang } from "@/lib/radio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const lp = new URL(request.url).searchParams.get("lang") as RadioLang;
  const lang: RadioLang = RADIO_LANGS.includes(lp) ? lp : "en";
  const origin = new URL(request.url).origin;
  try {
    const { script, cached } = await getRadioScript(lang, origin);
    return NextResponse.json({ success: true, lang, script, cached });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "radio failed" }, { status: 500 });
  }
}
