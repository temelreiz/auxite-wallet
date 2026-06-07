// src/app/api/cron/weekly-blog-draft/route.ts
//
// Monday 06:00 UTC (09:00 TR) — pull last week's news, write a
// long-form Auxite-voice blog post, save it to the auxite-website
// repo as a DRAFT (frontmatter draft: true), and ping the founder
// on Telegram with the admin URL to review.
//
// The founder flips draft: false in admin → publish endpoint
// commits the change → blog goes live.
//
// Pipeline:
//   1. fetchMorningNews() — reuses the daily news fetcher
//   2. composeWeeklyBlogDraft() — picks theme, writes EN, translates
//   3. writeFile() — commits each locale's MDX to GitHub
//   4. Telegram channel ping (admin-only, not the public channel)

import { NextRequest, NextResponse } from "next/server";
import { fetchMorningNews } from "@/lib/news-pipeline/fetch";
import { composeWeeklyBlogDraft } from "@/lib/news-pipeline/blog";
import { writeFile } from "@/lib/blog-github";
import { sendTelegramMessage } from "@/lib/telegram";

export const maxDuration = 300;

const ADMIN_URL = "https://vault.auxite.io/admin?tab=blog";

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
  if (!process.env.GITHUB_REPO_TOKEN) missing.push("GITHUB_REPO_TOKEN");
  if (missing.length) {
    return NextResponse.json(
      { ok: false, error: `Missing env: ${missing.join(", ")}` },
      { status: 503 },
    );
  }

  // Step 1: fetch news. fetchMorningNews caps items at 12h old —
  // for the blog we want the past week's signal, so we pull and
  // trust the news-pipeline filter to surface meaningful items.
  // A future improvement is to expose an age override on fetch;
  // for now the freshest 12h is enough to seed a weekly theme
  // since Monday-morning news catches the weekend roundup.
  const news = await fetchMorningNews();
  if (news.length < 2) {
    return NextResponse.json({
      ok: true,
      message: "Not enough news for a weekly blog draft.",
      fetched: news.length,
    });
  }

  // Step 2: compose. This makes ~6-8 Claude calls (1 theme + 1 EN
  // write + 3 translations). Takes ~30-60s typically.
  let draft;
  try {
    draft = await composeWeeklyBlogDraft(news);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: `Compose failed: ${err?.message}` },
      { status: 500 },
    );
  }

  // Step 3: write each locale's MDX file to GitHub. Path convention
  // matches the existing publish endpoint: src/content/blog/<slug>/<locale>.mdx.
  // We hit the writeFile helper directly instead of POSTing to our
  // own /api/admin/blog/publish endpoint because the cron has no
  // admin session; doing it in-process skips the auth bounce.
  const writeResults: Array<{ locale: string; ok: boolean; sha?: string; error?: string }> = [];
  const wroteAt = `src/content/blog/${draft.slug}`;

  for (const t of draft.translations) {
    // Synthesize the MDX file: frontmatter + body, joined by the
    // empty line gray-matter expects when round-tripping. We
    // serialize the frontmatter by hand to keep the YAML simple —
    // the existing publish path uses gray-matter to read these
    // back, so any valid YAML works.
    const fm = t.frontmatter;
    const yamlTags = JSON.stringify(fm.tags); // ["x","y"] is valid YAML
    const frontmatterYaml = [
      "---",
      `title: ${JSON.stringify(fm.title)}`,
      `description: ${JSON.stringify(fm.description)}`,
      `date: ${fm.date}`,
      `author: ${JSON.stringify(fm.author)}`,
      `category: ${fm.category}`,
      `tags: ${yamlTags}`,
      `draft: ${fm.draft}`,
      "---",
      "",
    ].join("\n");
    const content = frontmatterYaml + t.body.trim() + "\n";

    try {
      const result = await writeFile(
        draft.slug,
        t.locale,
        content,
        `feat(blog): draft ${draft.slug} (${t.locale})`,
      );
      writeResults.push({ locale: t.locale, ok: true, sha: result.commitSha });
    } catch (err: any) {
      writeResults.push({ locale: t.locale, ok: false, error: err?.message });
    }
  }

  // Step 4: ping the founder. We use the support bot (TELEGRAM_BOT_TOKEN
  // + TELEGRAM_CHAT_ID — the founder's DM with the bot) rather than the
  // public channel, because this notification is a TODO not a broadcast.
  const okLocales = writeResults.filter((r) => r.ok).map((r) => r.locale);
  const failedLocales = writeResults.filter((r) => !r.ok);
  const notifyText = [
    `📝 <b>Monday blog draft ready</b>`,
    ``,
    `<b>Slug:</b> <code>${draft.slug}</code>`,
    `<b>Title:</b> ${draft.translations[0]?.frontmatter.title || "(missing)"}`,
    `<b>Locales committed:</b> ${okLocales.join(", ") || "none"}`,
    failedLocales.length
      ? `<b>Failed:</b> ${failedLocales.map((f) => `${f.locale} (${f.error?.slice(0, 60)})`).join(", ")}`
      : "",
    ``,
    `Review &amp; publish: ${ADMIN_URL}`,
  ]
    .filter(Boolean)
    .join("\n");

  let notifyOk = false;
  try {
    await sendTelegramMessage(notifyText);
    notifyOk = true;
  } catch (err: any) {
    console.warn("[blog-pipeline] telegram notify failed:", err?.message);
  }

  return NextResponse.json({
    ok: okLocales.length > 0,
    slug: draft.slug,
    title: draft.translations[0]?.frontmatter.title,
    wroteAt,
    locales: writeResults,
    notify: notifyOk,
    adminUrl: ADMIN_URL,
  });
}
