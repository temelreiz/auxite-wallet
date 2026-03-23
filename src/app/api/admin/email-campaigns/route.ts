// src/app/api/admin/email-campaigns/route.ts
// Admin email campaign management - list recipients, send bulk emails, campaign history

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/admin-auth";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const resend = new Resend(process.env.RESEND_API_KEY);

// ═══════════════════════════════════════════════════════════════════════════
// GET: List email recipients with filters
// ═══════════════════════════════════════════════════════════════════════════
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "recipients";

  try {
    if (action === "recipients") {
      // Get all registered users with email
      const authKeys = await redis.keys("auth:user:*");
      const recipients: any[] = [];

      for (const key of authKeys) {
        const data = await redis.hgetall(key) as any;
        if (!data?.email) continue;

        const addr = data.walletAddress || "";
        const kycData = addr ? await redis.get(`kyc:${addr}`) : null;
        const kyc = kycData ? (typeof kycData === "string" ? JSON.parse(kycData) : kycData) : null;

        recipients.push({
          email: data.email,
          name: data.name || "",
          walletAddress: addr,
          platform: data.platform || "unknown",
          kycStatus: kyc?.status || "none",
          createdAt: data.createdAt || 0,
          lastLogin: data.lastLogin || 0,
          language: data.language || "en",
        });
      }

      // Segment counts
      const segments = {
        all: recipients.length,
        kycVerified: recipients.filter(r => r.kycStatus === "approved").length,
        kycPending: recipients.filter(r => r.kycStatus === "pending").length,
        noKyc: recipients.filter(r => r.kycStatus === "none").length,
        mobile: recipients.filter(r => r.platform === "mobile").length,
        web: recipients.filter(r => r.platform === "web").length,
      };

      return NextResponse.json({
        success: true,
        recipients,
        segments,
        total: recipients.length,
      });
    }

    if (action === "history") {
      const campaigns = await redis.lrange("email:campaigns:log", 0, 49);
      const parsed = campaigns.map((c: any) => {
        try {
          return typeof c === "string" ? JSON.parse(c) : c;
        } catch { return c; }
      });

      return NextResponse.json({ success: true, campaigns: parsed });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[Email Campaigns] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST: Send bulk email campaign
// ═══════════════════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await request.json();
    const { subject, htmlContent, segment, testEmail } = body;

    if (!subject || !htmlContent) {
      return NextResponse.json({ error: "Subject and content required" }, { status: 400 });
    }

    // Test mode - send to single email
    if (testEmail) {
      const result = await resend.emails.send({
        from: "Auxite <noreply@auxite.io>",
        to: testEmail,
        subject: `[TEST] ${subject}`,
        html: htmlContent,
      });

      return NextResponse.json({
        success: true,
        test: true,
        result,
      });
    }

    // Get recipients based on segment
    const authKeys = await redis.keys("auth:user:*");
    const recipients: string[] = [];

    for (const key of authKeys) {
      const data = await redis.hgetall(key) as any;
      if (!data?.email) continue;

      const addr = data.walletAddress || "";
      let include = true;

      if (segment === "kycVerified") {
        const kycData = addr ? await redis.get(`kyc:${addr}`) : null;
        const kyc = kycData ? (typeof kycData === "string" ? JSON.parse(kycData) : kycData) : null;
        include = kyc?.status === "approved";
      } else if (segment === "kycPending") {
        const kycData = addr ? await redis.get(`kyc:${addr}`) : null;
        const kyc = kycData ? (typeof kycData === "string" ? JSON.parse(kycData) : kycData) : null;
        include = kyc?.status === "pending";
      } else if (segment === "noKyc") {
        const kycData = addr ? await redis.get(`kyc:${addr}`) : null;
        const kyc = kycData ? (typeof kycData === "string" ? JSON.parse(kycData) : kycData) : null;
        include = !kyc || kyc.status === "none";
      } else if (segment === "mobile") {
        include = data.platform === "mobile";
      } else if (segment === "web") {
        include = data.platform === "web";
      }

      if (include) {
        recipients.push(data.email);
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: "No recipients found for this segment" }, { status: 400 });
    }

    // Send emails in batches of 10
    let sent = 0;
    let failed = 0;
    const batchSize = 10;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const promises = batch.map(async (email) => {
        try {
          await resend.emails.send({
            from: "Auxite <noreply@auxite.io>",
            to: email,
            subject,
            html: htmlContent,
          });
          sent++;
        } catch (e: any) {
          console.error(`[Email Campaign] Failed to send to ${email}:`, e.message);
          failed++;
        }
      });

      await Promise.all(promises);

      // Small delay between batches to respect rate limits
      if (i + batchSize < recipients.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // Log campaign
    await redis.lpush("email:campaigns:log", JSON.stringify({
      subject,
      segment: segment || "all",
      totalRecipients: recipients.length,
      sent,
      failed,
      sentBy: "admin",
      timestamp: Date.now(),
    }));
    await redis.ltrim("email:campaigns:log", 0, 99);

    return NextResponse.json({
      success: true,
      sent,
      failed,
      totalRecipients: recipients.length,
    });
  } catch (error: any) {
    console.error("[Email Campaign] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
