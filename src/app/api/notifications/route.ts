import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

// GET - Bildirim listesi
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const category = searchParams.get("category");

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const userId = await redis.get(`user:address:${normalizedAddress}`) as string;

    if (!userId) {
      return NextResponse.json({ success: true, notifications: [], unreadCount: 0 });
    }

    const notificationsJson = await redis.get(`notifications:${userId}`) as string | null;
    let notifications = notificationsJson ? JSON.parse(notificationsJson) : [];

    // Kategori filtresi
    if (category && category !== "all") {
      notifications = notifications.filter((n: any) => n.category === category);
    }

    const unreadCount = notifications.filter((n: any) => !n.read).length;

    return NextResponse.json({ success: true, notifications, unreadCount });
  } catch (error: any) {
    console.error("Notifications GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Bildirimleri okundu olarak işaretle
export async function PATCH(request: NextRequest) {
  try {
    const { address, notificationId, markAllRead } = await request.json();

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const userId = await redis.get(`user:address:${normalizedAddress}`) as string;

    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const notificationsJson = await redis.get(`notifications:${userId}`) as string | null;
    const notifications = notificationsJson ? JSON.parse(notificationsJson) : [];

    if (markAllRead) {
      notifications.forEach((n: any) => { n.read = true; });
    } else if (notificationId) {
      const notification = notifications.find((n: any) => n.id === notificationId);
      if (notification) {
        notification.read = true;
      }
    }

    await redis.set(`notifications:${userId}`, JSON.stringify(notifications));

    const unreadCount = notifications.filter((n: any) => !n.read).length;

    return NextResponse.json({ success: true, unreadCount });
  } catch (error: any) {
    console.error("Notifications PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
