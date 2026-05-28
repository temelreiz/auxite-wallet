// /api/admin/push-kyc-pending — manual dry-run / send for the KYC-pending
// localized reminder. Auth: CRON_SECRET. Dry-run by default; real send needs
// ?send=true&confirm=yes. The daily automated send is /api/cron/kyc-pending-blast.

import { NextRequest, NextResponse } from "next/server";
import { runKycPendingBlast } from "@/lib/kyc-pending-push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sp = new URL(req.url).searchParams;
  const doSend = sp.get("send") === "true";
  const confirmed = sp.get("confirm") === "yes";

  if (doSend && !confirmed) {
    const preview = await runKycPendingBlast({ send: false });
    return NextResponse.json({ error: "pass &confirm=yes with &send=true", ...preview }, { status: 400 });
  }

  const result = await runKycPendingBlast({ send: doSend });
  return NextResponse.json(result);
}
