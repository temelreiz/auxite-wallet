// src/app/api/unsubscribe/route.ts
// Adds an email to email:suppressed Redis set so it is excluded from all
// future marketing/winback sends. Token-gated via HMAC so unsubscribe links
// can't be tampered with — but token is generated with a stable secret so
// the same email always produces the same token (sender + recipient symmetric).

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { timingSafeEqual } from "crypto";
import { SUPPRESSION_SET, unsubscribeToken } from "@/lib/email-suppression";

export const dynamic = "force-dynamic";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

function tokenValid(email: string, token: string): boolean {
  if (!token || token.length !== 16) return false;
  const expected = unsubscribeToken(email);
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

// POST: actually add the email to the suppression set
export async function POST(request: NextRequest) {
  let body: { email?: string; token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const email = (body.email || "").trim().toLowerCase();
  const token = body.token || "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }
  if (!tokenValid(email, token)) {
    return NextResponse.json({ error: "invalid token" }, { status: 403 });
  }

  await redis.sadd(SUPPRESSION_SET, email);
  await redis.set(`email:suppressed:${email}:at`, Date.now());

  return NextResponse.json({ success: true, email });
}

// GET: check whether an email is suppressed (used by sender scripts)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = (searchParams.get("email") || "").trim().toLowerCase();
  const token = searchParams.get("token") || "";

  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }
  if (!tokenValid(email, token)) {
    return NextResponse.json({ error: "invalid token" }, { status: 403 });
  }

  const isSuppressed = (await redis.sismember(SUPPRESSION_SET, email)) === 1;
  return NextResponse.json({ email, suppressed: isSuppressed });
}
