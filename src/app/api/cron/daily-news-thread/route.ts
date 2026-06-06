// src/app/api/cron/daily-news-thread/route.ts
//
// Mon-Fri 10:30 UTC (13:30 TR) — the morning news → Auxite voice
// pipeline. Output is a handful of Typefully drafts the founder
// reviews and schedules from there.
//
// Pipeline (also see src/lib/news-pipeline/):
//   Agent 1  fetch.ts        Pulls RSS, filters by category
//   Agent 2  llm.ts          Summarizes each item to 2 lines
//   Agent 3  llm.ts          Rewrites in Auxite voice
//   Agent 4  typefully.ts    POSTs drafts (never auto-publishes)
//
// Drafts only — no auto-publish, never. The cron's job ends at
// "Typefully has a fresh batch waiting". Founder picks which to
// schedule via Typefully's UI by 14:00 TR.

import { NextRequest, NextResponse } from "next/server";
import { fetchMorningNews } from "@/lib/news-pipeline/fetch";
import { summarizeAndRewrite } from "@/lib/news-pipeline/llm";
import { pushDrafts } from "@/lib/news-pipeline/typefully";
import type { NewsCategory } from "@/lib/news-pipeline/sources";

// How many drafts to ship per day. We aim for one per category
// when each category has news worth posting — but the cron will
// never run out of input on a busy news day, so the cap matters.
// 4 keeps the founder's morning review under a minute (one per
// category gives a balanced thread if they decide to chain them).
const MAX_DRAFTS_PER_DAY = 4;
const PER_CATEGORY_CAP = 1;

export const maxDuration = 300; // 5 min — covers fetch + ~8 LLM calls

export async function GET(request: NextRequest) {
  // Same auth pattern as the other crons — Vercel cron token or
  // our internal API key. Manual triggering for backfill / debug
  // is supported via the internal key.
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.INTERNAL_API_KEY && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Bail safely if the keys aren't configured — the cron will then
  // run on the schedule even before the env is fully set up, and
  // the response will tell us exactly what's missing instead of
  // dying with a cryptic 500.
  const missing: string[] = [];
  if (!process.env.ANTHROPIC_API_KEY) missing.push("ANTHROPIC_API_KEY");
  if (!process.env.TYPEFULLY_API_KEY) missing.push("TYPEFULLY_API_KEY");
  if (missing.length) {
    return NextResponse.json(
      { ok: false, error: `Missing env: ${missing.join(", ")}` },
      { status: 503 },
    );
  }

  // ─── Agent 1: Fetch + filter ────────────────────────────────────
  const news = await fetchMorningNews();
  if (news.length === 0) {
    return NextResponse.json({ ok: true, message: "No relevant news this morning.", fetched: 0 });
  }

  // Pick the top N per category so we don't blow the LLM budget
  // on a busy gold day at the expense of RWA coverage. Newest-
  // first ordering is preserved from the fetch step.
  const perCategory: Record<NewsCategory, typeof news> = {
    gold: [],
    silver: [],
    rwa: [],
    blackrock: [],
  };
  for (const item of news) {
    // Assign to the FIRST matching category so an RWA + BlackRock
    // overlap doesn't burn two daily slots on the same story.
    const cat = item.categories[0];
    if (perCategory[cat].length < PER_CATEGORY_CAP) {
      perCategory[cat].push(item);
    }
  }
  const shortlist = (Object.values(perCategory) as (typeof news)[])
    .flat()
    .slice(0, MAX_DRAFTS_PER_DAY);

  if (shortlist.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "News fetched but nothing made the shortlist.",
      fetched: news.length,
    });
  }

  // ─── Agents 2 + 3: Summarize + Auxite-tone rewrite ──────────────
  const rewritten = await summarizeAndRewrite(shortlist);

  // ─── Agent 4: Push to Typefully ─────────────────────────────────
  const drafts = await pushDrafts(rewritten);

  return NextResponse.json({
    ok: true,
    fetched: news.length,
    shortlisted: shortlist.length,
    rewritten: rewritten.length,
    pushed_ok: drafts.filter((d) => d.ok).length,
    pushed_errors: drafts.filter((d) => !d.ok).length,
    drafts: drafts.map((d) => ({
      ok: d.ok,
      title: d.item.title,
      source: d.item.source,
      categories: d.item.categories,
      auxitePost: d.item.auxitePost,
      draftId: d.draftId,
      url: d.url,
      error: d.error,
    })),
  });
}
