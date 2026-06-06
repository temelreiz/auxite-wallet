// src/lib/news-pipeline/llm.ts
//
// Agents 2 + 3 — summarize + Auxite-tone rewrite.
//
// Why two passes:
//   The summarizer (Agent 2) just compresses each story into 2
//   declarative lines, free of fluff and adjectives. It's a pure
//   editorial step — keep facts, drop hedging, drop branding.
//   The tone-rewriter (Agent 3) takes that flat summary and bends
//   it into the Auxite voice — minimalist, market-aware, the same
//   pattern the founder shared as the model:
//
//     Markets are moving beyond exposure.
//     The next phase is ownership.
//
// Doing it in one pass instead of two consistently lost the
// declarative compression in favour of a more "branded" but vaguer
// result. Splitting keeps the summary honest and lets the tone
// pass focus on prose only.

import Anthropic from "@anthropic-ai/sdk";
import type { NewsItem } from "./fetch";
import type { NewsCategory } from "./sources";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-5";

export interface SummarizedItem extends NewsItem {
  summary: string;     // Agent 2 output — 2 line plain-English summary
  auxitePost: string;  // Agent 3 output — Auxite-voice tweet, ready to draft
}

// ── Agent 2: Summarize ───────────────────────────────────────────
const SUMMARIZER_SYSTEM = `You are a financial news summarizer for an Auxite editorial pipeline.

Given a news headline and (optionally) a short description, return a 2-line summary in the following form:

  <Line 1: the fact — what happened, in declarative English. Past or present tense. No adjectives, no hedging.>
  <Line 2: the implication — why it matters in the market, also declarative. No marketing fluff.>

Hard rules:
- Each line stands alone as a complete sentence ending in a period.
- Each line is at most ~12 words.
- No "this is", "we believe", "could be", "may be". State things.
- No emoji, no hashtags, no quotes from the article.
- If the headline is too sparse to know the implication, write Line 2 as the structural fact (e.g. "Demand for this exposure continues to broaden.") rather than inventing details.

Output the two lines and nothing else. No preamble, no labels.`;

async function summarize(item: NewsItem): Promise<string> {
  const userMsg = `Headline: ${item.title}\n\nDescription: ${item.description || "(none)"}`;
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    system: SUMMARIZER_SYSTEM,
    messages: [{ role: "user", content: userMsg }],
  });
  const txt = res.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("\n")
    .trim();
  return txt;
}

// ── Agent 3: Auxite-tone rewrite ─────────────────────────────────
// The system prompt encodes the founder's reference example
// verbatim — we want the rewrite to be a *transform* of the
// summary into that voice, not a new piece of content.
const AUXITE_VOICE_SYSTEM = `You are the Auxite editorial voice.

Rewrite a plain summary into a single Auxite-style social post for X/Twitter.

The Auxite voice:
- Two declarative sentences. The first is the observation. The second is the implication or shift.
- Each sentence stands alone, no conjunctions linking them.
- No adjectives that don't earn their place. No "amazing", "exciting", "big news".
- No emoji, no hashtags, no @mentions, no links.
- No first person ("we", "our"). Third-person market voice.
- Avoid generic openers like "It's clear that…" or "We're seeing…". Open on the substantive noun.
- Each sentence ends with a period (or a question mark only if genuinely asking).

Reference examples — these set the cadence:

  Markets are moving beyond exposure.
  The next phase is ownership.

  Tokenization stopped being a thesis.
  It became the rail.

  Central banks keep buying.
  The signal is no longer about price — it's about reserve composition.

  Gold doesn't pay yield.
  That's the point: it's not supposed to.

Hard rules:
- Output ONLY the two-line post. Nothing else.
- Maximum ~280 characters total (this is for X — a single tweet, not a thread).
- If the summary genuinely has nothing implications-worthy to say, return the single best declarative observation as one sentence.
- Never invent specific numbers or facts that aren't in the source summary.`;

async function toAuxiteTone(summary: string, category: NewsCategory): Promise<string> {
  const userMsg = `Category: ${category}\n\nSummary to rewrite:\n${summary}`;
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    system: AUXITE_VOICE_SYSTEM,
    messages: [{ role: "user", content: userMsg }],
  });
  const txt = res.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("\n")
    .trim();
  // Defensive: trim quoting the LLM sometimes wraps in.
  return txt.replace(/^["']|["']$/g, "");
}

// ── Pipeline runner ──────────────────────────────────────────────
// Takes the filtered news items, runs each through Agent 2 and
// Agent 3 in sequence per item, returns the enriched list. We
// don't fan out a top-of-the-list filter here — that's the cron
// route's job, since "how many drafts per day" is a policy
// decision the route gets to make.

export async function summarizeAndRewrite(items: NewsItem[]): Promise<SummarizedItem[]> {
  const out: SummarizedItem[] = [];
  for (const item of items) {
    try {
      const summary = await summarize(item);
      // Use the first matched category as the rewrite hint — the
      // tone system prompt doesn't actually branch on category
      // today, but we pass it so a future iteration can tune voice
      // per category (e.g. gold = slightly drier, RWA = more
      // forward-looking) without changing the call shape.
      const auxitePost = await toAuxiteTone(summary, item.categories[0]);
      out.push({ ...item, summary, auxitePost });
    } catch (err: any) {
      console.warn(`[news-pipeline] LLM failed for "${item.title}":`, err?.message);
    }
  }
  return out;
}
