// src/lib/rwa-io.ts
// ============================================================================
// RWA.io Insights API — push Auxite token metrics (supply, price, AUM) so they
// show on our rwa.io project profile (slug: auxite-gold) and complete token
// verification ("send your project data via API to complete the registration").
//
// Flow (per tokenized asset):
//   1. GET  /tokenized-asset-time-series/info?assetId=...        → existing series
//   2. POST /tokenized-asset-time-series/create?assetId=...      → create uploadable
//      series for a preset (returns the tsId)
//   3. POST /tokenized-asset-time-series/data/add?assetId=...    → push datapoints
//      { tsId, records:[{ timestamp: HOURLY unix-ms, value: "<number string>" }] }
//
// Auth: x-api-key header (RWA_IO_API_KEY — write key, set in Vercel only).
// assetId = RWA.io's internal id per token (from the issuer dashboard).
// ============================================================================

const BASE = "https://api.rwa.io";
const KEY = process.env.RWA_IO_API_KEY || "";

// RWA.io internal assetId per token (from the issuer dashboard asset-token URL:
// app.rwa.io/asset-token/<slug>/<assetId>). Env overrides allowed.
export const RWA_IO_ASSET_IDS: Record<string, string> = {
  AUXG: process.env.RWA_IO_ASSET_AUXG || "6a280ee965c50906f83fc01e",
  AUXS: process.env.RWA_IO_ASSET_AUXS || "6a2811d965c50906f83fc022",
  AUXPT: process.env.RWA_IO_ASSET_AUXPT || "6a2812b465c50906f83fc026",
  AUXPD: process.env.RWA_IO_ASSET_AUXPD || "6a28141b65c50906f83fc02a",
};

// Uploadable presets we provide (presetId → units). The rest (price/volume/etc.
// at project level) RWA.io sources from CoinGecko/DefiLlama automatically.
export type RwaPreset =
  | "circulating-supply" | "total-supply" | "price" | "aum" | "nav"
  | "holders" | "tokenized-value" | "volume-24h" | "daily-tx" | "daily-active-addresses";

const headers = () => ({ "x-api-key": KEY, "content-type": "application/json", accept: "application/json" });

async function seriesInfo(assetId: string): Promise<any[]> {
  try {
    const r = await fetch(`${BASE}/tokenized-asset-time-series/info?assetId=${assetId}`, { headers: headers() });
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j?.infos) ? j.infos : [];
  } catch { return []; }
}

async function createSeries(assetId: string, presetId: string, chainId: string): Promise<string | null> {
  try {
    const r = await fetch(`${BASE}/tokenized-asset-time-series/create?assetId=${assetId}`, {
      method: "POST", headers: headers(),
      body: JSON.stringify({ presets: [{ presetId, chainId }] }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.infos?.[0]?.id || null;
  } catch { return null; }
}

// Reuse an uploadable series for this preset+chain if present, else create one.
async function getOrCreateSeries(assetId: string, presetId: string, chainId: string, infos: any[]): Promise<string | null> {
  const existing = infos.find(
    (i) => i.presetId === presetId && i.canUploadData && (i.chainId === chainId || i.chainId == null),
  );
  if (existing?.id) return existing.id;
  return createSeries(assetId, presetId, chainId);
}

async function addData(assetId: string, tsId: string, timestampMs: number, value: number): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/tokenized-asset-time-series/data/add?assetId=${assetId}`, {
      method: "POST", headers: headers(),
      body: JSON.stringify({ tsId, records: [{ timestamp: timestampMs, value: String(value) }] }),
    });
    return r.ok;
  } catch { return false; }
}

// ── PROJECT-LEVEL time series (aggregate across all tokens) ─────────────────
// Endpoints: info/data/add use ?slug=, create uses ?projectId= (derived from the
// info response, so the slug alone is enough).
export type ProjectPreset =
  | "price" | "volume-24h" | "market-cap" | "circulating-supply" | "total-supply"
  | "tvl" | "aum" | "unique-wallets" | "daily-tx" | "holders" | "daily-active-addresses";

const PROJECT_SLUG = process.env.RWA_IO_PROJECT_SLUG || "auxite-gold";

async function projectInfo(slug: string): Promise<any[]> {
  try {
    const r = await fetch(`${BASE}/project-time-series/info?slug=${encodeURIComponent(slug)}`, { headers: headers() });
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j?.infos) ? j.infos : [];
  } catch { return []; }
}

async function projectCreateSeries(projectId: string, presetId: string, dbg?: any): Promise<string | null> {
  try {
    const r = await fetch(`${BASE}/project-time-series/create?projectId=${encodeURIComponent(projectId)}`, {
      method: "POST", headers: headers(),
      body: JSON.stringify({ presets: [{ presetId }] }),
    });
    const body = await r.text();
    if (dbg) { dbg.createStatus = r.status; dbg.createBody = body.slice(0, 300); }
    if (!r.ok) return null;
    const j = JSON.parse(body || "{}");
    return j?.infos?.[0]?.id || null;
  } catch (e: any) { if (dbg) dbg.createErr = String(e?.message); return null; }
}

async function projectAddData(slug: string, tsId: string, timestampMs: number, value: number, dbg?: any): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/project-time-series/data/add?slug=${encodeURIComponent(slug)}`, {
      method: "POST", headers: headers(),
      body: JSON.stringify({ tsId, records: [{ timestamp: timestampMs, value: String(value) }] }),
    });
    if (dbg) { dbg.addStatus = r.status; if (!r.ok) dbg.addBody = (await r.text()).slice(0, 300); }
    return r.ok;
  } catch (e: any) { if (dbg) dbg.addErr = String(e?.message); return false; }
}

