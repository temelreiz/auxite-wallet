// src/lib/support-chat-store.ts
//
// Persistence for the AI support widget (SupportChat). The chat endpoint used
// to stream to Anthropic and back with nothing kept, so we had zero visibility
// into what users ask — and no way to catch a lead who drops their email into
// the bot. This stores each conversation (keyed by a client-generated session
// id, updated in place each turn) so the admin panel can read transcripts and
// harvest contact addresses for follow-up.
//
// Privacy posture: transcripts carry a 90-day TTL, the raw client IP is never
// stored (only a salted hash for abuse tracing), and a single delete removes a
// conversation. Marketing use of captured emails still requires the opt-in
// consent flow (Phase 2) — storing here is operational, not consent to email.

import { getRedis } from "@/lib/redis";
import * as crypto from "crypto";

const TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days
const MAX_INDEX = 10_000; // cap the newest-first index so it can't grow forever
const MAX_STORE_MESSAGES = 50; // keep more turns than the LLM window (12)
const MAX_CHARS = 2000; // per message, mirrors the chat route

const KEY = {
  transcript: (id: string) => `support:chat:${id}`,
  index: "support:chat:index", // ZSET member=id score=updatedAt (all convos)
  leads: "support:chat:leads", // ZSET member=id score=updatedAt (email seen)
};

export type StoredMessage = { role: "user" | "assistant"; content: string };

export interface Transcript {
  id: string;
  startedAt: number;
  updatedAt: number;
  lang: string | null;
  referer: string | null;
  ipHash: string | null;
  email: string | null;
  messageCount: number;
  messages: StoredMessage[];
}

export interface TranscriptSummary {
  id: string;
  startedAt: number;
  updatedAt: number;
  lang: string | null;
  email: string | null;
  messageCount: number;
  preview: string; // first user message, truncated
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

/** First email address a user typed anywhere in the conversation, if any. */
function extractEmail(messages: StoredMessage[]): string | null {
  for (const m of messages) {
    if (m.role !== "user") continue;
    const match = m.content.match(EMAIL_RE);
    if (match) return match[0].toLowerCase();
  }
  return null;
}

/** Salted hash of the client IP — enough to correlate abuse, not reversible. */
function hashIp(ip: string | null | undefined): string | null {
  if (!ip || ip === "unknown") return null;
  const salt = process.env.SUPPORT_CHAT_IP_SALT || process.env.ADMIN_ADDRESSES || "auxite";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 16);
}

/** Keep the last N valid turns, dropping any leading assistant messages. */
function normalizeForStore(input: unknown): StoredMessage[] {
  if (!Array.isArray(input)) return [];
  const out: StoredMessage[] = [];
  for (const m of input) {
    if (!m || typeof m !== "object") continue;
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string") continue;
    const trimmed = content.trim();
    if (!trimmed) continue;
    out.push({ role, content: trimmed.slice(0, MAX_CHARS) });
  }
  const recent = out.slice(-MAX_STORE_MESSAGES);
  while (recent.length && recent[0].role !== "user") recent.shift();
  return recent;
}

/**
 * Persist (or update) one conversation. `history` is the full turn list the
 * client sent this request; `assistantReply` is the answer we just streamed.
 * Best-effort — never throws, so a Redis hiccup can't break the chat.
 */
export async function saveTranscript(params: {
  sessionId: string;
  history: unknown;
  assistantReply: string;
  lang?: string | null;
  referer?: string | null;
  ip?: string | null;
}): Promise<void> {
  try {
    const id = String(params.sessionId).replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 64);
    if (!id) return;

    const messages = normalizeForStore(params.history);
    const reply = (params.assistantReply || "").trim();
    if (reply) messages.push({ role: "assistant", content: reply.slice(0, MAX_CHARS) });
    if (!messages.length) return;

    const r = getRedis();
    const now = Date.now();

    // Preserve the original start time across turns.
    let startedAt = now;
    try {
      const existing = (await r.get(KEY.transcript(id))) as Transcript | null;
      if (existing && typeof existing.startedAt === "number") startedAt = existing.startedAt;
    } catch {}

    const email = extractEmail(messages);
    const record: Transcript = {
      id,
      startedAt,
      updatedAt: now,
      lang: params.lang ? String(params.lang).slice(0, 8) : null,
      referer: params.referer ? String(params.referer).slice(0, 300) : null,
      ipHash: hashIp(params.ip),
      email,
      messageCount: messages.length,
      messages,
    };

    const p = r.pipeline();
    p.set(KEY.transcript(id), record, { ex: TTL_SECONDS });
    p.zadd(KEY.index, { score: now, member: id });
    if (email) p.zadd(KEY.leads, { score: now, member: id });
    // Trim the index to the newest MAX_INDEX conversations.
    p.zremrangebyrank(KEY.index, 0, -(MAX_INDEX + 1));
    await p.exec();
  } catch (e) {
    console.error("saveTranscript failed (non-fatal):", (e as Error)?.message || e);
  }
}

/** Newest-first list of transcript summaries for the admin panel. */
export async function listTranscripts(opts: {
  limit?: number;
  offset?: number;
  leadsOnly?: boolean;
}): Promise<{ items: TranscriptSummary[]; total: number }> {
  const r = getRedis();
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const indexKey = opts.leadsOnly ? KEY.leads : KEY.index;

  const total = (await r.zcard(indexKey)) as number;
  const ids = (await r.zrange(indexKey, offset, offset + limit - 1, {
    rev: true,
  })) as string[];
  if (!ids.length) return { items: [], total };

  const p = r.pipeline();
  for (const id of ids) p.get(KEY.transcript(id));
  const records = (await p.exec()) as (Transcript | null)[];

  const staleIds: string[] = [];
  const items: TranscriptSummary[] = [];
  records.forEach((rec, i) => {
    if (!rec) {
      staleIds.push(ids[i]); // transcript expired but index entry lingered
      return;
    }
    const firstUser = rec.messages.find((m) => m.role === "user");
    items.push({
      id: rec.id,
      startedAt: rec.startedAt,
      updatedAt: rec.updatedAt,
      lang: rec.lang,
      email: rec.email,
      messageCount: rec.messageCount,
      preview: (firstUser?.content || "").slice(0, 140),
    });
  });

  // Opportunistically clean index entries whose transcript has expired.
  if (staleIds.length) {
    try {
      await r.zrem(KEY.index, ...staleIds);
      await r.zrem(KEY.leads, ...staleIds);
    } catch {}
  }

  return { items, total };
}

/** Full transcript for the detail view. */
export async function getTranscript(id: string): Promise<Transcript | null> {
  const clean = String(id).replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 64);
  if (!clean) return null;
  return (await getRedis().get(KEY.transcript(clean))) as Transcript | null;
}

/** Delete one conversation (GDPR erasure / cleanup). */
export async function deleteTranscript(id: string): Promise<void> {
  const clean = String(id).replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 64);
  if (!clean) return;
  const r = getRedis();
  await r.del(KEY.transcript(clean));
  await r.zrem(KEY.index, clean);
  await r.zrem(KEY.leads, clean);
}
