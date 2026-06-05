// Thin GitHub Contents API client used by the blog admin tab to read,
// write, and update MDX files in the auxite-website repo without ever
// shelling out to git on Vercel.
//
// Required env:
//   GITHUB_REPO_TOKEN  fine-grained PAT, contents:write on auxite-website
//
// Notes:
//   - Every write goes through the Contents API in a single API call,
//     which means a single commit per file. Bulk publishes loop and
//     produce N commits — fine for our volume (a few posts a week).
//   - We always read the current sha before updating so we don't smash
//     a concurrent edit. New files omit sha entirely.

const OWNER = 'temelreiz';
const REPO = 'auxite-website';
const BRANCH = 'main';
const CONTENT_PREFIX = 'src/content/blog';

function token(): string {
  const t = process.env.GITHUB_REPO_TOKEN;
  if (!t) throw new Error('GITHUB_REPO_TOKEN not configured');
  return t;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${token()}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'auxite-admin',
  };
}

interface DirEntry {
  type: 'file' | 'dir';
  name: string;
  path: string;
  sha: string;
}

/** List all blog post slugs by enumerating top-level dirs under content/blog. */
export async function listSlugs(): Promise<string[]> {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${CONTENT_PREFIX}?ref=${BRANCH}`;
  const r = await fetch(url, { headers: authHeaders(), cache: 'no-store' });
  if (r.status === 404) return [];
  if (!r.ok) throw new Error(`GitHub list dirs failed: ${r.status}`);
  const entries = (await r.json()) as DirEntry[];
  return entries.filter((e) => e.type === 'dir').map((e) => e.name);
}

/** Locales for which a given slug has an MDX file. */
export async function listLocalesForSlug(slug: string): Promise<string[]> {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${CONTENT_PREFIX}/${slug}?ref=${BRANCH}`;
  const r = await fetch(url, { headers: authHeaders(), cache: 'no-store' });
  if (r.status === 404) return [];
  if (!r.ok) throw new Error(`GitHub list locales failed: ${r.status}`);
  const entries = (await r.json()) as DirEntry[];
  return entries
    .filter((e) => e.type === 'file' && e.name.endsWith('.mdx'))
    .map((e) => e.name.replace(/\.mdx$/, ''));
}

interface FileResult {
  content: string; // raw MDX (frontmatter + body, decoded)
  sha: string; // needed for updates
}

/** Read one (slug, locale) MDX file. Returns null when the file doesn't exist. */
export async function readFile(slug: string, locale: string): Promise<FileResult | null> {
  const path = `${CONTENT_PREFIX}/${slug}/${locale}.mdx`;
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`;
  const r = await fetch(url, { headers: authHeaders(), cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub read file failed: ${r.status}`);
  const j = (await r.json()) as { content: string; encoding: string; sha: string };
  if (j.encoding !== 'base64') throw new Error(`Unexpected encoding ${j.encoding}`);
  // Github wraps base64 with newlines — buffer normalises whitespace itself.
  const decoded = Buffer.from(j.content, 'base64').toString('utf8');
  return { content: decoded, sha: j.sha };
}

/**
 * Create or update a single MDX file. Falls back to a no-sha create when the
 * file doesn't already exist on the branch.
 */
export async function writeFile(
  slug: string,
  locale: string,
  body: string,
  commitMessage: string,
): Promise<{ commitSha: string }> {
  const path = `${CONTENT_PREFIX}/${slug}/${locale}.mdx`;
  const existing = await readFile(slug, locale);

  const r = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`,
    {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: commitMessage,
        content: Buffer.from(body, 'utf8').toString('base64'),
        branch: BRANCH,
        ...(existing ? { sha: existing.sha } : {}),
      }),
    },
  );

  if (!r.ok) {
    const errText = await r.text();
    throw new Error(`GitHub write failed (${r.status}): ${errText}`);
  }
  const j = (await r.json()) as { commit: { sha: string } };
  return { commitSha: j.commit.sha };
}

/**
 * Delete an MDX file (used when removing a translation, not implemented in
 * the v1 admin UI but exported here so it's a no-brainer to wire later).
 */
export async function deleteFile(slug: string, locale: string, message: string): Promise<void> {
  const path = `${CONTENT_PREFIX}/${slug}/${locale}.mdx`;
  const existing = await readFile(slug, locale);
  if (!existing) return; // already gone
  const r = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`,
    {
      method: 'DELETE',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, branch: BRANCH, sha: existing.sha }),
    },
  );
  if (!r.ok) {
    const errText = await r.text();
    throw new Error(`GitHub delete failed (${r.status}): ${errText}`);
  }
}
