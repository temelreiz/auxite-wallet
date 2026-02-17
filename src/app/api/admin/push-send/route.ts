/**
 * Admin Push Send API
 * Sends push notifications to specific user or broadcasts to all
 * Uses both web push (VAPID) and mobile push (Expo)
 */

import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { sendPushToUser, broadcastPush } from "@/lib/expo-push";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Admin auth check
    const auth = request.headers.get("authorization");
    if (auth !== "Bearer auxite-admin-2024") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { walletAddress, title, body: messageBody, type, data, broadcast } = body;

    if (!title || !messageBody) {
      return NextResponse.json(
        { error: "title and body are required" },
        { status: 400 }
      );
    }

    let mobileSent = 0;
    let mobileFailed = 0;
    let webSent = 0;
    let webFailed = 0;
    let recipients = 0;

    const channelId =
      type === "security" ? "security" : type === "trade" ? "trades" : "default";

    if (broadcast) {
      // Broadcast to all registered mobile users
      const result = await broadcastPush(title, messageBody, {
        type,
        category: type,
        ...data,
      });
      mobileSent = result.totalSent;
      mobileFailed = result.totalFailed;
      recipients = result.userCount;

      // Also try web push to all known subscriptions
      // (web push broadcast would need iteration over all web subscriptions)
      // For now, mobile-only broadcast
    } else if (walletAddress) {
      // Send to specific user
      const mobileResult = await sendPushToUser(
        walletAddress,
        title,
        messageBody,
        { type, category: type, ...data },
        { channelId, priority: "high" }
      );
      mobileSent = mobileResult.sent;
      mobileFailed = mobileResult.failed;
      recipients = 1;

      // Try web push too
      try {
        const webpush = require("web-push");
        if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
          webpush.setVapidDetails(
            process.env.VAPID_SUBJECT || "mailto:info@auxite.com",
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
          );

          const subsData = await redis.get(
            `push:subscriptions:${walletAddress.toLowerCase()}`
          );
          if (subsData) {
            const subs =
              typeof subsData === "string" ? JSON.parse(subsData) : subsData;
            for (const sub of subs) {
              try {
                await webpush.sendNotification(
                  { endpoint: sub.endpoint, keys: sub.keys },
                  JSON.stringify({
                    title,
                    body: messageBody,
                    icon: "/icon-192.png",
                    tag: type || "general",
                    data: { type, ...data },
                  })
                );
                webSent++;
              } catch {
                webFailed++;
              }
            }
          }
        }
      } catch {
        // Web push not configured, skip
      }
    } else {
      return NextResponse.json(
        { error: "walletAddress or broadcast=true required" },
        { status: 400 }
      );
    }

    // Log the notification
    await redis.lpush(
      "notifications:log",
      JSON.stringify({
        type: type || "system",
        title,
        body: messageBody,
        recipients,
        webSent,
        webFailed,
        mobileSent,
        mobileFailed,
        broadcast: !!broadcast,
        sentBy: "admin",
        timestamp: Date.now(),
      })
    );
    await redis.ltrim("notifications:log", 0, 999);

    return NextResponse.json({
      success: true,
      web: { sent: webSent, failed: webFailed },
      mobile: { sent: mobileSent, failed: mobileFailed },
      totalSent: webSent + mobileSent,
      totalFailed: webFailed + mobileFailed,
    });
  } catch (error: any) {
    console.error("Admin push send error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
