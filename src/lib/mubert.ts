// src/lib/mubert.ts
// ============================================================================
// Mubert AI music — the music bed for Auxite Radio.
//
// Auth model:
//   company-id + license-token  (service creds, env)  → create a CUSTOMER, which
//   returns a customer-id + access-token used on the PUBLIC endpoints. We mint
//   one customer ("auxite-radio") and cache its access-token in Redis until it
//   nears expiry.
//
// Track flow (async):
//   POST /public/tracks {playlist_index, duration, ...} → {id, status:processing}
//   poll GET /public/tracks/{id} → generations[0].url (a clean, token-free
//   static-eu.gcp.mubert.com MP3 URL, valid ~15 min).
//
// We keep a small pool of ready URLs in Redis per mood so the widget gets an
// instant track most of the time; if the pool is cold we generate on demand.
// ============================================================================

import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const BASE = "https://music-api.mubert.com/api/v3";
const COMPANY_ID = process.env.MUBERT_COMPANY_ID || "";
const LICENSE_TOKEN = process.env.MUBERT_LICENSE_TOKEN || "";

// Curated moods → Mubert playlist_index (calm/chill instrumental, good for a
// "in your ear while you browse" finance radio).
export const MOODS: Record<string, string> = {
  chill: "4.0.0",   // Chill · Chillout
  calm: "3.0.2",    // Calm · Ambient · Zen
  focus: "3.0.0",   // Calm · Ambient · Meditation
};
export type Mood = keyof typeof MOODS;

const ACCESS_KEY = "mubert:access";        // cached customer creds

interface CustomerAccess { customerId: string; accessToken: string; expMs: number }

async function mintCustomer(): Promise<CustomerAccess> {
  const r = await fetch(`${BASE}/service/customers`, {
    method: "POST",
    headers: { "company-id": COMPANY_ID, "license-token": LICENSE_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ custom_id: "auxite-radio" }),
  });
  if (!r.ok) throw new Error(`mubert customer ${r.status}: ${(await r.text()).slice(0, 120)}`);
  const j = await r.json();
  const a = j?.data?.access;
  const out: CustomerAccess = {
    customerId: j?.data?.id,
    accessToken: a?.token,
    expMs: a?.expired_at ? Date.parse(a.expired_at) : Date.now() + 25 * 86400000,
  };
  if (!out.customerId || !out.accessToken) throw new Error("mubert: no access in customer response");
  return out;
}

async function getAccess(): Promise<CustomerAccess> {
  if (!COMPANY_ID || !LICENSE_TOKEN) throw new Error("Mubert creds not set");
  const cached = (await redis.get(ACCESS_KEY)) as CustomerAccess | null;
  if (cached?.accessToken && cached.expMs - Date.now() > 86400000) return cached; // >1 day left
  const fresh = await mintCustomer();
  await redis.set(ACCESS_KEY, fresh, { ex: 25 * 86400 });
  return fresh;
}

function authHeaders(a: CustomerAccess) {
  return { "customer-id": a.customerId, "access-token": a.accessToken, "Content-Type": "application/json" };
}

// Generate one track and poll until its URL is ready. Returns a clean MP3 URL.
async function generateTrack(mood: Mood, durationSec = 240): Promise<{ url: string; expMs: number } | null> {
  const a = await getAccess();
  const playlist = MOODS[mood] || MOODS.chill;
  const gen = await fetch(`${BASE}/public/tracks`, {
    method: "POST",
    headers: authHeaders(a),
    body: JSON.stringify({ playlist_index: playlist, duration: durationSec, bitrate: 128, format: "mp3", intensity: "medium", mode: "track" }),
  });
  if (!gen.ok) { console.error("[mubert] generate", gen.status, (await gen.text()).slice(0, 120)); return null; }
  const id = (await gen.json())?.data?.id;
  if (!id) return null;

  for (let i = 0; i < 24; i++) {
    const pr = await fetch(`${BASE}/public/tracks/${id}`, { headers: authHeaders(a) });
    if (pr.ok) {
      const g = (await pr.json())?.data?.generations?.[0];
      if (g?.status === "done" && g?.url) {
        const expMs = g.expired_at ? Date.parse(g.expired_at) : Date.now() + 14 * 60000;
        return { url: g.url, expMs };
      }
    }
    await new Promise((res) => setTimeout(res, 1500));
  }
  return null;
}

// Return a ready music-track URL for a mood. Generates one fresh track per call
// (unlimited quota → maximum variety); the widget prefetches the next during
// playback, so only the very first track has any wait.
export async function getMusicUrl(mood: Mood = "chill"): Promise<string | null> {
  try {
    const t = await generateTrack(mood);
    return t?.url || null;
  } catch (e) {
    console.error("[mubert] getMusicUrl failed:", e);
    return null;
  }
}
