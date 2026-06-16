// BlogManager — admin tab UI for managing /blog posts on auxite.io.
//
// Flow:
//   1. Loads the post list from /api/admin/blog/list on mount.
//   2. Two views, toggled by `mode`:
//        • "list"   → table of existing posts, "New post" + "Edit" actions
//        • "editor" → slug + per-locale tabs, frontmatter fields, markdown
//                     textarea, live preview
//   3. Publish hits /api/admin/blog/publish which commits MDX files to the
//      auxite-website repo via GitHub Contents API. Vercel auto-deploys.
//
// Auth: parent admin page already gates rendering; we only forward the
// admin Bearer token on each fetch.

'use client';

import { useEffect, useMemo, useState } from 'react';
import { marked } from 'marked';

interface PostListItem {
  slug: string;
  locales: string[];
  previewLocale?: string;
  preview: { title?: string; date?: string; category?: string; draft?: boolean };
}

interface Frontmatter {
  title: string;
  description: string;
  date: string; // yyyy-mm-dd
  author: string;
  category?: string;
  tags?: string[];
  hero?: string;
  draft?: boolean;
}

interface Translation {
  locale: BlogLocale;
  frontmatter: Frontmatter;
  body: string;
}

type BlogLocale = 'en' | 'tr' | 'de' | 'ar';
const LOCALES: BlogLocale[] = ['en', 'tr', 'de', 'ar'];
const LOCALE_LABELS: Record<BlogLocale, string> = {
  en: 'English',
  tr: 'Türkçe',
  de: 'Deutsch',
  ar: 'العربية',
};

function emptyFrontmatter(): Frontmatter {
  // Default new posts to today's date — saves a click and 99% of the
  // time it's what the author wanted anyway.
  return {
    title: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    author: 'Auxite Team',
    category: '',
    tags: [],
    hero: '',
    draft: false,
  };
}

function emptyTranslations(): Translation[] {
  return LOCALES.map((locale) => ({
    locale,
    frontmatter: emptyFrontmatter(),
    body: '',
  }));
}