export interface ProjectPushResult { slug: string; projectId: string | null; pushed: string[]; failed: string[]; skipped?: string; debug?: any }

// Push aggregate project metrics (market-cap, tvl, aum, holders, unique-wallets…).
export async function pushProjectMetrics(
  metrics: { presetId: ProjectPreset; value: number }[],
  slug: string = PROJECT_SLUG,
  debug = false,
): Promise<ProjectPushResult> {
  const pushed: string[] = [];
  const failed: string[] = [];
  if (!KEY) return { slug, projectId: null, pushed, failed, skipped: "RWA_IO_API_KEY not set" };

  const hourMs = Math.floor(Date.now() / 3600000) * 3600000;
  const infos = await projectInfo(slug);
  const projectId: string | null = infos.find((i) => i.projectId)?.projectId || null;
  const dbgOut: any = debug ? { existing: infos.map((i) => ({ presetId: i.presetId, canUploadData: i.canUploadData, id: i.id })), steps: {} } : null;

  for (const m of metrics) {
    if (!(m.value > 0)) { failed.push(`${m.presetId}(no-value)`); continue; }
    const dbg: any = dbgOut ? (dbgOut.steps[m.presetId] = {}) : undefined;
    let tsId: string | null =
      infos.find((i) => i.presetId === m.presetId && i.canUploadData)?.id || null;
    if (dbg) dbg.existingTsId = tsId;
    if (!tsId && projectId) tsId = await projectCreateSeries(projectId, m.presetId, dbg);
    if (dbg) dbg.tsId = tsId;
    if (tsId && (await projectAddData(slug, tsId, hourMs, m.value, dbg))) pushed.push(m.presetId);
    else failed.push(m.presetId);
  }
  return { slug, projectId, pushed, failed, ...(dbgOut ? { debug: dbgOut } : {}) };
}

export interface PushResult { symbol: string; assetId: string; pushed: string[]; failed: string[]; skipped?: string }

// Push a set of metrics for one token at the current (hourly-floored) timestamp.
export async function pushTokenMetrics(
  symbol: string,
  chainId: string,
  metrics: { presetId: RwaPreset; value: number }[],
): Promise<PushResult> {
  const assetId = RWA_IO_ASSET_IDS[symbol] || "";
  const pushed: string[] = [];
  const failed: string[] = [];
  if (!KEY) return { symbol, assetId, pushed, failed, skipped: "RWA_IO_API_KEY not set" };
  if (!assetId) return { symbol, assetId, pushed, failed, skipped: "assetId not configured" };

  // RWA.io requires hourly UNIX-ms timestamps.
  const hourMs = Math.floor(Date.now() / 3600000) * 3600000;
  const infos = await seriesInfo(assetId);

  for (const m of metrics) {
    if (!(m.value > 0)) { failed.push(`${m.presetId}(no-value)`); continue; }
    const tsId = await getOrCreateSeries(assetId, m.presetId, chainId, infos);
    if (tsId && (await addData(assetId, tsId, hourMs, m.value))) pushed.push(m.presetId);
    else failed.push(m.presetId);
  }
  return { symbol, assetId, pushed, failed };
}
