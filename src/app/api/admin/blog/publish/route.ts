// POST /api/admin/blog/publish
//
// Body:
//   {
//     slug: string,           // url-safe slug (e.g. "auxite-vs-paxg")
//     commitMessage?: string, // optional; we synthesize one if absent
//     translations: Array<{
//       locale: 'en' | 'tr' | 'de' | 'ar',
//       frontmatter: {
//         title: string,
//         description: string,
//         date: string,         // ISO yyyy-mm-dd
//         author: string,
//         category?: string,
//         tags?: string[],
//         hero?: string,
//         draft?: boolean,
//       },
//       body: string,           // MDX body (no frontmatter, just content)
//     }>
//   }
//
// Each translation becomes one MDX file committed to the auxite-website
// repo via the GitHub Contents API. Each file is its own commit (one PUT
// per file) — clean history, easy to revert one language.

import { NextRequest, NextResponse } from 'next/server';
import matter from 'gray-matter';
import { requireAdmin } from '@/lib/admin-auth';
import { writeFile } from '@/lib/blog-github';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const ALLOWED_LOCALES = new Set(['en', 'tr', 'de', 'ar']);

interface PublishBody {
  slug?: string;
  commitMessage?: string;
  translations?: Array<{
    locale?: string;
    frontmatter?: Record<string, unknown>;
    body?: string;
  }>;
}

function validSlug(s: string): boolean {
  // URL-safe slug — lowercase letters, digits, hyphens. No leading/trailing
  // hyphen, no consecutive hyphens. Matches what we want surfaced on the
  // marketing site without further normalisation.
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  let body: PublishBody;
  try {
    body = (await request.json()) as PublishBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 });
  }

  const { slug, translations } = body;
  if (!slug || !validSlug(slug)) {
    return NextResponse.json(
      { ok: false, error: 'slug must match /^[a-z0-9]+(-[a-z0-9]+)*$/' },
      { status: 400 },
    );
  }
  if (!Array.isArray(translations) || translations.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'at least one translation is required' },
      { status: 400 },
    );
  }

  // Frontmatter validation up-front so we don't half-commit.
  for (const t of translations) {
    if (!t.locale || !ALLOWED_LOCALES.has(t.locale)) {
      return NextResponse.json(
        { ok: false, error: `unknown locale "${t.locale}"` },
        { status: 400 },
      );
    }
    const fm = t.frontmatter ?? {};
    const required = ['title', 'description', 'date', 'author'] as const;
    for (const key of required) {
      if (typeof (fm as Record<string, unknown>)[key] !== 'string' || !(fm as Record<string, string>)[key]) {
        return NextResponse.json(
          { ok: false, error: `${t.locale}: missing frontmatter field "${key}"` },
          { status: 400 },
        );
      }
    }
    if (typeof t.body !== 'string' || !t.body.trim()) {
      return NextResponse.json(
        { ok: false, error: `${t.locale}: body cannot be empty` },
        { status: 400 },
      );
    }
  }

  const commitMessage =
    body.commitMessage?.trim() ||
    `blog(${slug}): admin publish via vault.auxite.io [${new Date().toISOString().slice(0, 10)}]`;

  const results: Array<{ locale: string; commitSha: string }> = [];
  const errors: Array<{ locale: string; error: string }> = [];

  for (const t of translations) {
    try {
      // gray-matter.stringify takes (content, data) and emits a clean
      // `---` block — matches the format the rest of the blog uses.
      const mdx = matter.stringify(t.body!.replace(/\r\n/g, '\n'), t.frontmatter!);
      const { commitSha } = await writeFile(slug, t.locale!, mdx, `${commitMessage} (${t.locale})`);
      results.push({ locale: t.locale!, commitSha });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ locale: t.locale!, error: msg });
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    slug,
    committed: results,
    failed: errors,
  });
}
