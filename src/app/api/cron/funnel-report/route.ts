// src/app/api/cron/funnel-report/route.ts
// Weekly funnel report by email (Mondays): sign-up → KYC → first deposit, for
// the accounts opened in the last 7 and 30 days, split by acquisition source,
// plus the first deposits seen this week and what the activation series sent.
// "Funded" is any positive balance, the same test the drip and activation use.
// The card funnel and the first-purchase count leave out internal accounts; the
// target is at least 3 real first card purchases in 28 days.

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { sendEmail } from "@/lib/email";
import { DAY_MS, isFunded, isoWeek, FUNDED_ZSET, WHY_HASH, WHY_REASONS, cardStepKey, isFunnelExcluded, type CardStep } from "@/lib/activation-funnel";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const redis = Redis.fromEnv();
const TO = process.env.FUNNEL_REPORT_TO || process.env.EOD_REPORT_TO || "bs@auxite.io";
const BATCH = 40;

interface Row { signups: number; kycStarted: number; inReview: number; approved: number; funded: number }
const empty = (): Row => ({ signups: 0, kycStarted: 0, inReview: 0, approved: 0, funded: 0 });

function add(row: Row, kycStatus: string, funded: boolean) {
  row.signups++;
  if (kycStatus !== "none") row.kycStarted++;
  if (kycStatus === "under_review") row.inReview++;
  if (kycStatus === "approved") row.approved++;
  if (funded) row.funded++;
}

function sourceOf(u: Record<string, any>): string {
  const src = String(u.source || "").trim().toLowerCase();
  const platform = String(u.platform || "").trim().toLowerCase();
  return src && src !== platform ? `${src} (${platform || "?"})` : platform || "unknown";
}

export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const now = Date.now();
  const total = empty();
  const d7 = empty();
  const d30 = empty();
  const bySource7: Record<string, Row> = {};
  const bySource30: Record<string, Row> = {};
  const addrInfo = new Map<string, { email: string; created: number; source: string }>();

  const keys: string[] = await redis.keys("auth:user:*");
  for (let i = 0; i < keys.length; i += BATCH) {
    await Promise.all(
      keys.slice(i, i + BATCH).map(async (key) => {
        const u = ((await redis.hgetall(key)) || {}) as Record<string, any>;
        const created = Number(u.createdAt) || 0;
        const addr = String(u.walletAddress || "").toLowerCase();
        let kycStatus = "none";
        let funded = false;
        if (addr) {
          const [kycRaw, bal] = await Promise.all([
            redis.get(`kyc:${addr}`),
            redis.hgetall(`user:${addr}:balance`) as Promise<Record<string, unknown> | null>,
          ]);
          const kyc = kycRaw ? (typeof kycRaw === "string" ? JSON.parse(kycRaw) : kycRaw) : null;
          kycStatus = (kyc as any)?.status || "none";
          funded = isFunded(bal);
        }
        const source = sourceOf(u);
        if (addr) addrInfo.set(addr, { email: key.replace("auth:user:", ""), created, source });
        add(total, kycStatus, funded);
        if (created && now - created <= 30 * DAY_MS) {
          add(d30, kycStatus, funded);
          add((bySource30[source] ||= empty()), kycStatus, funded);
          if (now - created <= 7 * DAY_MS) {
            add(d7, kycStatus, funded);
            add((bySource7[source] ||= empty()), kycStatus, funded);
          }
        }
      }),
    );
  }

  // First deposits seen in the last 7 days (score 0 = funded before tracking).
  const firstDeposits = (await redis.zrange(FUNDED_ZSET, now - 7 * DAY_MS, now, { byScore: true })) as string[];
  const weeks = [isoWeek(now), isoWeek(now - 7 * DAY_MS)];
  const sends = await Promise.all(weeks.map((w) => redis.hgetall(`activation:sent:${w}`) as Promise<Record<string, unknown> | null>));
  const sendsLast7: Record<string, number> = {};
  for (const s of sends) for (const [k, v] of Object.entries(s || {})) sendsLast7[k] = (sendsLast7[k] || 0) + Number(v);

  // Card funnel: first time each real account reached each step.
  const cardCount = async (step: CardStep, days: number) => {
    const addrs = (await redis.zrange(cardStepKey(step), now - days * DAY_MS, now, { byScore: true })) as string[];
    return addrs.filter((a) => !isFunnelExcluded(addrInfo.get(a)?.email));
  };
  const cardRow = async (days: number) => {
    const [quote, intent, paid] = await Promise.all([cardCount("quote", days), cardCount("intent", days), cardCount("paid", days)]);
    return { quote: quote.length, intent: intent.length, paid };
  };
  const [card7, card28] = await Promise.all([cardRow(7), cardRow(28)]);
  const whyAnswers = ((await redis.hgetall(WHY_HASH)) || {}) as Record<string, unknown>;
  const whyCounts = WHY_REASONS.map((r) => [r, Object.values(whyAnswers).filter((v) => v === r).length] as const);

  const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "—");
  const td = 'style="padding:4px 10px;border-bottom:1px solid #eee;text-align:right"';
  const th = 'style="padding:4px 10px;border-bottom:1px solid #ccc;text-align:right;font-weight:600"';
  const rowHtml = (label: string, r: Row) =>
    `<tr><td style="padding:4px 10px;border-bottom:1px solid #eee">${label}</td><td ${td}>${r.signups}</td><td ${td}>${r.kycStarted}</td><td ${td}>${r.inReview}</td><td ${td}>${r.approved} <span style="color:#999">${pct(r.approved, r.signups)}</span></td><td ${td}>${r.funded} <span style="color:#999">${pct(r.funded, r.signups)}</span></td></tr>`;
  const table = (rows: [string, Row][]) =>
    `<table style="border-collapse:collapse;font-size:13px;margin:6px 0 18px"><tr><th style="padding:4px 10px;border-bottom:1px solid #ccc;text-align:left">Cohort</th><th ${th}>Sign-ups</th><th ${th}>KYC started</th><th ${th}>In review</th><th ${th}>Approved</th><th ${th}>Funded</th></tr>${rows.map(([l, r]) => rowHtml(l, r)).join("")}</table>`;
  const sorted = (m: Record<string, Row>) => Object.entries(m).sort((a, b) => b[1].signups - a[1].signups);

  const depositList = firstDeposits.length
    ? `<ul>${firstDeposits
        .map((a) => {
          const i = addrInfo.get(a);
          return `<li>${i?.email || a} — signed up ${i?.created ? new Date(i.created).toISOString().slice(0, 10) : "?"}, source ${i?.source || "?"}</li>`;
        })
        .join("")}</ul>`
    : "<p>None.</p>";
  const sendList = Object.keys(sendsLast7).length
    ? Object.entries(sendsLast7).sort().map(([k, v]) => `${k}: ${v}`).join(" · ")
    : "none";

  const paidList = card28.paid.length
    ? `<ul>${card28.paid
        .map((a) => {
          const i = addrInfo.get(a);
          return `<li>${i?.email || a} — signed up ${i?.created ? new Date(i.created).toISOString().slice(0, 10) : "?"}, source ${i?.source || "?"}</li>`;
        })
        .join("")}</ul>`
    : "<p>None.</p>";

  const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#222;font-size:14px">
