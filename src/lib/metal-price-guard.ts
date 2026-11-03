// src/lib/metal-price-guard.ts
// Pauses trading in a metal whose KuveytTürk quote has drifted away from the
// international spot. KT is the venue we procure from, so its rate is normally
// the right charge price; but a frozen or broken KT quote (palladium stuck at
// ~$50/g for weeks while spot was ~$30) would sell to users at a price no
// market supports, and buy back from them at one we cannot resell at.
//
// The comparison uses the KT bid/ask MID against spot. KT's ask alone sits a
// few percent above spot for every metal (bank spread plus the TL→USD leg), so
// comparing the ask would pause healthy metals too.
//
// No reference = no verdict: when spot is missing or stale the guard stays
// open, since KT itself is the primary price and blocking on a dead GoldAPI
// would take all trading down.
//
// Ops are emailed when a metal enters or leaves the paused state (on the
// transition only, never on every check).

import { Redis } from '@upstash/redis';
import { sendEmail } from '@/lib/email';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const MAX_KT_DEVIATION = Number(process.env.METAL_PRICE_MAX_DEVIATION) > 0
  ? Number(process.env.METAL_PRICE_MAX_DEVIATION)
  : 0.05;
const MAX_SPOT_AGE_MS = 60 * 60 * 1000;
const REPORT_TO = process.env.EOD_REPORT_TO || 'bs@auxite.io';

const NAMES: Record<string, string> = { AUXG: 'Altın', AUXS: 'Gümüş', AUXPT: 'Platin', AUXPD: 'Paladyum' };

export class MetalPricePausedError extends Error {
  constructor(public metal: string, public deviation: number) {
    super(`${metal} trading paused: KuveytTürk price deviates ${(deviation * 100).toFixed(1)}% from spot`);
    this.name = 'MetalPricePausedError';
  }
}

export interface DeviationVerdict {
  paused: boolean;
  /** (KT mid − spot) / spot, or null when there is no usable spot. */
  deviation: number | null;
  ktMid: number;
  spot: number | null;
}

export function assessKtDeviation(
  ktBuy: number,
  ktSell: number,
  spot: number | undefined,
  spotTimestamp: number,
  now = Date.now(),
): DeviationVerdict {
  const ktMid = ktSell > 0 ? (ktBuy + ktSell) / 2 : ktBuy;
  const fresh = spotTimestamp > 0 && now - spotTimestamp < MAX_SPOT_AGE_MS;
  if (!fresh || !spot || !(spot > 0) || !(ktMid > 0)) return { paused: false, deviation: null, ktMid, spot: null };
  const deviation = (ktMid - spot) / spot;
  return { paused: Math.abs(deviation) > MAX_KT_DEVIATION, deviation, ktMid, spot };
}

/** Record the verdict; email ops only when the paused state flips. */
export async function notePauseState(symbol: string, v: DeviationVerdict): Promise<void> {
  if (v.deviation === null) return;
  const key = `metal:price-guard:${symbol}`;
  const next = v.paused ? 'paused' : 'ok';
  const prev = await redis.getset(key, next).catch(() => null);
  if (prev === next || (prev === null && next === 'ok')) return;
  const pct = `${v.deviation >= 0 ? '+' : ''}${(v.deviation * 100).toFixed(1)}%`;
  const name = NAMES[symbol] || symbol;
  await sendEmail({
    to: REPORT_TO,
    subject: v.paused
      ? `${name} alım-satımı DURDURULDU: KT fiyatı spottan ${pct} sapıyor`
      : `${name} alım-satımı yeniden açıldı (KT–spot farkı ${pct})`,
    html: `<p>${name} (${symbol}) — KT orta fiyat $${v.ktMid.toFixed(2)}/g, spot $${v.spot!.toFixed(2)}/g, fark ${pct} (eşik ±${(MAX_KT_DEVIATION * 100).toFixed(0)}%).</p>
<p>${v.paused
      ? 'Fiyat KT\'den alındığı için bu metalde alım ve satım otomatik olarak durduruldu; diğer metaller etkilenmez. KT fiyatı spota yaklaşınca kendiliğinden açılır.'
      : 'KT fiyatı yeniden spotla uyumlu; alım-satım otomatik olarak açıldı.'}</p>`,
  }).catch((e) => console.error('[metal-price-guard] alert email failed:', e));
}

const NAMES_EN: Record<string, string> = { AUXG: 'Gold', AUXS: 'Silver', AUXPT: 'Platinum', AUXPD: 'Palladium' };

/** Client-facing body for a route that hit a paused metal, or null for any other error. */
export function pausedErrorBody(e: unknown): { error: string; code: 'metal_paused'; metal: string } | null {
  if (!(e instanceof MetalPricePausedError)) return null;
  return {
    error: `${NAMES[e.metal] || e.metal} alım-satımı fiyat doğrulaması nedeniyle geçici olarak durduruldu. / ${NAMES_EN[e.metal] || e.metal} trading is temporarily paused while its price is verified.`,
    code: 'metal_paused',
    metal: e.metal,
  };
}
