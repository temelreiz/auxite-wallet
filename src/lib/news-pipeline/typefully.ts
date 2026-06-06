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

async function createDraft(
  content: string,
  options: {
    sourceLink?: string;
    threadify?: boolean;
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

// Push a single thread draft — used by the Friday weekly recap.
// Content should already be the assembled thread text; Typefully's
// threadify=true splits it into tweets respecting their char limits.
export async function pushThreadDraft(
  content: string,
): Promise<{ ok: boolean; draftId?: number; url?: string; error?: string }> {
  try {
    const draft = await createDraft(content, { threadify: true });
    return { ok: true, draftId: draft.id, url: draft.url };
  } catch (err: any) {
    return { ok: false, error: err?.message || "unknown" };
  }
}

export async function pushDrafts(items: SummarizedItem[]): Promise<
  Array<{ ok: boolean; draftId?: number; url?: string; item: SummarizedItem; error?: string }>
> {
  const results: Array<{
    ok: boolean;
    draftId?: number;
    url?: string;
    item: SummarizedItem;
    error?: string;
  }> = [];

  for (const item of items) {
    try {
      const draft = await createDraft(item.auxitePost, { sourceLink: item.link });
      results.push({ ok: true, draftId: draft.id, url: draft.url, item });
    } catch (err: any) {
      results.push({ ok: false, item, error: err?.message || "unknown" });
    }
  }
  return results;
}
