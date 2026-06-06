// src/lib/news-pipeline/fetch.ts
//
// Agent 1 — fetch & filter the morning news.
//
// Pulls the RSS feeds defined in sources.ts, parses the XML into a
// flat list of news items, dedupes by URL+title, and filters each
// item against the category keyword set so we only pass on stories
// that are clearly Gold / Silver / RWA / BlackRock-related.
//
// We deliberately keep this stage dumb — no LLM calls, no opinion.
// All it does is "did this item mention <keyword>?". Editorial
// judgement happens in the next stages (summarize + tone rewrite),
// where the LLM decides which items are worth a post.

import { NEWS_SOURCES, CATEGORY_KEYWORDS, type NewsCategory, type NewsSource } from "./sources";

export interface NewsItem {
  source: string;
  title: string;
  description: string;
  link: string;
  publishedAt: string;
  categories: NewsCategory[];
}

const MAX_AGE_HOURS = 12; // skip anything older than half a day

// Strip HTML tags + decode common entities. RSS feeds love to wrap
// the description in <p>, <br>, and CDATA-encoded HTML; the LLM
// downstream gets confused if we hand it raw markup.
function cleanHtml(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Tiny RSS/Atom parser — regex-based on purpose, no XML lib needed.
// RSS is loose enough that a strict XML parser is overkill, and
// we want this to run on Vercel edge/serverless without bringing
// in a heavy dependency tree.
function parseFeed(xml: string, source: NewsSource): NewsItem[] {
  const items: NewsItem[] = [];
  const isAtom = /<feed[^>]*xmlns=["']http:\/\/www\.w3\.org\/2005\/Atom/i.test(xml);

  const itemRegex = isAtom ? /<entry[^>]*>([\s\S]*?)<\/entry>/g : /<item[^>]*>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag: string) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
      const m = block.match(r);
      return m ? m[1] : "";
    };
    const title = cleanHtml(get("title"));
    let link = "";
    if (isAtom) {
      const lm = block.match(/<link[^>]*href=["']([^"']+)["']/i);
      link = lm ? lm[1] : "";
    } else {
      link = cleanHtml(get("link"));
    }
    const description = cleanHtml(get("description") || get("summary") || get("content"));
    const publishedAt = cleanHtml(get("pubDate") || get("published") || get("updated"));

    if (!title) continue;

    items.push({
      source: source.name,
      title,
      description,
      link,
      publishedAt,
      categories: [], // populated by the keyword-classifier below
    });
  }
  return items;
}

// Classify an item by checking title + description against the
// keyword sets. An item can belong to multiple categories — RWA
// + BlackRock often overlap, gold + silver too — and we keep all
// matches so the downstream stages can decide how to slice.
function classify(item: NewsItem): NewsCategory[] {
  const haystack = `${item.title}\n${item.description}`.toLowerCase();
  const cats: NewsCategory[] = [];
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [NewsCategory, string[]][]) {
    if (keywords.some((kw) => haystack.includes(kw.toLowerCase()))) {
      cats.push(cat);
    }
  }
  return cats;
}

function isRecent(publishedAt: string): boolean {
  if (!publishedAt) return true; // some feeds skip date — give them the benefit of the doubt
  const t = Date.parse(publishedAt);
  if (Number.isNaN(t)) return true;
  return Date.now() - t < MAX_AGE_HOURS * 60 * 60 * 1000;
}

export async function fetchMorningNews(): Promise<NewsItem[]> {
  const fetches = NEWS_SOURCES.map(async (src) => {
    try {
      // 8s timeout — RSS endpoints sometimes hang; the cron has a
      // limited execution window so we'd rather skip a stuck feed
      // than wait it out and miss the 14:00 deadline.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(src.url, {
        headers: {
          // Some feeds (Reuters, GoogleNews) reject default fetch
          // User-Agent; pose as a regular browser to be safe.
          "User-Agent":
            "Mozilla/5.0 (compatible; AuxiteNewsBot/1.0; +https://auxite.io)",
          Accept: "application/rss+xml, application/xml, text/xml, */*",
        },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        console.warn(`[news-pipeline] ${src.name} returned ${res.status}`);
        return [];
      }
      const xml = await res.text();
      return parseFeed(xml, src);
    } catch (err: any) {
      console.warn(`[news-pipeline] ${src.name} fetch failed:`, err?.message);
      return [];
    }
  });

  const batches = await Promise.all(fetches);
  const flat = batches.flat();

  // Classify, keep only items that match at least one category we
  // care about. Drop stale items.
  const classified = flat
    .map((item) => ({ ...item, categories: classify(item) }))
    .filter((item) => item.categories.length > 0)
    .filter((item) => isRecent(item.publishedAt));

  // Dedupe by canonical URL first; fall back to lowercased title
  // for sources that share story links (multiple Google News
  // syndications of the same Reuters story all link to news.google).
  const seen = new Set<string>();
  const deduped: NewsItem[] = [];
  for (const item of classified) {
    const key = item.link || item.title.toLowerCase();
    // Strip URL query params — GoogleNews appends UTM markers that
    // would otherwise let the same story slip past dedupe.
    const norm = key.split("?")[0];
    if (seen.has(norm)) continue;
    seen.add(norm);
    deduped.push(item);
  }

  // Newest first — downstream picks the top N per category.
  deduped.sort((a, b) => {
    const ta = Date.parse(a.publishedAt) || 0;
    const tb = Date.parse(b.publishedAt) || 0;
    return tb - ta;
  });

  return deduped;
}
