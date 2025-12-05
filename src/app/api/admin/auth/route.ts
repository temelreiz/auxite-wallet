import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const SESSION_TTL = 60 * 60 * 24; // 24 saat

function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// POST - Login
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    if (!ADMIN_PASSWORD) {
      return NextResponse.json({ 
        success: false, 
        error: "Admin not configured" 
      }, { status: 500 });
    }
    
    if (password !== ADMIN_PASSWORD) {
      // Rate limit için log
      console.log("Failed admin login attempt");
      return NextResponse.json({ 
        success: false, 
        error: "Invalid password" 
      }, { status: 401 });
    }
    
    // Session token oluştur
    const token = generateSessionToken();
    
    // Redis'e kaydet
    await kv.set(`admin:session:${token}`, {
      createdAt: Date.now(),
      ip: request.headers.get("x-forwarded-for") || "unknown"
    }, { ex: SESSION_TTL });
    
    return NextResponse.json({ 
      success: true, 
      token 
    });
  } catch (error) {
    console.error("Admin auth error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Auth failed" 
    }, { status: 500 });
  }
}

// GET - Verify session
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token) {
      return NextResponse.json({ 
        valid: false 
      }, { status: 401 });
    }
    
    const session = await kv.get(`admin:session:${token}`);
    
    if (!session) {
      return NextResponse.json({ 
        valid: false 
      }, { status: 401 });
    }
    
    return NextResponse.json({ 
      valid: true 
    });
  } catch (error) {
    return NextResponse.json({ 
      valid: false 
    }, { status: 500 });
  }
}

// DELETE - Logout
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (token) {
      await kv.del(`admin:session:${token}`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
