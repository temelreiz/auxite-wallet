// src/lib/news-pipeline/blog.ts
//
// Monday blog pipeline — pick a weekly theme out of the last week's
// news, write a long-form Auxite-voice post in English, and
// translate to the other locales. Output goes to the existing
// /api/admin/blog/publish endpoint with draft=true so the founder
// reviews + publishes from the admin UI.
//
// Long-form Auxite voice borrows the same declarative cadence as
// the short-form daily pipeline, but extends to ~700 words. The
// rules: no marketing fluff, no hedging, no "could be" / "may"
// constructions, and section headers only where they earn their
// place. Read the system prompt below for the full rubric.

import Anthropic from "@anthropic-ai/sdk";
import type { NewsItem } from "./fetch";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-5";

export interface BlogDraft {
  slug: string;
  translations: Array<{
    locale: "en" | "tr" | "de" | "ar";
    frontmatter: {
      title: string;
      description: string;
      date: string;
      author: string;
      category: string;
      tags: string[];
      draft: boolean;
    };
    body: string;
  }>;
}

// ── Step 1: theme + outline ─────────────────────────────────────
const THEME_SYSTEM = `You're the editorial planner for the Auxite blog.

Given a list of last week's news summaries (gold, silver, RWA tokenization, BlackRock-related), pick ONE coherent theme for this week's Monday post. The theme should:

- Cut across at least 2 of the news items (not summarize a single story).
- Reveal something about the market structure, not just price moves.
- Be defensible from the cited stories — no inventing facts.

Return JSON, nothing else:
{
  "theme": "<one short sentence stating the through-line>",
  "slug": "<url-safe-slug-2-to-5-words>",
  "title": "<10-12 word post title in the Auxite tone>",
  "category": "<one of: markets, infrastructure, ownership, briefing>",
  "tags": ["<lowercase>", "<2-4 tags>"],
  "key_points": ["<short point 1>", "<short point 2>", "<3-5 total>"],
  "supporting_items": ["<exact title of news item used>", "..."]
}

Tone benchmarks for the title:
  "Ownership Was Always the Point"
  "When the Rails Stop Being Optional"
  "Exposure Is Not the Asset"
  "Tokenization Without a Spread"
`;

interface Theme {
  theme: string;
  slug: string;
  title: string;
  category: string;
  tags: string[];
  key_points: string[];
  supporting_items: string[];
}

async function pickTheme(items: NewsItem[]): Promise<Theme> {
  const summaries = items
    .map((i, idx) => `${idx + 1}. [${i.categories.join("/")}] ${i.title}\n   ${i.description || ""}`)
    .join("\n\n");

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    system: THEME_SYSTEM,
    messages: [{ role: "user", content: `Here is last week's news:\n\n${summaries}` }],
  });

  const text = res.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("\n")
    .trim();

  // Strip code fences if the model wraps the JSON.
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  return JSON.parse(cleaned) as Theme;
}

// ── Step 2: write the long-form post (English) ──────────────────
const WRITER_SYSTEM = `You are the Auxite editorial voice writing a 600-900 word blog post in English.

Cadence:
- Declarative prose. State things; don't hedge.
- Short paragraphs (2-4 sentences each). Vary sentence length.
- Section headers in markdown (## H2) where they genuinely earn a break — usually 2-3 sections in a 700-word piece. No "Introduction" or "Conclusion" headers.
- Open on the substantive noun, not a clearing-throat sentence.
- Quote no people. Cite no specific dollar figures unless they are in the source notes verbatim.
- No emoji, no hashtags, no marketing fluff, no "exciting", "huge", "game-changing".
- The first-person plural ("we") is fine when referring to Auxite as a builder — sparingly, no more than 2-3 times.

Structure:
- Opening line lands the thesis. One short sentence.
- 2-3 sections develop the argument using the news items as evidence.
- Close with a one-paragraph forward look — no CTA, no "follow us", just the implication.

Output: pure markdown. No frontmatter. No code fences. No commentary.

Reference cadence for the Auxite voice (these are reference TWEETS, not blog excerpts — show the cadence, not the length):

  "Markets are moving beyond exposure. The next phase is ownership."
  "Tokenization stopped being a thesis. It became the rail."
  "Exposure ≠ Ownership."
  "Precious Metals. Digital Access."
`;

interface BlogBodyParts {
  body: string;
  description: string;
}

