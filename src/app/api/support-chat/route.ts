import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/support-knowledge";
import {
  supportChatLimiter,
  supportChatDailyLimiter,
} from "@/lib/security/rate-limiter";

// Anthropic SDK needs the Node runtime (not edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 1024;
const MAX_MESSAGES = 12; // keep the last N turns
const MAX_CHARS = 2000; // per message

// Origins allowed to call this endpoint cross-site (the marketing site embeds
// the same widget but lives on a different origin). Same-origin (the wallet
// app itself) needs no entry here.
const ALLOWED_ORIGINS = new Set([
  "https://auxite.io",
  "https://www.auxite.io",
  "http://localhost:3002", // local website dev
]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
  }
  return {};
}

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

type ChatMessage = { role: "user" | "assistant"; content: string };

function sanitize(input: unknown): ChatMessage[] | null {
  if (!Array.isArray(input)) return null;
  const msgs: ChatMessage[] = [];
  for (const m of input) {
    if (!m || typeof m !== "object") return null;
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string") return null;
    const trimmed = content.trim();
    if (!trimmed) continue;
    msgs.push({ role, content: trimmed.slice(0, MAX_CHARS) });
  }
  const recent = msgs.slice(-MAX_MESSAGES);
  while (recent.length && recent[0].role !== "user") recent.shift();
  return recent.length ? recent : null;
}

export async function POST(req: Request) {
  const cors = corsHeaders(req);

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "Support assistant is not configured." },
      { status: 503, headers: cors },
    );
  }

  // IP-based rate limiting (Upstash). Fail-open if Redis is unavailable so a
  // transient infra issue never takes the assistant down.
  const ip = clientIp(req);
  try {
    const [burst, daily] = await Promise.all([
      supportChatLimiter.limit(ip),
      supportChatDailyLimiter.limit(ip),
    ]);
    if (!burst.success || !daily.success) {
      const reset = (burst.success ? daily : burst).reset;
      const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      return Response.json(
        { error: "Too many requests. Please slow down." },
        {
          status: 429,
          headers: { ...cors, "Retry-After": String(retryAfter) },
        },
      );
    }
  } catch {
    // Redis hiccup — allow the request through.
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400, headers: cors });
  }

  const messages = sanitize((body as { messages?: unknown })?.messages);
  if (!messages) {
    return Response.json({ error: "No valid messages." }, { status: 400, headers: cors });
  }

  const client = new Anthropic();

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        stream.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
        await stream.finalMessage();
      } catch (err) {
        const msg =
          err instanceof Anthropic.APIError
            ? `\n\n[support assistant error: ${err.status ?? "unknown"}]`
            : "\n\n[support assistant error]";
        controller.enqueue(encoder.encode(msg));
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(readable, {
    headers: {
      ...cors,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
