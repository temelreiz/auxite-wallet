/**
 * Expo Push Notification Service
 * Sends push notifications to mobile devices via Expo Push API
 *
 * Expo Push API handles routing to FCM (Android) and APNs (iOS)
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

import { redis } from "@/lib/redis";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface ExpoPushMessage {
  to: string; // Expo push token
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
  categoryId?: string;
  priority?: "default" | "normal" | "high";
  ttl?: number; // seconds
}

export interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface MobilePushToken {
  token: string;
  platform: "ios" | "android";
  deviceName: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Send push notification to a single Expo push token
 */
export async function sendExpoPush(
  message: ExpoPushMessage
): Promise<ExpoPushTicket> {
  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  const result = await response.json();
  return result.data;
}

/**
 * Send push notifications in batch (up to 100 at a time)
 */
export async function sendExpoPushBatch(
  messages: ExpoPushMessage[]
): Promise<ExpoPushTicket[]> {
  const tickets: ExpoPushTicket[] = [];

  // Expo API allows max 100 messages per request
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);

    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chunk),
    });

    const result = await response.json();
    if (result.data) {
      tickets.push(...result.data);
    }
  }

  return tickets;
}

/**
 * Send push notification to a user by wallet address
 * Sends to all registered devices for that user
 */
export async function sendPushToUser(
  walletAddress: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
  options?: {
    sound?: "default" | null;
    badge?: number;
    channelId?: string;
    priority?: "default" | "normal" | "high";
  }
): Promise<{ sent: number; failed: number }> {
  const key = `push:mobile:${walletAddress.toLowerCase()}`;
  const existingData = (await redis.get(key)) as string | null;

  if (!existingData) {
    return { sent: 0, failed: 0 };
  }

  const tokens: MobilePushToken[] = JSON.parse(existingData);

  if (tokens.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const messages: ExpoPushMessage[] = tokens.map((t) => ({
    to: t.token,
    title,
    body,
    data: {
      ...data,
      timestamp: Date.now(),
    },
    sound: options?.sound ?? "default",
    badge: options?.badge,
    channelId: options?.channelId ?? "default",
    priority: options?.priority ?? "high",
  }));

  const tickets = await sendExpoPushBatch(messages);

  let sent = 0;
  let failed = 0;
  const validTokens: MobilePushToken[] = [];

  tickets.forEach((ticket, index) => {
    if (ticket.status === "ok") {
      sent++;
      validTokens.push(tokens[index]);
    } else {
      failed++;
      // Check if token is invalid (DeviceNotRegistered)
      if (ticket.details?.error === "DeviceNotRegistered") {
        console.log(
          `[ExpoPush] Removing invalid token for ${walletAddress}: ${tokens[index].token.slice(0, 20)}...`
        );
        // Don't add to validTokens — it will be removed
      } else {
        // Keep token for other errors (network issues etc.)
        validTokens.push(tokens[index]);
        console.error(
          `[ExpoPush] Failed to send to ${walletAddress}:`,
          ticket.message
        );
      }
    }
  });

  // Update tokens if any were removed
  if (validTokens.length < tokens.length) {
    await redis.set(key, JSON.stringify(validTokens));
    if (validTokens.length === 0) {
      await redis.srem("push:mobile:all_users", walletAddress.toLowerCase());
    }
  }

  return { sent, failed };
}

/**
 * Broadcast push notification to all registered mobile users
 */
export async function broadcastPush(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<{ totalSent: number; totalFailed: number; userCount: number }> {
  const allUsers = await redis.smembers("push:mobile:all_users");

  let totalSent = 0;
  let totalFailed = 0;

  for (const userId of allUsers) {
    const result = await sendPushToUser(
      userId as string,
      title,
      body,
      data,
      { priority: "high" }
    );
    totalSent += result.sent;
    totalFailed += result.failed;
  }

  return { totalSent, totalFailed, userCount: allUsers.length };
}
