// src/lib/radio.ts
// ============================================================================
// Auxite Radio — a short spoken metals broadcast (EN / DE / AR).
//
// Pipeline:
//   1. Pull live prices (/api/prices) + latest news (/api/news).
//   2. Claude writes a natural ~60–90s radio script in the target language
//      (intro · live prices + daily change · market commentary · 1–2 news
//      headlines · sign-off) — spoken style, numbers read naturally.
//   3. ElevenLabs (eleven_multilingual_v2) turns it into an MP3.
//
// Both the script and the MP3 are cached in Redis per (lang, hour-bucket) so we
// regenerate at most once an hour — keeps LLM + TTS cost near zero.
// ============================================================================

import Anthropic from "@anthropic-ai/sdk";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-5";

const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY || "";
// Default multilingual voice (override with ELEVENLABS_VOICE_ID). Brian — deep,
// warm male broadcaster, works across EN/DE/AR via eleven_multilingual_v2.
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "nPczCjzI2devNBz1zQrb";

export type RadioLang = "en" | "de" | "ar";
export const RADIO_LANGS: RadioLang[] = ["en", "de", "ar"];
const LANG_NAME: Record<RadioLang, string> = { en: "English", de: "German", ar: "Arabic" };

const METALS: { sym: string; name: string }[] = [
  { sym: "AUXG", name: "Gold" },
  { sym: "AUXS", name: "Silver" },
  { sym: "AUXPT", name: "Platinum" },
  { sym: "AUXPD", name: "Palladium" },
];

function hourBucket(): string {
  // Stable per-hour key without Date.now in a way that breaks resume — fine here.
  return String(Math.floor(Date.now() / 3600000));
}

// ── Script generation (Claude) ──────────────────────────────────────────────
export async function getRadioScript(lang: RadioLang, origin: string): Promise<{ script: string; cached: boolean }> {
  const key = `radio:script:${lang}:${hourBucket()}`;
  const hit = (await redis.get(key)) as string | null;
  if (hit) return { script: hit, cached: true };

  const [pricesRes, newsRes] = await Promise.all([
    fetch(`${origin}/api/prices`, { cache: "no-store" }).then((r) => r.json()).catch(() => null),
    fetch(`${origin}/api/news`, { cache: "no-store" }).then((r) => r.json()).catch(() => null),
  ]);

  const prices: Record<string, number> = pricesRes?.prices || pricesRes?.executionPrices || {};
  const changes: Record<string, number> = pricesRes?.changes || {};
  const priceLines = METALS.map((m) => {
    const p = prices[m.sym];
    const c = changes[m.sym];
    if (!p) return null;
    const chg = typeof c === "number" ? ` (${c >= 0 ? "+" : ""}${c.toFixed(2)}% today)` : "";
    return `${m.name}: $${p.toFixed(2)} per gram${chg}`;
  }).filter(Boolean).join("\n");

  const newsItems: any[] = newsRes?.items || newsRes?.articles || newsRes?.news || [];
  const headlines = newsItems.slice(0, 3).map((n) => `- ${n.title || n.headline || ""}`).filter(Boolean).join("\n");

  const system = `You are the host of "Auxite Radio", a short spoken update for a tokenized precious-metals platform (gold, silver, platinum, palladium — each token backed 1:1 by vaulted physical metal).

Write a single radio segment of about 60–90 seconds (roughly 130–170 words) in ${LANG_NAME[lang]}.

Structure (flowing, no headers):
- A brief warm intro ("You're listening to Auxite Radio…").
- The current per-gram prices with the daily change, read naturally (say the numbers as a host would, not as raw figures).
- One or two sentences of light market commentary grounded ONLY in the price moves given (no invented facts/forecasts).
- If headlines are provided, weave in one or two, summarized in a sentence each, in ${LANG_NAME[lang]}.
- A short sign-off.

Rules:
- Output ONLY the spoken script in ${LANG_NAME[lang]} — no stage directions, no labels, no markdown, no emoji.
- Natural spoken style suitable for text-to-speech. Numbers and percentages spoken naturally.
- Do not invent prices, news, or predictions beyond what is provided.`;

  const user = `LIVE PRICES (USD per gram):
${priceLines || "(prices temporarily unavailable)"}

LATEST HEADLINES:
${headlines || "(none)"}`;

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    system,
    messages: [{ role: "user", content: user }],
  });
  const script = res.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text).join(" ").trim();

  if (script) await redis.set(key, script, { ex: 7200 }); // 2h
  return { script, cached: false };
}

