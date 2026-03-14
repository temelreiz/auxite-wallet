import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

const WATCHER_URL = process.env.ORACLE_WATCHER_URL || process.env.NEXT_PUBLIC_ORACLE_WATCHER_URL || "";

export async function GET(req: NextRequest) {
  if (!WATCHER_URL) {
    return NextResponse.json({ error: "ORACLE_WATCHER_URL not configured" }, { status: 500 });
  }

  const path = req.nextUrl.searchParams.get("path") || "/status";
  const url = `${WATCHER_URL}${path}`;

  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) return auth.response!;

    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  if (!WATCHER_URL) {
    return NextResponse.json({ error: "ORACLE_WATCHER_URL not configured" }, { status: 500 });
  }

  const path = req.nextUrl.searchParams.get("path") || "";
  const url = `${WATCHER_URL}${path}`;

  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) return auth.response!;

    const body = await req.json().catch(() => null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!WATCHER_URL) {
    return NextResponse.json({ error: "ORACLE_WATCHER_URL not configured" }, { status: 500 });
  }

  const path = req.nextUrl.searchParams.get("path") || "";
  const url = `${WATCHER_URL}${path}`;

  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) return auth.response!;

    const res = await fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
