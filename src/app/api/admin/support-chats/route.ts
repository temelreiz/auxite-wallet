// src/app/api/admin/support-chats/route.ts
// Admin read access to AI support-widget transcripts + captured leads.
//
// GET            → newest-first list of transcript summaries
// GET ?leads=1   → only conversations where a user left an email
// GET ?id=<id>   → one full transcript
// DELETE ?id=<id> → erase one conversation (GDPR / cleanup)

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  listTranscripts,
  getTranscript,
  deleteTranscript,
} from "@/lib/support-chat-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response!;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (id) {
    const transcript = await getTranscript(id);
    if (!transcript) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ transcript });
  }

  const leadsOnly = url.searchParams.get("leads") === "1";
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  const { items, total } = await listTranscripts({ limit, offset, leadsOnly });
  return NextResponse.json({ items, total, leadsOnly });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response!;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await deleteTranscript(id);
  return NextResponse.json({ ok: true });
}