// ── Text-to-speech (ElevenLabs) ─────────────────────────────────────────────
export async function getRadioAudio(lang: RadioLang, origin: string): Promise<{ mp3: Buffer; cached: boolean } | { error: string }> {
  if (!ELEVEN_KEY) return { error: "ELEVENLABS_API_KEY not set" };

  const audioKey = `radio:audio:${lang}:${hourBucket()}`;
  const cachedB64 = (await redis.get(audioKey)) as string | null;
  if (cachedB64) return { mp3: Buffer.from(cachedB64, "base64"), cached: true };

  const { script } = await getRadioScript(lang, origin);
  if (!script) return { error: "no script" };

  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: { "xi-api-key": ELEVEN_KEY, "Content-Type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({
      text: script,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2 },
    }),
  });
  if (!r.ok) return { error: `ElevenLabs ${r.status}: ${(await r.text()).slice(0, 160)}` };

  const mp3 = Buffer.from(await r.arrayBuffer());
  // Cache as base64 (small ~30–80KB clips). TTL 2h.
  await redis.set(audioKey, mp3.toString("base64"), { ex: 7200 });
  return { mp3, cached: false };
}

// ── Welcome greeting (static, played on every radio open) ───────────────────
const WELCOME: Record<RadioLang, string> = {
  en: "Welcome to Auxite. Enjoy the music and the market updates while you're with us.",
  de: "Willkommen bei Auxite. Genießen Sie die Musik und die Marktnachrichten, während Sie bei uns sind.",
  ar: "مرحباً بكم في أوكسايت. استمتعوا بالموسيقى وتحديثات الأسواق أثناء وجودكم معنا.",
};

export async function getWelcomeAudio(lang: RadioLang): Promise<{ mp3: Buffer } | { error: string }> {
  if (!ELEVEN_KEY) return { error: "ELEVENLABS_API_KEY not set" };
  const key = `radio:welcome:v2:${lang}`;
  const cached = (await redis.get(key)) as string | null;
  if (cached) return { mp3: Buffer.from(cached, "base64") };

  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: { "xi-api-key": ELEVEN_KEY, "Content-Type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({
      text: WELCOME[lang],
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.25 },
    }),
  });
  if (!r.ok) return { error: `ElevenLabs ${r.status}: ${(await r.text()).slice(0, 120)}` };
  const mp3 = Buffer.from(await r.arrayBuffer());
  await redis.set(key, mp3.toString("base64"), { ex: 30 * 86400 }); // static → 30 days
  return { mp3 };
}

// ── Programmed schedule: rotating segments + end-of-day report ───────────────
// Music is the bed; every ~2h a segment plays. The TYPE is chosen by the clock
// so all listeners hear the same "broadcast": metal updates rotate with podcast
// (educational) slots, and an End-of-Day report airs at the US market close.

const PODCAST_TOPICS = [
  "why central banks keep buying gold",
  "what 'allocated, vaulted' metal really means and why it matters",
  "gold as a hedge against inflation and currency debasement",
  "silver's dual role: a monetary metal and an industrial one",
  "platinum and palladium and the automotive catalyst market",
  "a short history of the gold standard",
  "how tokenized, 1-to-1 metal-backed tokens work on-chain",
  "why real-world assets are coming on-chain",
];

interface Segment { type: "gold" | "silver" | "platinum" | "podcast" | "eod"; title: string; topic?: string }

function nyHour(): number {
  try { return Number(new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour: "2-digit", hour12: false })); }
  catch { return new Date().getUTCHours(); }
}
function dayBucket(): string { return String(Math.floor(Date.now() / 86400000)); }

