import { NextRequest, NextResponse } from "next/server";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const TWILIO_VERIFY_SID = "VA08d05fab6141b55c1be51bf41743b330";

// POST /api/verify/send — Send SMS verification code
export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: "Phone number required" }, { status: 400 });
    }

    const url = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SID}/Verifications`;

    const params = new URLSearchParams();
    params.append("To", phone);
    params.append("Channel", "sms");

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[Verify] Send failed:", data);
      return NextResponse.json({ error: data.message || "Failed to send code" }, { status: 400 });
    }

    console.log(`[Verify] SMS sent to ${phone}, status: ${data.status}`);
    return NextResponse.json({ success: true, status: data.status });
  } catch (error: any) {
    console.error("[Verify] Send error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
