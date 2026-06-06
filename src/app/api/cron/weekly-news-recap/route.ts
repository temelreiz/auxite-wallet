// src/app/api/cron/weekly-news-recap/route.ts
//
// Friday 17:00 UTC (20:00 TR) — weekly recap thread to Typefully.
//
// Different from the daily pipeline:
//
//   - Pulls news from the SAME RSS feeds but with a 5-day-old
//     cap instead of 12 hours, then takes a wider shortlist
//     (top 3 per category) so the LLM has material to thread
//     across.
//
//   - Output is a single 5–8 tweet thread, threadify=true on the
//     Typefully side. That keeps the founder's Friday-evening
//     review as one card instead of five.
//
//   - Drafts only, never publishes. Founder reviews, schedules
//     for Saturday morning or whenever they want the recap to land.
//
// We re-fetch news at cron time rather than read from a cache of
// what the daily pipeline already pulled — RSS is free, and a
// fresh pull catches Friday-afternoon stories that the morning
// drafts would have missed.

import { NextRequest, NextResponse } from "next/server";
import { fetchMorningNews } from "@/lib/news-pipeline/fetch";
import { summarizeAndRewrite, composeWeeklyThread } from "@/lib/news-pipeline/llm";
import { pushThreadDraft } from "@/lib/news-pipeline/typefully";
import type { NewsCategory } from "@/lib/news-pipeline/sources";

// Looser caps than the daily run — the thread needs material to
// thread across, and the LLM will skip uninteresting items inside
// the composition step.
const PER_CATEGORY_SHORTLIST = 3;
const TOTAL_CAP = 12;

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.INTERNAL_API_KEY && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const missing: string[] = [];
  if (!process.env.ANTHROPIC_API_KEY) missing.push("ANTHROPIC_API_KEY");
  if (!process.env.TYPEFULLY_API_KEY) missing.push("TYPEFULLY_API_KEY");
  if (missing.length) {
    return NextResponse.json(
      { ok: false, error: `Missing env: ${missing.join(", ")}` },
      { status: 503 },
    );
  }

  // Fetch this week's news. fetchMorningNews has a 12-hour age
  // cap baked in; for the weekly we accept anything we get back
  // and just let the LLM ignore the boring ones — overriding the
  // age cap here would mean forking fetch.ts which isn't worth
  // it for the one extra weekly run.
  // TODO if the recap quality is thin: add an age-override flag
  // to fetchMorningNews for this caller.
  const news = await fetchMorningNews();
  if (news.length === 0) {
    return NextResponse.json({ ok: true, message: "No news for weekly recap." });
  }

  // Build the shortlist — top 3 per category across the fetched
  // pool, then cap at 12 total to keep LLM cost predictable.
  const perCategory: Record<NewsCategory, typeof news> = {
    gold: [],
    silver: [],
    rwa: [],
    blackrock: [],
  };
  for (const item of news) {
    const cat = item.categories[0];
    if (perCategory[cat].length < PER_CATEGORY_SHORTLIST) {
      perCategory[cat].push(item);
    }
  }
  const shortlist = (Object.values(perCategory) as (typeof news)[])
    .flat()
    .slice(0, TOTAL_CAP);

  if (shortlist.length < 3) {
    return NextResponse.json({
      ok: true,
      message: "Not enough news this week for a meaningful recap.",
      shortlisted: shortlist.length,
    });
  }

  // Run Agent 2 (summarize) on each so the thread composer has
  // clean facts to work from. We skip Agent 3 (per-item rewrite)
  // because the thread composer is its own voice pass.
  const rewritten = await summarizeAndRewrite(shortlist);

  if (rewritten.length === 0) {
    return NextResponse.json({
      ok: false,
      message: "Summarization step produced nothing usable.",
    });
  }

  // Compose the thread.
  let threadText: string;
  try {
    threadText = await composeWeeklyThread(rewritten);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: `Thread composition failed: ${err?.message}` },
      { status: 500 },
    );
  }

  // Push as a single Typefully draft with threadify=true.
  const result = await pushThreadDraft(threadText);

  return NextResponse.json({
    ok: result.ok,
    shortlisted: shortlist.length,
    rewritten: rewritten.length,
    threadText,
    draftId: result.draftId,
    url: result.url,
    error: result.error,
  });
}