async function writePost(theme: Theme, items: NewsItem[]): Promise<BlogBodyParts> {
  const supportingNotes = items
    .map((i, idx) => `${idx + 1}. ${i.title}\n   ${i.description || ""}`)
    .join("\n\n");

  const userMsg = `Write the post.

THEME: ${theme.theme}
TITLE: ${theme.title}
KEY POINTS TO HIT:
${theme.key_points.map((p, i) => `${i + 1}. ${p}`).join("\n")}

SUPPORTING NEWS (use as evidence, paraphrase rather than quote):
${supportingNotes}

After the post body, on a new line write a single SEO description: "DESCRIPTION:" followed by 1 declarative sentence (max 160 chars).`;

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 2500,
    system: WRITER_SYSTEM,
    messages: [{ role: "user", content: userMsg }],
  });

  const full = res.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("\n")
    .trim();

  // The writer emits "DESCRIPTION: ..." on the last line; strip it
  // off the body so the markdown file is clean, and capture the
  // descriptor for the frontmatter.
  const descMatch = full.match(/\n+DESCRIPTION:\s*(.+?)\s*$/i);
  const body = descMatch ? full.slice(0, descMatch.index).trim() : full;
  const description = descMatch
    ? descMatch[1].trim().slice(0, 160)
    : theme.theme.slice(0, 160);

  return { body, description };
}

// ── Step 3: translate to other locales ──────────────────────────
// We translate the body AND the title + description. Each language
// keeps the same declarative voice — translators are told to
// resist the urge to soften the prose for readability.
const TRANSLATOR_SYSTEM = `You translate Auxite blog posts.

You will receive a TARGET locale, an English title, an English description, and an English markdown body. Translate them faithfully into the target locale.

Hard rules:
- Keep the declarative cadence. Do NOT soften terse statements into longer hedged ones.
- Keep markdown structure (## H2 headers, paragraph breaks).
- Keep proper nouns as-is (Auxite, BlackRock, ETF tickers, etc.) — do not transliterate.
- Do not add or remove paragraphs. Match the source 1:1.
- For Arabic: use formal Modern Standard Arabic. RTL is handled by the renderer; you produce plain text.

Output JSON, nothing else:
{ "title": "...", "description": "...", "body": "..." }`;

type Locale = "tr" | "de" | "ar";

async function translatePost(
  locale: Locale,
  englishTitle: string,
  englishDescription: string,
  englishBody: string,
): Promise<{ title: string; description: string; body: string }> {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 3500,
    system: TRANSLATOR_SYSTEM,
    messages: [
      {
        role: "user",
        content: `TARGET locale: ${locale}\n\nTITLE: ${englishTitle}\n\nDESCRIPTION: ${englishDescription}\n\nBODY:\n${englishBody}`,
      },
    ],
  });

  const text = res.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("\n")
    .trim();
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  return JSON.parse(cleaned) as { title: string; description: string; body: string };
}

// ── Orchestrator ────────────────────────────────────────────────
export async function composeWeeklyBlogDraft(items: NewsItem[]): Promise<BlogDraft> {
  if (items.length < 2) {
    throw new Error("Need at least 2 news items to compose a weekly blog");
  }

  // Step 1 — theme
  const theme = await pickTheme(items);

  // Step 2 — English body
  const { body: enBody, description: enDescription } = await writePost(theme, items);

  // Date stamp uses ISO yyyy-mm-dd; the marketing site formats per
  // locale in the renderer. We use UTC today since the cron fires
  // at 09:00 TR (06:00 UTC) — date will always be Monday-of-fire.
  const date = new Date().toISOString().slice(0, 10);

  const baseFrontmatter = {
    date,
    author: "Auxite",
    category: theme.category,
    tags: theme.tags,
    draft: true, // never auto-publish; founder reviews in admin
  };

  // Step 3 — translations
  const translations: BlogDraft["translations"] = [
    {
      locale: "en",
      frontmatter: {
        ...baseFrontmatter,
        title: theme.title,
        description: enDescription,
      },
      body: enBody,
    },
  ];

  for (const locale of ["tr", "de", "ar"] as const) {
    try {
      const t = await translatePost(locale, theme.title, enDescription, enBody);
      translations.push({
        locale,
        frontmatter: {
          ...baseFrontmatter,
          title: t.title,
          description: t.description.slice(0, 160),
        },
        body: t.body,
      });
    } catch (err: any) {
      // One bad translation shouldn't kill the whole draft —
      // the founder can fill the gap manually in the admin.
      console.warn(`[blog-pipeline] translation to ${locale} failed:`, err?.message);
    }
  }

  return { slug: theme.slug, translations };
}
