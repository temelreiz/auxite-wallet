/**
 * Admin Push Notification Log API
 * Returns notification send history and registered device count
 */

import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Admin auth check
    const auth = request.headers.get("authorization");
    if (auth !== "Bearer auxite-admin-2024") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get notification log (last 50)
    const logRaw = await redis.lrange("notifications:log", 0, 49);
    const logs = logRaw.map((item: any) => {
      try {
        return typeof item === "string" ? JSON.parse(item) : item;
      } catch {
        return item;
      }
    });

    // Get registered mobile user count
    const allUsers = await redis.smembers("push:mobile:all_users");
    const registeredUsers = allUsers ? allUsers.length : 0;

    return NextResponse.json({
      success: true,
      logs,
      registeredUsers,
    });
  } catch (error: any) {
    console.error("Push log GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
