// src/lib/partners-engine.ts
//
// Server-side client for the Auxite Partners engine's admin API. The admin key
// stays on the server; the admin panel only talks to /api/admin/partners.

const DEFAULT_URL = "https://api.auxitepartners.com";
const TIMEOUT_MS = 20_000;

export class PartnersEngineUnavailable extends Error {}

export interface EngineResponse {
  status: number;
  body: unknown;
}

export async function callPartnersEngine(path: string, init: { method?: string; body?: unknown } = {}): Promise<EngineResponse> {
  const key = process.env.PARTNERS_ENGINE_ADMIN_KEY;
  if (!key) throw new PartnersEngineUnavailable("PARTNERS_ENGINE_ADMIN_KEY is not set");

  const base = process.env.PARTNERS_ENGINE_URL || DEFAULT_URL;
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method: init.method ?? "GET",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new PartnersEngineUnavailable("The engine didn't answer");
  }

  try {
    return { status: response.status, body: await response.json() };
  } catch {
    throw new PartnersEngineUnavailable("The engine sent an unreadable answer");
  }
}
