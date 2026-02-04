// src/app/api/admin/telegram-test/route.ts
// Telegram bot test endpoint

import { NextRequest, NextResponse } from "next/server";
import { sendTestMessage, notifyTrade, sendTelegramMessage } from "@/lib/telegram";

export async function GET(request: NextRequest) {
  try {
    // Test mesajı gönder
    const success = await sendTestMessage();

    if (success) {
      return NextResponse.json({
        success: true,
        message: "Test mesajı gönderildi! Telegram'ı kontrol edin.",
      });
    } else {
      return NextResponse.json({
        success: false,
        error: "Telegram mesajı gönderilemedi. Token veya Chat ID'yi kontrol edin.",
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Telegram test error:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    if (type === "trade") {
      // Örnek trade bildirimi
      const success = await notifyTrade({
        type: "buy",
        userAddress: "0x1234567890abcdef1234567890abcdef12345678",
        fromToken: "AUXM",
        toToken: "AUXG",
        fromAmount: 100,
        toAmount: 1.5,
        certificateNumber: "TEST-CERT-001",
        email: "test@example.com",
      });

      return NextResponse.json({
        success,
        message: success ? "Trade bildirimi gönderildi!" : "Trade bildirimi gönderilemedi",
      });
    }

    if (type === "custom") {
      const { message } = body;
      const success = await sendTelegramMessage(message || "Test mesajı");

      return NextResponse.json({
        success,
        message: success ? "Özel mesaj gönderildi!" : "Özel mesaj gönderilemedi",
      });
    }

    return NextResponse.json({
      error: "Geçersiz tip. 'trade' veya 'custom' kullanın.",
    }, { status: 400 });

  } catch (error: any) {
    console.error("Telegram test error:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