export function currentSegment(): Segment {
  const h = nyHour();
  if (h === 16 || h === 17) return { type: "eod", title: "End-of-Day Report" };
  const slot = Math.floor(new Date().getUTCHours() / 2); // 0..11
  const rot: Segment["type"][] = ["gold", "podcast", "silver", "podcast", "platinum", "podcast", "gold", "podcast", "silver", "podcast", "platinum", "podcast"];
  const type = rot[slot % rot.length];
  if (type === "podcast") {
    const topic = PODCAST_TOPICS[(Number(dayBucket()) * 6 + slot) % PODCAST_TOPICS.length];
    return { type, title: "Auxite Podcast", topic };
  }
  const names: Record<string, string> = { gold: "Gold Market Update", silver: "Silver Insights", platinum: "Platinum Brief" };
  return { type, title: names[type] };
}

async function priceLine(origin: string): Promise<string> {
  try {
    const j = await fetch(`${origin}/api/prices`, { cache: "no-store" }).then((r) => r.json());
    const p = j?.prices || j?.executionPrices || {}; const c = j?.changes || {};
    return METALS.map((m) => {
      if (!p[m.sym]) return null;
      const chg = typeof c[m.sym] === "number" ? ` (${c[m.sym] >= 0 ? "+" : ""}${c[m.sym].toFixed(2)}% today)` : "";
      return `${m.name}: $${p[m.sym].toFixed(2)}/g${chg}`;
    }).filter(Boolean).join("\n");
  } catch { return ""; }
}

function segPrompt(seg: Segment, lang: RadioLang, prices: string): { system: string; user: string } {
  const L = LANG_NAME[lang];
  const base = `You host "Auxite Radio" for a tokenized precious-metals platform. Speak naturally for text-to-speech in ${L}. Numbers spoken naturally. Output ONLY the spoken script — no labels, markdown, or emoji. Do not invent prices or forecasts beyond what is given.`;
  if (seg.type === "podcast") {
    return { system: base, user: `Record a ~90-second educational radio segment in ${L} on: "${seg.topic}". Informative and engaging, grounded in general, accurate knowledge. Start with a short hook, end with a clean sign-off.` };
  }
  if (seg.type === "eod") {
    return { system: base, user: `Record a ~75-second END-OF-DAY market report in ${L} as the US market closes. Cover all four metals with their closing per-gram prices and the daily change, then a brief wrap-up.\n\nPRICES:\n${prices || "(unavailable)"}` };
  }
  const metal = { gold: "Gold", silver: "Silver", platinum: "Platinum" }[seg.type] || "metals";
  return { system: base, user: `Record a ~50-second ${metal} market update in ${L}: the current per-gram price and today's move, plus one or two sentences of commentary grounded ONLY in that move.\n\nPRICES:\n${prices || "(unavailable)"}` };
}

// The current scheduled segment as audio (Claude script → ElevenLabs), cached.
export async function getSegmentAudio(lang: RadioLang, origin: string): Promise<{ mp3: Buffer; title: string } | { error: string }> {
  if (!ELEVEN_KEY) return { error: "ELEVENLABS_API_KEY not set" };
  const seg = currentSegment();
  // metal/eod refresh hourly (prices); podcast is daily per topic.
  const bucket = seg.type === "podcast" ? `pod:${seg.topic}:${dayBucket()}` : `${seg.type}:${hourBucket()}`;
  const key = `radio:seg:v1:${lang}:${bucket}`;
  const cached = (await redis.get(key)) as string | null;
  if (cached) return { mp3: Buffer.from(cached, "base64"), title: seg.title };

  const prices = seg.type === "podcast" ? "" : await priceLine(origin);
  const { system, user } = segPrompt(seg, lang, prices);
  const res = await anthropic.messages.create({ model: MODEL, max_tokens: 700, system, messages: [{ role: "user", content: user }] });
  const script = res.content.filter((c): c is Anthropic.TextBlock => c.type === "text").map((c) => c.text).join(" ").trim();
  if (!script) return { error: "no script" };

  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: { "xi-api-key": ELEVEN_KEY, "Content-Type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text: script, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.25 } }),
  });
  if (!r.ok) return { error: `ElevenLabs ${r.status}` };
  const mp3 = Buffer.from(await r.arrayBuffer());
  await redis.set(key, mp3.toString("base64"), { ex: seg.type === "podcast" ? 2 * 86400 : 7200 });
  return { mp3, title: seg.title };
}
