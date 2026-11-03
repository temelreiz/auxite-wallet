// src/app/api/cron/auxr-buy-reward/route.ts
// Daily job for the AUXR buy-reward campaign (rules in src/lib/auxr-buy-reward.ts).
//   - on/after settleAt: pays the rewards once, pushes each winner, emails the report
//   - while the campaign runs: a Monday status email (participants, net buy, cost)
// Auth: Authorization: Bearer ${CRON_SECRET}.

import { NextRequest, NextResponse } from "next/server";
import { isCronRequest } from "@/lib/security/require-user";
import { sendEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/expo-push";
import { CAMPAIGN, campaignActive, campaignStatus, settleCampaign, type SettlementReport } from "@/lib/auxr-buy-reward";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const REPORT_TO = process.env.EOD_REPORT_TO || "bs@auxite.io";

function settlementHtml(r: SettlementReport): string {
  const rows = r.awards
    .map((a) => `<tr><td>${a.address}</td><td>$${a.netUSD.toFixed(2)}</td><td>${a.reward.toFixed(6)}</td></tr>`)
    .join("");
  const skips = r.skipped.map((s) => `<li>${s.address} — $${s.netUSD.toFixed(2)} — ${s.reason}</li>`).join("");
  const fails = r.failed.map((f) => `<li>${f.address} — ${f.error}</li>`).join("");
  return `<h2>AUXR alım kampanyası (${r.campaignId}) ödendi</h2>
<p>Ödenen: <b>${r.totalPaid.toFixed(6)} AUXR</b> / havuz ${CAMPAIGN.POOL_AUXR} · kazanan ${r.awards.length} · elenen ${r.skipped.length} · ölçek ${r.scale.toFixed(4)}</p>
<table border="1" cellpadding="4" style="border-collapse:collapse"><tr><th>Adres</th><th>Net alım</th><th>Ödül AUXR</th></tr>${rows}</table>
${skips ? `<h3>Elenenler</h3><ul>${skips}</ul>` : ""}
${fails ? `<h3 style="color:#b00">Hata (elle kontrol et — işaret konuldu, tekrar ödenmez)</h3><ul>${fails}</ul>` : ""}`;
}

export async function GET(request: NextRequest) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report = await settleCampaign();
  if (report) {
    for (const a of report.awards) {
      if (!(a.reward > 0) || report.failed.some((f) => f.address === a.address)) continue;
      sendPushToUser(
        a.address,
        "AUXR reward credited",
        `${a.reward.toFixed(4)} AUXR from the buy campaign has been added to your balance.`,
        { type: "auxr_campaign_reward", screen: "/(tabs)/auxr" },
      ).catch(() => {});
    }
    await sendEmail({ to: REPORT_TO, subject: `AUXR kampanyası ödendi: ${report.totalPaid.toFixed(4)} AUXR`, html: settlementHtml(report) });
    return NextResponse.json({ settled: true, totalPaid: report.totalPaid, awards: report.awards.length, skipped: report.skipped.length, failed: report.failed.length });
  }

  const now = new Date();
  if (campaignActive(now.getTime()) && now.getUTCDay() === 1) {
    const s = await campaignStatus();
    await sendEmail({
      to: REPORT_TO,
      subject: `AUXR kampanyası haftalık: ${s.qualifying} hak kazanan, ~${s.estimatedReward.toFixed(2)} AUXR`,
      html: `<p>Katılımcı: ${s.participants} · 100$+ net alım: ${s.qualifying} · toplam net alım: $${s.netUSD.toFixed(2)} · tahmini ödül: ${s.estimatedReward.toFixed(2)} / ${CAMPAIGN.POOL_AUXR} AUXR</p><p>Elde tutma ve KYC kontrolü ${new Date(CAMPAIGN.settleAt).toISOString().slice(0, 10)} hesaplaşmasında yapılır.</p>`,
    });
  }
  return NextResponse.json({ settled: false, active: campaignActive(now.getTime()) });
}
