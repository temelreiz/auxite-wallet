// src/lib/news-pipeline/sources.ts
//
// RSS / news feed definitions for the daily Auxite news-to-thread
// pipeline. We pull from a curated set of feeds chosen for relevance
// to our four watch categories (gold, silver, RWA tokenization,
// BlackRock-related). Each entry declares which categories it can
// produce so the downstream filter doesn't have to re-classify.
//
// All sources are free / public RSS — no API keys needed at the
// fetch stage. Paid feeds (Bloomberg, Reuters Pro) can be added
// later if we want broader coverage.

export type NewsCategory = "gold" | "silver" | "rwa" | "blackrock";

export interface NewsSource {
  name: string;
  url: string;
  categories: NewsCategory[];
}

export const NEWS_SOURCES: NewsSource[] = [
  // ── Precious metals ──────────────────────────────────────────────
  // Kitco — the canonical precious-metals news feed. Decent signal-
  // to-noise; their RSS doesn't carry full body but the title +
  // description is enough for the LLM to summarize.
  {
    name: "Kitco News",
    url: "https://www.kitco.com/rss/KitcoNews.xml",
    categories: ["gold", "silver"],
  },

  // Reuters commodities feed. Wider beat (oil, ag) so the filter
  // step has to do real work — we keep titles that include the
  // metal name or "gold price" / "silver price".
  {
    name: "Reuters Markets",
    url: "https://www.reutersagency.com/feed/?best-topics=commodities&post_type=best",
    categories: ["gold", "silver"],
  },

  // ── RWA / tokenization ───────────────────────────────────────────
  // CoinDesk markets feed. Catches all crypto but contains the RWA
  // tokenization beat we care about. Filter keeps anything
  // mentioning "tokeniz", "RWA", "real-world asset", "treasur".
  {
    name: "CoinDesk Markets",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml",
    categories: ["rwa", "blackrock"],
  },

  // The Block — slightly more institutional take on tokenization;
  // good complement to CoinDesk.
  {
    name: "The Block",
    url: "https://www.theblock.co/rss.xml",
    categories: ["rwa", "blackrock"],
  },

  // ── BlackRock-specific tracking ──────────────────────────────────
  // GoogleNews search RSS — programmatic search for BlackRock
  // tokenization mentions across all of Google's indexed news. This
  // catches stories from any source (press releases, niche fintech
  // press, regional papers) that our curated feeds would miss.
  {
    name: "GoogleNews — BlackRock tokenization",
    url: "https://news.google.com/rss/search?q=BlackRock+tokenization+OR+BUIDL+OR+%22tokenized+treasury%22&hl=en-US&gl=US&ceid=US:en",
    categories: ["blackrock", "rwa"],
  },

  // GoogleNews search RSS — gold market headlines from anywhere.
  // The Kitco/Reuters feeds occasionally miss European bank
  // commentary or central-bank gold buying stories.
  {
    name: "GoogleNews — gold market",
    url: "https://news.google.com/rss/search?q=gold+price+OR+%22gold+ETF%22+OR+%22central+bank+gold%22&hl=en-US&gl=US&ceid=US:en",
    categories: ["gold"],
  },

  // GoogleNews search RSS — silver. Silver has even thinner
  // dedicated coverage than gold, so the Google index helps a lot.
  {
    name: "GoogleNews — silver market",
    url: "https://news.google.com/rss/search?q=silver+price+OR+%22silver+ETF%22+OR+%22industrial+silver+demand%22&hl=en-US&gl=US&ceid=US:en",
    categories: ["silver"],
  },
];

// Keyword sets per category — used by the filter step to decide
// whether a feed item belongs to a category, even when the source
// feed is wide-beat (e.g. CoinDesk covers many topics, not just
// RWA). Case-insensitive substring match.
export const CATEGORY_KEYWORDS: Record<NewsCategory, string[]> = {
  gold: [
    "gold",
    "altın",
    "bullion",
    "XAU",
    "gold price",
    "gold etf",
    "central bank gold",
  ],
  silver: [
    "silver",
    "gümüş",
    "XAG",
    "silver price",
    "silver etf",
    "industrial silver",
  ],
  rwa: [
    "tokeniz",            // covers tokenize, tokenized, tokenization
    "RWA",
    "real-world asset",
    "real world asset",
    "tokenized treasur",
    "tokenized bond",
    "on-chain treasur",
    "on-chain bond",
  ],
  blackrock: [
    "BlackRock",
    "BUIDL",
    "iShares",
    "Fink",  // Larry Fink quotes often signal a BlackRock move
  ],
};
