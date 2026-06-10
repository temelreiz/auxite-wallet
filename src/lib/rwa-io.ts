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

// RWA.io internal assetId per token. AUXG confirmed; others via env once known.
export const RWA_IO_ASSET_IDS: Record<string, string> = {
  AUXG: process.env.RWA_IO_ASSET_AUXG || "6a280ee965c50906f83fc01e",
  AUXS: process.env.RWA_IO_ASSET_AUXS || "",
  AUXPT: process.env.RWA_IO_ASSET_AUXPT || "",
  AUXPD: process.env.RWA_IO_ASSET_AUXPD || "",
};

// Uploadable presets we provide (presetId → units). The rest (price/volume/etc.
// at project level) RWA.io sources from CoinGecko/DefiLlama automatically.
export type RwaPreset = "circulating-supply" | "total-supply" | "price" | "aum" | "nav" | "holders";

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
