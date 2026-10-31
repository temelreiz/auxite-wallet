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
    tickets.push(...(await sendChunk(messages.slice(i, i + 100))));
  }

  return tickets;
}

/**
 * One Expo request. Never throws: a failed request yields error tickets so
 * one bad chunk doesn't abort a broadcast. Tokens from more than one Expo
 * project in a chunk are rejected as a whole (PUSH_TOO_MANY_EXPERIENCE_IDS);
 * the chunk is then split per project and resent. 429/5xx are retried
 * up to three times.
 */
async function sendChunk(chunk: ExpoPushMessage[], depth = 0, attempt = 0): Promise<ExpoPushTicket[]> {
  const fail = (message: string): ExpoPushTicket[] =>
    chunk.map(() => ({ status: "error" as const, message }));
  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chunk),
      signal: AbortSignal.timeout(20_000),
    });
    const text = await response.text();
    let result: any;
    try { result = JSON.parse(text); } catch { result = null; }
    console.log(`[ExpoPush] Batch response (${chunk.length} msgs, HTTP ${response.status}):`, text.slice(0, 500));

    // Expo answers 429/5xx (often with an HTML body) under load; retry with backoff.
    if ((response.status === 429 || response.status >= 500) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      return sendChunk(chunk, depth, attempt + 1);
    }

    if (Array.isArray(result?.data)) return result.data;

    const multi = result?.errors?.find((e: any) => e?.code === "PUSH_TOO_MANY_EXPERIENCE_IDS");
    if (multi?.details && depth === 0) {
      const tickets = new Map<ExpoPushMessage, ExpoPushTicket>();
      for (const tokens of Object.values(multi.details) as string[][]) {
        const group = chunk.filter((m) => tokens.includes(String(m.to)));
        const res = await sendChunk(group, depth + 1);
        group.forEach((m, k) => tickets.set(m, res[k]));
      }
      return chunk.map((m) => tickets.get(m) ?? { status: "error", message: "unsent" });
    }
    return fail(result?.errors?.[0]?.message || `HTTP ${response.status}`);
  } catch (e) {
    console.error("[ExpoPush] Batch request failed:", e);
    return fail(e instanceof Error ? e.message : String(e));
  }
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
    /** Only devices on this platform (e.g. AUXR content is Android-only). */
    platform?: "android" | "ios";
  }
): Promise<{ sent: number; failed: number }> {
  const key = `push:mobile:${walletAddress.toLowerCase()}`;
  const existingData = (await redis.get(key)) as string | null;

  if (!existingData) {
    return { sent: 0, failed: 0 };
  }

  const allTokens: MobilePushToken[] = typeof existingData === 'string' ? JSON.parse(existingData) : existingData as MobilePushToken[];
  const tokens = options?.platform
    ? allTokens.filter((t) => (t.platform || "").toLowerCase() === options.platform)
    : allTokens;

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

  console.log(`[ExpoPush] Sending to ${walletAddress}, ${tokens.length} device(s), tokens: ${tokens.map(t => t.token.slice(0, 30)).join(', ')}`);
  const tickets = await sendExpoPushBatch(messages);
  console.log(`[ExpoPush] Tickets for ${walletAddress}:`, JSON.stringify(tickets).slice(0, 500));

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

  // Update tokens if any were removed. Rebuild from the full list so a
  // platform-filtered send never drops the other platform's devices.
  if (validTokens.length < tokens.length) {
    const removed = new Set(tokens.filter((t) => !validTokens.includes(t)).map((t) => t.token));
    const remaining = allTokens.filter((t) => !removed.has(t.token));
    await redis.set(key, JSON.stringify(remaining));
    if (remaining.length === 0) {
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
  data?: Record<string, unknown>,
  platform?: "android" | "ios"
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
      { priority: "high", platform }
    );
    totalSent += result.sent;
    totalFailed += result.failed;
  }

  return { totalSent, totalFailed, userCount: allUsers.length };
}

/**
 * Broadcast to anonymous devices (downloaded/exploring, not signed up).
 * Tokens live in the `push:anon:tokens` set. Invalid tokens are pruned.
 */
export async function broadcastAnonPush(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<{ totalSent: number; totalFailed: number; deviceCount: number }> {
  const tokens = (await redis.smembers("push:anon:tokens")) as string[];
  if (!tokens || tokens.length === 0) {
    return { totalSent: 0, totalFailed: 0, deviceCount: 0 };
  }

  const messages: ExpoPushMessage[] = tokens.map((t) => ({
    to: t,
    title,
    body,
    data: { ...data, timestamp: Date.now() },
    sound: "default",
    channelId: "default",
    priority: "high",
  }));

  const tickets = await sendExpoPushBatch(messages);

  let totalSent = 0;
  let totalFailed = 0;
  tickets.forEach((ticket, i) => {
    if (ticket.status === "ok") {
      totalSent++;
    } else {
      totalFailed++;
      if (ticket.details?.error === "DeviceNotRegistered") {
        // Prune dead token
        redis.srem("push:anon:tokens", tokens[i]);
        redis.del(`push:anon:meta:${tokens[i]}`);
      }
    }
  });

  return { totalSent, totalFailed, deviceCount: tokens.length };
}
