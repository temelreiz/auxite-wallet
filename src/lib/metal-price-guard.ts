// src/lib/metal-price-guard.ts
// Prices a metal off international spot when its KuveytTürk quote has drifted
// away from it. KT is the venue we procure from, so its rate is normally the
// right charge price; but a frozen or broken KT quote (palladium stuck at
// ~$50/g for weeks while spot was ~$30) would sell to users at a price no
// market supports. The metal keeps trading, on spot, until KT comes back in
// line. AUXR is not affected: its NAV is always spot (auxr-pricing.ts).
//
// The comparison uses the KT bid/ask MID against spot. KT's ask alone sits a
// few percent above spot for every metal (bank spread plus the TL→USD leg), so
// comparing the ask would switch healthy metals too.
//
// No reference = no verdict: when spot is missing or stale, KT stays the price.
//
// Ops are emailed when a metal switches source (on the transition only, never
// on every check).

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

export interface DeviationVerdict {
  /** True when the KT quote is too far from spot: charge spot instead. */
  useSpot: boolean;
  /** (KT mid − spot) / spot, or null when there is no usable spot. */
  deviation: number | null;
  ktMid: number;
  /** Fresh spot, USD per gram; null when there is none. */
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
  if (!fresh || !spot || !(spot > 0) || !(ktMid > 0)) return { useSpot: false, deviation: null, ktMid, spot: null };
  const deviation = (ktMid - spot) / spot;
  return { useSpot: Math.abs(deviation) > MAX_KT_DEVIATION, deviation, ktMid, spot };
}

/** Record the verdict; email ops only when the price source flips. */
export async function notePriceSource(symbol: string, v: DeviationVerdict): Promise<void> {
  if (v.deviation === null) return;
  const key = `metal:price-source:${symbol}`;
  const next = v.useSpot ? 'spot' : 'kt';
  const prev = await redis.getset(key, next).catch(() => null);
  if (prev === next || (prev === null && next === 'kt')) return;
  const pct = `${v.deviation >= 0 ? '+' : ''}${(v.deviation * 100).toFixed(1)}%`;
  const name = NAMES[symbol] || symbol;
  await sendEmail({
    to: REPORT_TO,
    subject: v.useSpot
      ? `${name} spot fiyata geçti: KT fiyatı spottan ${pct} sapıyor`
      : `${name} yeniden KT fiyatında (KT–spot farkı ${pct})`,
    html: `<p>${name} (${symbol}) — KT orta fiyat $${v.ktMid.toFixed(2)}/g, spot $${v.spot!.toFixed(2)}/g, fark ${pct} (eşik ±${(MAX_KT_DEVIATION * 100).toFixed(0)}%).</p>
<p>${v.useSpot
      ? 'Bu metal artık KT yerine uluslararası spot fiyat + marjla alınıp satılıyor. KT\'den tedarik maliyeti spottan yüksekse her satışta fark bizden çıkar; KT fiyatını kontrol et. KT spota yaklaşınca kendiliğinden KT\'ye döner.'
      : 'KT fiyatı yeniden spotla uyumlu; bu metal tekrar KT fiyatıyla işlem görüyor.'}</p>`,
  }).catch((e) => console.error('[metal-price-guard] alert email failed:', e));
}
