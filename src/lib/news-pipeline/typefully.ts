// src/lib/news-pipeline/typefully.ts
//
// Agent 4 — push the finished Auxite-voice posts to Typefully as
// drafts. Drafts only — the cron never publishes; the human reviews
// in Typefully's web UI and either schedules, edits, or kills each
// draft. That keeps editorial control firmly with the founder.
//
// API surface: POST /v1/drafts/ with the content + a couple of
// optional flags. The Typefully API is straightforward; details
// at https://typefully.com/docs/api.

import type { SummarizedItem } from "./llm";

const API = "https://api.typefully.com/v1";

interface TypefullyDraftResponse {
  id: number;
  url: string;
  status: string;
}

// Fetch every social set on the account. Each set typically maps
// to one identity that can be connected to multiple platforms
// (X + LinkedIn + Mastodon + Bluesky on one set is common). We
// draft into ALL of them by default so the founder gets a single
// review surface for every channel they've linked.
async function listSocialSetIds(): Promise<number[]> {
  // Allow an explicit override via env var when the founder wants
  // to draft to a subset, e.g. for a single-platform test:
  //   TYPEFULLY_SOCIAL_SET_IDS=312287
  const fromEnv = process.env.TYPEFULLY_SOCIAL_SET_IDS;
  if (fromEnv) {
    return fromEnv
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));
  }

  const res = await fetch(`${API}/social-sets/`, {
    headers: { "X-API-KEY": process.env.TYPEFULLY_API_KEY! },
  });
  if (!res.ok) {
    throw new Error(`Typefully social-sets ${res.status}`);
  }
  const data = (await res.json()) as { results?: Array<{ id: number }> };
  return (data.results || []).map((s) => s.id);
}

async function createDraft(
  content: string,
  options: {
    sourceLink?: string;
    threadify?: boolean;
    socialSetId?: number;
  } = {},
): Promise<TypefullyDraftResponse> {
  // For single tweets we append a source footer the founder can
  // verify against before publishing (Typefully's editor lets
  // them delete it in one click). Threads pass their own content
  // verbatim — sources live inside the thread copy itself.
  const finalContent = options.sourceLink
    ? `${content}\n\nSource: ${options.sourceLink}`
    : content;

  const body = JSON.stringify({
    content: finalContent,
    // share = true returns a shareable draft URL — useful when
    // we list the drafts in Slack/email for the morning review.
    share: true,
    // threadify on the Typefully side splits long content into
    // a thread by inserting tweet boundaries. We pass it through
    // for the weekly recap and let Typefully do the splitting,
    // which respects their per-tweet character math better than
    // anything we'd write here.
    ...(options.threadify ? { threadify: true } : {}),
    // Target a specific social set when supplied; omitted means
    // the account's default set (set in Typefully UI).
    ...(options.socialSetId ? { social_set_id: options.socialSetId } : {}),
  });

  const res = await fetch(`${API}/drafts/`, {
    method: "POST",
    headers: {
      "X-API-KEY": process.env.TYPEFULLY_API_KEY!,
      "Content-Type": "application/json",
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Typefully ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as TypefullyDraftResponse;
}

// Push a single thread draft to every connected social set — used
// by the Friday weekly recap. Typefully's threadify=true splits the
// content into tweets respecting per-platform character limits.
// One draft per social set: founder reviews 2 thread cards (X vs.
// LinkedIn/Mastodon/Bluesky) and can publish independently.
export async function pushThreadDraft(
  content: string,
): Promise<Array<{ ok: boolean; draftId?: number; url?: string; socialSetId?: number; error?: string }>> {
  let socialSetIds: number[] = [];
  try {
    socialSetIds = await listSocialSetIds();
  } catch (err: any) {
    console.warn("[news-pipeline] could not list social sets for thread, using default:", err?.message);
    socialSetIds = [0];
  }

  const results: Array<{
    ok: boolean;
    draftId?: number;
    url?: string;
    socialSetId?: number;
    error?: string;
  }> = [];

  for (const socialSetId of socialSetIds) {
    try {
      const draft = await createDraft(content, {
        threadify: true,
        ...(socialSetId ? { socialSetId } : {}),
      });
      results.push({ ok: true, draftId: draft.id, url: draft.url, socialSetId });
    } catch (err: any) {
      results.push({ ok: false, socialSetId, error: err?.message || "unknown" });
    }
  }
  return results;
}

export async function pushDrafts(items: SummarizedItem[]): Promise<
  Array<{ ok: boolean; draftId?: number; url?: string; item: SummarizedItem; socialSetId?: number; error?: string }>
> {
  const results: Array<{
    ok: boolean;
    draftId?: number;
    url?: string;
    item: SummarizedItem;
    socialSetId?: number;
    error?: string;
  }> = [];

  // Fan out: one draft per item per social set. With AuxiteGlobal
  // (X) + auxiteofficial (LinkedIn + Mastodon + Bluesky) connected,
  // a single news item produces 2 review cards in Typefully — one
  // per identity. The founder can publish, edit, or skip each one
  // independently.
  let socialSetIds: number[] = [];
  try {
    socialSetIds = await listSocialSetIds();
  } catch (err: any) {
    // If we can't list (rare — API outage), fall back to the
    // account's default set so we never silently produce zero
    // drafts on the day. The fallback path doesn't include
    // social_set_id which causes Typefully to use the default.
    console.warn("[news-pipeline] could not list social sets, using default:", err?.message);
    socialSetIds = [0]; // 0 = sentinel for "use default"
  }

  for (const item of items) {
    for (const socialSetId of socialSetIds) {
      try {
        const draft = await createDraft(item.auxitePost, {
          sourceLink: item.link,
          ...(socialSetId ? { socialSetId } : {}),
        });
        results.push({ ok: true, draftId: draft.id, url: draft.url, item, socialSetId });
      } catch (err: any) {
        results.push({ ok: false, item, socialSetId, error: err?.message || "unknown" });
      }
    }
  }
  return results;
}
