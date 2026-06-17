// src/lib/news-pipeline/typefully.ts
//
// Agent 4 — push the finished Auxite-voice posts to Typefully as
// drafts. Drafts only — the cron never publishes; the human reviews
// in Typefully's web UI and either schedules, edits, or kills each
// draft. That keeps editorial control firmly with the founder.
//
// API surface (v2):
//
//   GET  /social-sets?limit=50         list account's social sets
//   GET  /social-sets/<id>             read connected platforms
//   POST /social-sets/<id>/drafts      create a draft (single or thread)
//
// Auth: Authorization: Bearer <key>.
//
// Each draft is created with one platforms object per connected
// platform — Typefully's UI then renders one composer per platform
// and the founder publishes/skips each separately.

import type { SummarizedItem } from "./llm";

const API = "https://api.typefully.com/v2";

const SUPPORTED_PLATFORMS = ["x", "linkedin", "threads", "bluesky", "mastodon"] as const;
type Platform = (typeof SUPPORTED_PLATFORMS)[number];

interface TypefullyDraftResponse {
  id: number;
  url: string;
  status: string;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.TYPEFULLY_API_KEY!}`,
    "Content-Type": "application/json",
  };
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
    throw new Error(`Typefully social-sets ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const data = (await res.json()) as { results?: Array<{ id: number }> };
  return (data.results || []).map((s) => s.id);
}

// GET /social-sets/<id> returns a payload where each platform key
// only exists when that platform is connected. So we read the
// object, then pick the connected ones from a known order.
async function getConnectedPlatforms(socialSetId: number): Promise<Platform[]> {
  const res = await fetch(`${API}/social-sets/${socialSetId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Typefully social-set/${socialSetId} ${res.status}`);
  }
  const data = (await res.json()) as { platforms?: Record<string, unknown> };
  const platforms = data.platforms || {};
  return SUPPORTED_PLATFORMS.filter((p) => p in platforms);
}

// Split LLM-composed thread content into per-tweet posts. Our
// composeWeeklyThread prompt emits tweets separated by three
// newlines (Typefully's documented thread split marker is a single
// "---" line, but the LLM is more reliable at producing blank-line
// separators — we normalise here).
function splitThread(content: string): Array<{ text: string }> {
  const parts = content
    .split(/\r?\n\s*\r?\n\s*\r?\n/) // 3+ newlines = tweet boundary
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.map((text) => ({ text })) : [{ text: content.trim() }];
}

async function createDraft(
  content: string,
  options: {
    sourceLink?: string;
    threadify?: boolean;
    socialSetId: number;
  },
): Promise<TypefullyDraftResponse> {
  // For single tweets we append a source footer the founder can
  // verify against before publishing (Typefully's editor lets them
  // delete it in one click). Threads pass their own content verbatim
  // — sources live inside the thread copy itself when the LLM cares
  // to include them.
  // Source link lives in the draft's scratchpad (internal note), not
  // the public post body. The daily pipeline now auto-schedules, so
  // there's no manual review step to strip the ugly RSS redirect URL
  // before it goes live — keep the body clean and stash the source
  // where the founder can still verify it inside Typefully.
  const posts = options.threadify
    ? splitThread(content)
    : [{ text: content }];

  // Discover which platforms are connected on this set, then build
  // a platforms object with the SAME posts under each. The founder
  // can toggle individual platforms off in the UI before publishing.
  const platforms = await getConnectedPlatforms(options.socialSetId);
  if (platforms.length === 0) {
    throw new Error(`Social set ${options.socialSetId} has no connected platforms`);
  }
  const platformsObj: Record<string, { enabled: true; posts: Array<{ text: string }> }> = {};
  for (const p of platforms) {
    platformsObj[p] = { enabled: true, posts };
  }

  const draftBody: Record<string, unknown> = {
    platforms: platformsObj,
    // share = true returns a shareable draft URL — useful when we
    // list the drafts in Slack/email for the morning review.
    share: true,
  };
  if (options.sourceLink) {
    draftBody.scratchpad_text = `Source: ${options.sourceLink}`;
  }
  const body = JSON.stringify(draftBody);

  const res = await fetch(`${API}/social-sets/${options.socialSetId}/drafts`, {
    method: "POST",
    headers: authHeaders(),
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Typefully ${res.status}: ${text.slice(0, 240)}`);
  }
  return (await res.json()) as TypefullyDraftResponse;
}

// Schedule an existing draft into a concrete time. `when` accepts
// Typefully's "next-free-slot" (drop it into the next open queue slot
// per the social set's queue schedule) or an ISO datetime. PATCHing
// publish_at is what flips a draft from "draft" to "scheduled".
export async function scheduleDraft(
  socialSetId: number,
  draftId: number,
  when: string = "next-free-slot",
): Promise<{ scheduled_date?: string | null; status?: string }> {
  const res = await fetch(`${API}/social-sets/${socialSetId}/drafts/${draftId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ publish_at: when }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Typefully schedule ${res.status}: ${text.slice(0, 240)}`);
  }
  return (await res.json()) as { scheduled_date?: string | null; status?: string };
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

  let socialSetIds: number[] = [];
  try {
    socialSetIds = await listSocialSetIds();
  } catch (err: any) {
    console.warn("[news-pipeline] could not list social sets:", err?.message);
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

// Push a single thread draft to every connected social set — used
// by the Friday weekly recap. Typefully will render one composer
// per connected platform with the same thread split.
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
