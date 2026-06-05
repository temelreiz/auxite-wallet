// GET /api/admin/blog/list
// Lists every blog post stored in the auxite-website repo, with the
// available locales and the EN frontmatter as a preview (title, date,
// category) so the admin index can render a useful row without reading
// every translation. Admin session required.

import { NextRequest, NextResponse } from 'next/server';
import matter from 'gray-matter';
import { requireAdmin } from '@/lib/admin-auth';
import { listSlugs, listLocalesForSlug, readFile } from '@/lib/blog-github';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PREVIEW_LOCALE_ORDER = ['en', 'tr', 'de', 'ar'];

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  try {
    const slugs = await listSlugs();
    const items = await Promise.all(
      slugs.map(async (slug) => {
        const locales = await listLocalesForSlug(slug);
        // Pick the first available locale from preferred order for the
        // preview row; if none of EN/TR/DE/AR exists, fall back to the
        // first locale present.
        const previewLocale =
          PREVIEW_LOCALE_ORDER.find((l) => locales.includes(l)) ?? locales[0];
        let preview: { title?: string; date?: string; category?: string; draft?: boolean } = {};
        if (previewLocale) {
          const file = await readFile(slug, previewLocale);
          if (file) {
            const fm = matter(file.content).data as Record<string, unknown>;
            preview = {
              title: typeof fm.title === 'string' ? fm.title : undefined,
              date: typeof fm.date === 'string' ? fm.date : undefined,
              category: typeof fm.category === 'string' ? fm.category : undefined,
              draft: typeof fm.draft === 'boolean' ? fm.draft : false,
            };
          }
        }
        return { slug, locales, preview, previewLocale };
      }),
    );

    // Newest first based on the preview frontmatter date when present.
    items.sort((a, b) => {
      const ad = a.preview.date ?? '';
      const bd = b.preview.date ?? '';
      return ad < bd ? 1 : -1;
    });

    return NextResponse.json({ ok: true, posts: items });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
