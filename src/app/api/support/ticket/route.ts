import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

// GET - Support ticket listesi
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const userId = await redis.get(`user:address:${normalizedAddress}`) as string;

    if (!userId) {
      return NextResponse.json({ success: true, tickets: [] });
    }

    const ticketsJson = await redis.get(`support:tickets:${userId}`) as string | null;
    const tickets = ticketsJson ? JSON.parse(ticketsJson) : [];

    return NextResponse.json({ success: true, tickets });
  } catch (error: any) {
    console.error("Support tickets GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Yeni support ticket oluştur
export async function POST(request: NextRequest) {
  try {
    const { address, subject, category, message } = await request.json();

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    if (!subject || !message) {
      return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const userId = await redis.get(`user:address:${normalizedAddress}`) as string;

    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const ticket = {
      id: ticketId,
      subject,
      category: category || "general",
      message,
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: [],
    };

    // Ticket'ı kaydet
    await redis.set(`support:ticket:${ticketId}`, JSON.stringify(ticket));

    // Kullanıcının ticket listesine ekle
    const ticketsJson = await redis.get(`support:tickets:${userId}`) as string | null;
    const tickets = ticketsJson ? JSON.parse(ticketsJson) : [];
    tickets.unshift({
      id: ticketId,
      subject,
      category: category || "general",
      status: "open",
      preview: message.substring(0, 100),
      createdAt: new Date().toISOString(),
    });
    await redis.set(`support:tickets:${userId}`, JSON.stringify(tickets));

    console.log(`✅ Support ticket created: ${ticketId} for ${normalizedAddress}`);

    return NextResponse.json({ success: true, ticketId, ticket });
  } catch (error: any) {
    console.error("Support ticket POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
