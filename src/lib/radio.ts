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
// Default multilingual voice (override with ELEVENLABS_VOICE_ID). Rachel — warm,
// works across EN/DE/AR via eleven_multilingual_v2.
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

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
