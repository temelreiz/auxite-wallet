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

// Typefully's v2 API is `Bearer <key>`-authenticated. The v1 docs
// floating around the internet are stale; the working endpoints
// are /v2/social-sets and /v2/social-sets/<id>/drafts.
const API = "https://api.typefully.com/v2";

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.TYPEFULLY_API_KEY!}`,
    "Content-Type": "application/json",
  };
}

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

  const res = await fetch(`${API}/social-sets?limit=50`, {
    headers: authHeaders(),
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
    socialSetId: number; // now required — the URL needs it
  },
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
  });

  // Drafts in v2 are nested under the social set in the URL path
  // rather than passed in the body. One endpoint per identity.
  const res = await fetch(`${API}/social-sets/${options.socialSetId}/drafts`, {
    method: "POST",
    headers: authHeaders(),
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
  const results: Array<{
    ok: boolean;
    draftId?: number;
    url?: string;
    socialSetId?: number;
    error?: string;
  }> = [];

  let socialSetIds: number[] = [];
  try {
    socialSetIds = await listSocialSetIds();
  } catch (err: any) {
    return [{ ok: false, error: `Failed to list social sets: ${err?.message}` }];
  }
  if (socialSetIds.length === 0) {
    return [{ ok: false, error: "No social sets configured on Typefully account" }];
  }

  for (const socialSetId of socialSetIds) {
    try {
      const draft = await createDraft(content, {
        threadify: true,
        socialSetId,
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

  // Fan out: one draft per item per social set. v2 nests drafts
  // under their social set in the URL, so we must know each ID at
  // call time — no "use default" fallback any more.
  let socialSetIds: number[] = [];
  try {
    socialSetIds = await listSocialSetIds();
  } catch (err: any) {
    console.warn("[news-pipeline] could not list social sets:", err?.message);
    // Bail with explicit errors per item so the cron response
    // tells us exactly what's wrong (vs. silently producing
    // nothing on the day).
    for (const item of items) {
      results.push({ ok: false, item, error: `Failed to list social sets: ${err?.message}` });
    }
    return results;
  }
  if (socialSetIds.length === 0) {
    for (const item of items) {
      results.push({ ok: false, item, error: "No social sets configured on Typefully account" });
    }
    return results;
  }

  for (const item of items) {
    for (const socialSetId of socialSetIds) {
      try {
        const draft = await createDraft(item.auxitePost, {
          sourceLink: item.link,
          socialSetId,
        });
        results.push({ ok: true, draftId: draft.id, url: draft.url, item, socialSetId });
      } catch (err: any) {
        results.push({ ok: false, item, socialSetId, error: err?.message || "unknown" });
      }
    }
  }
  return results;
}
