// GET /api/admin/blog/get?slug=<slug>
// Returns every translation of a single post as { locale, frontmatter, body }
// tuples so the admin editor can populate all four language tabs in one
// shot. Returns 404 if the slug has no files at all. Admin session required.

import { NextRequest, NextResponse } from 'next/server';
import matter from 'gray-matter';
import { requireAdmin } from '@/lib/admin-auth';
import { listLocalesForSlug, readFile } from '@/lib/blog-github';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  const slug = new URL(request.url).searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ ok: false, error: 'slug is required' }, { status: 400 });
  }

  try {
    const locales = await listLocalesForSlug(slug);
    if (locales.length === 0) {
      return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
    }

    const translations = await Promise.all(
      locales.map(async (locale) => {
        const file = await readFile(slug, locale);
        if (!file) return null;
        const parsed = matter(file.content);
        return {
          locale,
          frontmatter: parsed.data,
          body: parsed.content,
        };
      }),
    );

    return NextResponse.json({
      ok: true,
      slug,
      translations: translations.filter(Boolean),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