export default function BlogManager({ adminToken }: { adminToken: string }) {
  const [mode, setMode] = useState<'list' | 'editor'>('list');
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Editor state
  const [slug, setSlug] = useState('');
  const [slugLocked, setSlugLocked] = useState(false); // true when editing existing
  const [translations, setTranslations] = useState<Translation[]>(emptyTranslations());
  const [activeLocale, setActiveLocale] = useState<BlogLocale>('en');
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState('');

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${adminToken}` }),
    [adminToken],
  );

  async function loadPosts() {
    setLoadingList(true);
    setListError(null);
    try {
      const r = await fetch(`/api/admin/blog/list?t=${Date.now()}`, {
        headers: authHeaders,
        cache: 'no-store',
      });
      const j = (await r.json()) as { ok: boolean; posts?: PostListItem[]; error?: string };
      if (!j.ok) throw new Error(j.error || 'Failed to load');
      setPosts(j.posts ?? []);
    } catch (e) {
      setListError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startNew() {
    setSlug('');
    setSlugLocked(false);
    setTranslations(emptyTranslations());
    setActiveLocale('en');
    setCommitMessage('');
    setPublishMsg(null);
    setMode('editor');
  }

  async function startEdit(slugToEdit: string) {
    setPublishMsg(null);
    try {
      const r = await fetch(`/api/admin/blog/get?slug=${encodeURIComponent(slugToEdit)}`, {
        headers: authHeaders,
      });
      const j = (await r.json()) as {
        ok: boolean;
        translations?: Array<{ locale: BlogLocale; frontmatter: Frontmatter; body: string }>;
        error?: string;
      };
      if (!j.ok || !j.translations) throw new Error(j.error || 'Failed to load post');

      // Hydrate any missing locales with empty translations so the tabs
      // are always visible (and the author can fill them in).
      const byLocale = new Map(j.translations.map((t) => [t.locale, t]));
      const filled: Translation[] = LOCALES.map(
        (locale) =>
          byLocale.get(locale) ?? {
            locale,
            frontmatter: emptyFrontmatter(),
            body: '',
          },
      );

      setSlug(slugToEdit);
      setSlugLocked(true);
      setTranslations(filled);
      setActiveLocale(j.translations[0]?.locale ?? 'en');
      setCommitMessage('');
      setMode('editor');
    } catch (e) {
      alert(`Couldn't load post: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function updateFrontmatter<K extends keyof Frontmatter>(key: K, value: Frontmatter[K]) {
    setTranslations((prev) =>
      prev.map((t) =>
        t.locale === activeLocale ? { ...t, frontmatter: { ...t.frontmatter, [key]: value } } : t,
      ),
    );
  }

  function updateBody(value: string) {
    setTranslations((prev) =>
      prev.map((t) => (t.locale === activeLocale ? { ...t, body: value } : t)),
    );
  }

  // forceDraft: when provided, overrides every translation's draft flag so the
  // author doesn't have to toggle the per-locale checkbox on each tab. "Publish
  // Live" passes false (go live), "Save as Draft" passes true.
  async function publish(forceDraft?: boolean) {
    setPublishMsg(null);
    // Only publish translations that have a body — empty ones are
    // silently dropped so the author doesn't accidentally publish a
    // half-empty page in a locale they haven't translated yet.
    let filled = translations.filter((t) => t.body.trim().length > 0 && t.frontmatter.title.trim());
    if (filled.length === 0) {
      setPublishMsg('No filled translations to publish — fill in at least one language tab.');
      return;
    }
    if (typeof forceDraft === 'boolean') {
      filled = filled.map((t) => ({ ...t, frontmatter: { ...t.frontmatter, draft: forceDraft } }));
      // Keep the editor checkboxes in sync with what we just committed.
      setTranslations((prev) => prev.map((t) => ({ ...t, frontmatter: { ...t.frontmatter, draft: forceDraft } })));
    }
    setPublishing(true);
    try {
      const r = await fetch('/api/admin/blog/publish', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          commitMessage: commitMessage.trim() || undefined,
          translations: filled,
        }),
      });
      const j = (await r.json()) as {
        ok: boolean;
        committed?: Array<{ locale: string; commitSha: string }>;
        failed?: Array<{ locale: string; error: string }>;
        error?: string;
      };
      if (!j.ok) {
        setPublishMsg(
          `Publish error: ${j.error ?? ''} ${
            j.failed?.map((f) => `${f.locale}: ${f.error}`).join('; ') ?? ''
          }`.trim(),
        );
      } else {
        setPublishMsg(
          `Published ${j.committed?.length ?? 0} translation(s). Vercel will redeploy auxite.io in 2-3 min.`,
        );
        // Refresh the list so the new post shows up.
        loadPosts();
      }
    } catch (e) {
      setPublishMsg(`Network error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setPublishing(false);
    }
  }

  const active = translations.find((t) => t.locale === activeLocale)!;
  const previewHtml = useMemo(() => marked.parse(active.body || '*(empty)*', { async: false }) as string, [active.body]);

  if (mode === 'list') {
    return (
      <div className="space-y-4 text-white">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Blog Posts</h2>
          <div className="flex gap-2">
            <button
              onClick={loadPosts}
              className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg"
            >
              ↻ Refresh
            </button>
            <button
              onClick={startNew}
              className="px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-400 text-black rounded-lg font-medium"
            >
              + New Post
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Posts live in <code className="bg-slate-800 px-1 rounded">temelreiz/auxite-website</code>.
          Publishing commits MDX files via GitHub API; Vercel redeploys auxite.io
          automatically. <strong>GITHUB_REPO_TOKEN</strong> env var must be set on Vercel for the
          wallet project (fine-grained PAT, Contents:Write on auxite-website).
        </p>

        {loadingList && <div className="text-slate-400">Loading…</div>}
        {listError && (
          <div className="bg-red-950 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
            {listError}
          </div>
        )}

        {!loadingList && !listError && posts.length === 0 && (
          <div className="text-slate-400 text-sm border border-slate-700 rounded-lg p-6 text-center">
            No posts yet. Hit "New Post" to write the first one.
          </div>
        )}

        {!loadingList && posts.length > 0 && (
          <div className="overflow-x-auto border border-slate-700 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-left text-slate-300">
                <tr>
                  <th className="px-4 py-2 font-medium">Slug</th>
                  <th className="px-4 py-2 font-medium">Title</th>
                  <th className="px-4 py-2 font-medium">Category</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Languages</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.slug} className="border-t border-slate-700 hover:bg-slate-800/50">
                    <td className="px-4 py-2 font-mono text-xs text-slate-300">{post.slug}</td>
                    <td className="px-4 py-2 max-w-xs truncate">{post.preview.title || '—'}</td>
                    <td className="px-4 py-2 text-slate-400">{post.preview.category || '—'}</td>
                    <td className="px-4 py-2 text-slate-400">{post.preview.date || '—'}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        {post.locales.map((l) => (
                          <span
                            key={l}
                            className="text-[10px] px-1.5 py-0.5 bg-slate-700 rounded uppercase"
                          >
                            {l}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {post.preview.draft ? (
                        <span className="text-amber-400 text-xs">Draft</span>
                      ) : (
                        <span className="text-emerald-400 text-xs">Published</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => startEdit(post.slug)}
                        className="text-amber-400 hover:text-amber-300 text-xs"
                      >
                        Edit →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // Editor mode
  return (
    <div className="space-y-4 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMode('list')}
            className="text-slate-400 hover:text-white text-sm"
          >
            ← Back
          </button>
          <h2 className="text-xl font-semibold">{slugLocked ? `Edit: ${slug}` : 'New Post'}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => publish(true)}
            disabled={publishing}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {publishing ? '…' : 'Save as Draft'}
          </button>
          <button
            onClick={() => publish(false)}
            disabled={publishing}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg font-medium disabled:opacity-50"
          >
            {publishing ? 'Publishing…' : '🚀 Publish Live'}
          </button>
        </div>
      </div>

      {/* Slug + commit message */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Slug (URL path)</label>
          <input
            value={slug}
            onChange={(e) =>
              setSlug(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, '-')
                  .replace(/-+/g, '-')
                  .replace(/^-|-$/g, ''),
              )
            }
            disabled={slugLocked}
            placeholder="auxite-vs-paxg"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono disabled:opacity-60"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            URL will be auxite.io/&lt;lang&gt;/blog/{slug || '<slug>'}
          </p>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Commit message (optional)</label>
          <input
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="auto: blog(slug): admin publish"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Locale tabs */}
      <div className="flex gap-1 border-b border-slate-700">
        {LOCALES.map((locale) => {
          const t = translations.find((x) => x.locale === locale)!;
          const hasContent = t.body.trim().length > 0 && t.frontmatter.title.trim().length > 0;
          return (
            <button
              key={locale}
              onClick={() => setActiveLocale(locale)}
              className={`px-4 py-2 text-sm border-b-2 ${
                activeLocale === locale
                  ? 'border-amber-400 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {LOCALE_LABELS[locale]}
              {hasContent && <span className="ml-1 text-emerald-400">●</span>}
            </button>
          );
        })}
      </div>

      {/* Frontmatter form */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs text-slate-400 mb-1">Title *</label>
          <input
            value={active.frontmatter.title}
            onChange={(e) => updateFrontmatter('title', e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-slate-400 mb-1">Description *</label>
          <textarea
            value={active.frontmatter.description}
            onChange={(e) => updateFrontmatter('description', e.target.value)}
            rows={2}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Date *</label>
          <input
            type="date"
            value={active.frontmatter.date}
            onChange={(e) => updateFrontmatter('date', e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Author *</label>
          <input
            value={active.frontmatter.author}
            onChange={(e) => updateFrontmatter('author', e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Category</label>
          <input
            value={active.frontmatter.category ?? ''}
            onChange={(e) => updateFrontmatter('category', e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Hero image URL (optional)</label>
          <input
            value={active.frontmatter.hero ?? ''}
            onChange={(e) => updateFrontmatter('hero', e.target.value)}
            placeholder="/blog/auxite-vs-paxg.jpg"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-slate-400 mb-1">Tags (comma separated)</label>
          <input
            value={(active.frontmatter.tags ?? []).join(', ')}
            onChange={(e) =>
              updateFrontmatter(
                'tags',
                e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
            placeholder="tokenized gold, PAXG, RWA"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <input
            id="draft"
            type="checkbox"
            checked={!!active.frontmatter.draft}
            onChange={(e) => updateFrontmatter('draft', e.target.checked)}
          />
          <label htmlFor="draft" className="text-sm text-slate-300">
            Draft (won't appear on the live site)
          </label>
        </div>
      </div>

      {/* Body editor + preview */}
      <div className="grid grid-cols-2 gap-3" style={{ minHeight: '50vh' }}>
        <div className="flex flex-col">
          <label className="block text-xs text-slate-400 mb-1">Markdown body *</label>
          <textarea
            value={active.body}
            onChange={(e) => updateBody(e.target.value)}
            placeholder="# Heading&#10;&#10;Paragraph...&#10;&#10;## Subheading&#10;&#10;- list&#10;- items"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 font-mono text-xs text-slate-200"
            // RTL locales should type RTL for readability while still
            // writing MD source — display only, doesn't affect content.
            dir={active.locale === 'ar' ? 'rtl' : 'ltr'}
          />
        </div>
        <div className="flex flex-col">
          <label className="block text-xs text-slate-400 mb-1">Preview</label>
          <div
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm prose prose-invert max-w-none overflow-auto"
            dir={active.locale === 'ar' ? 'rtl' : 'ltr'}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>

      {publishMsg && (
        <div
          className={`p-3 rounded-lg text-sm ${
            publishMsg.toLowerCase().startsWith('published')
              ? 'bg-emerald-950 border border-emerald-700 text-emerald-200'
              : 'bg-amber-950 border border-amber-700 text-amber-200'
          }`}
        >
          {publishMsg}
        </div>
      )}
    </div>
  );
}
