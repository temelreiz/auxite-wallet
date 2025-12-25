import { NextResponse } from "next/server";
import { updateOraclePrices } from "@/lib/v6-token-service";

export const maxDuration = 30;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const success = await updateOraclePrices();
  return NextResponse.json({ success, timestamp: Date.now() });
}
