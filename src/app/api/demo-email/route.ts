import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

// POST /api/demo-email — Save email from demo mode users
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // Store in a Redis set for demo emails + individual record with timestamp
    await redis.sadd("demo_emails", trimmed);
    await redis.hset(`demo_email:${trimmed}`, {
      email: trimmed,
      createdAt: new Date().toISOString(),
      source: "mobile_demo",
      converted: "false",
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[demo-email] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET /api/demo-email — List all demo emails (admin use)
export async function GET() {
  try {
    const emails = await redis.smembers("demo_emails");
    const details = await Promise.all(
      emails.map(async (email: string) => {
        const data = await redis.hgetall(`demo_email:${email}`);
        return data || { email };
      })
    );
    return NextResponse.json({ count: emails.length, emails: details });
  } catch (err: any) {
    console.error("[demo-email] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
