import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

// GET - Trusted contacts listesi
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
      return NextResponse.json({ success: true, contacts: [] });
    }

    const contactsJson = await redis.get(`trusted-contacts:${userId}`) as string | null;
    const contacts = contactsJson ? JSON.parse(contactsJson) : [];

    return NextResponse.json({ success: true, contacts });
  } catch (error: any) {
    console.error("Trusted contacts GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Trusted contact ekle/güncelle
export async function POST(request: NextRequest) {
  try {
    const { address, contactId, role, name, email, phone, relationship } = await request.json();

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    if (!role || !name || !email) {
      return NextResponse.json({ error: "Role, name and email are required" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    let userId = await redis.get(`user:address:${normalizedAddress}`) as string;

    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const contactsJson = await redis.get(`trusted-contacts:${userId}`) as string | null;
    const contacts = contactsJson ? JSON.parse(contactsJson) : [];

    if (contactId) {
      // Güncelleme
      const index = contacts.findIndex((c: any) => c.id === contactId);
      if (index === -1) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      }
      contacts[index] = {
        ...contacts[index],
        role,
        name,
        email,
        phone: phone || "",
        relationship: relationship || "",
        updatedAt: new Date().toISOString(),
      };
    } else {
      // Yeni ekleme — aynı role'de zaten var mı kontrol et
      const existingIndex = contacts.findIndex((c: any) => c.role === role);
      const newContact = {
        id: `tc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        role,
        name,
        email,
        phone: phone || "",
        relationship: relationship || "",
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex !== -1) {
        // Aynı role'deki kişiyi değiştir
        contacts[existingIndex] = newContact;
      } else {
        contacts.push(newContact);
      }
    }

    await redis.set(`trusted-contacts:${userId}`, JSON.stringify(contacts));

    console.log(`✅ Trusted contact saved for ${normalizedAddress}`);

    return NextResponse.json({ success: true, contacts });
  } catch (error: any) {
    console.error("Trusted contacts POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Trusted contact sil
export async function DELETE(request: NextRequest) {
  try {
    const { address, contactId } = await request.json();

    if (!address || !contactId) {
      return NextResponse.json({ error: "Address and contactId required" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const userId = await redis.get(`user:address:${normalizedAddress}`) as string;

    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const contactsJson = await redis.get(`trusted-contacts:${userId}`) as string | null;
    const contacts = contactsJson ? JSON.parse(contactsJson) : [];

    const filtered = contacts.filter((c: any) => c.id !== contactId);

    if (filtered.length === contacts.length) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    await redis.set(`trusted-contacts:${userId}`, JSON.stringify(filtered));

    console.log(`✅ Trusted contact deleted for ${normalizedAddress}: ${contactId}`);

    return NextResponse.json({ success: true, contacts: filtered });
  } catch (error: any) {
    console.error("Trusted contacts DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
