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

async function createDraft(content: string, sourceLink: string): Promise<TypefullyDraftResponse> {
  // We attach a short footer with the source URL so the founder
  // can verify the facts before publishing without having to
  // hunt for the article in another tab. Typefully's editor lets
  // the user delete the footer in one click if they don't want
  // the source attribution on the actual post.
  const body = JSON.stringify({
    content: `${content}\n\nSource: ${sourceLink}`,
    // share = true returns a shareable draft URL — useful when
    // we list the drafts in Slack/email for the morning review.
    share: true,
    // auto_retweet_enabled / auto_plug_enabled left default; the
    // founder controls these per-account in Typefully settings.
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
      const draft = await createDraft(item.auxitePost, item.link);
      results.push({ ok: true, draftId: draft.id, url: draft.url, item });
    } catch (err: any) {
      results.push({ ok: false, item, error: err?.message || "unknown" });
    }
  }
  return results;
}