<h2 style="font-size:17px">Auxite funnel — week ${isoWeek(now)}</h2>
<p><b>Real first card purchases, last 28 days: ${card28.paid.length} (target: at least 3)</b></p>
${paidList}
<table style="border-collapse:collapse;font-size:13px;margin:6px 0 18px"><tr><th style="padding:4px 10px;border-bottom:1px solid #ccc;text-align:left">First time at each step</th><th ${th}>Saw card price</th><th ${th}>Started payment</th><th ${th}>Paid</th></tr>
<tr><td style="padding:4px 10px;border-bottom:1px solid #eee">Last 7 days</td><td ${td}>${card7.quote}</td><td ${td}>${card7.intent}</td><td ${td}>${card7.paid.length}</td></tr>
<tr><td style="padding:4px 10px;border-bottom:1px solid #eee">Last 28 days</td><td ${td}>${card28.quote}</td><td ${td}>${card28.intent}</td><td ${td}>${card28.paid.length}</td></tr></table>
<p><b>Why people stopped (all answers):</b> ${whyCounts.map(([r, n]) => `${r}: ${n}`).join(" · ")}</p>
<p><b>First deposits this week: ${firstDeposits.length}</b></p>
${depositList}
<h3 style="font-size:15px;margin-top:20px">Sign-ups by cohort (status today)</h3>
${table([["Last 7 days", d7], ["Last 30 days", d30], ["All time", total]])}
<h3 style="font-size:15px">Last 7 days by source</h3>
${table(sorted(bySource7))}
<h3 style="font-size:15px">Last 30 days by source</h3>
${table(sorted(bySource30))}
<p><b>Activation series sends (this + last ISO week):</b> ${sendList}</p>
<p style="color:#888;font-size:12px">Funded = any positive balance today, including internal and test accounts. "KYC started" includes anyone who opened verification. Card steps cover app and web, exclude @auxite.io and FUNNEL_EXCLUDE_EMAILS, and start from this report's first deployment; a refund removes the purchase. Check the listed emails for test accounts.</p>
</div>`;

  await sendEmail({ to: TO, subject: `Auxite funnel ${isoWeek(now)}: ${d7.signups} sign-ups, ${d7.approved} KYC, ${firstDeposits.length} first deposits, ${card28.paid.length}/3 first card buys`, html });
  return NextResponse.json({ success: true, to: TO, d7, d30, total, firstDeposits: firstDeposits.length, sendsLast7, card7: { ...card7, paid: card7.paid.length }, card28: { ...card28, paid: card28.paid.length }, whyCounts: Object.fromEntries(whyCounts) });
}
