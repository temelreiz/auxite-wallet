import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const SETTINGS_FILE = join(process.cwd(), "price-settings.json");

const DEFAULT_SETTINGS = {
  AUXG: { askAdjust: 2, bidAdjust: -1 },
  AUXS: { askAdjust: 3, bidAdjust: -1.5 },
  AUXPT: { askAdjust: 2.5, bidAdjust: -1.25 },
  AUXPD: { askAdjust: 2.5, bidAdjust: -1.25 },
};

function getSettings() {
  try {
    if (existsSync(SETTINGS_FILE)) {
      const data = readFileSync(SETTINGS_FILE, "utf-8");
      const parsed = JSON.parse(data);
      
      // Doğru format kontrolü
      if (parsed.AUXG && typeof parsed.AUXG.askAdjust === "number") {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading settings:", e);
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: any) {
  try {
    writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    return true;
  } catch (e) {
    console.error("Error saving settings:", e);
    return false;
  }
}

export async function GET() {
  const settings = getSettings();
  return NextResponse.json(settings);
}

export async function POST(request: NextRequest) {
  try {
    const settings = await request.json();
    
    const validSymbols = ["AUXG", "AUXS", "AUXPT", "AUXPD"];
    
    // Validate settings format
    for (const symbol of validSymbols) {
      if (!settings[symbol]) {
        return NextResponse.json(
          { error: `Missing settings for ${symbol}` },
          { status: 400 }
        );
      }
      
      if (typeof settings[symbol].askAdjust !== "number" || 
          typeof settings[symbol].bidAdjust !== "number") {
        return NextResponse.json(
          { error: `Invalid settings format for ${symbol}. Expected askAdjust and bidAdjust as numbers.` },
          { status: 400 }
        );
      }
      
      // Validate ranges (-50 to +50)
      if (settings[symbol].askAdjust < -50 || settings[symbol].askAdjust > 50) {
        return NextResponse.json(
          { error: `askAdjust for ${symbol} must be between -50 and 50` },
          { status: 400 }
        );
      }
      
      if (settings[symbol].bidAdjust < -50 || settings[symbol].bidAdjust > 50) {
        return NextResponse.json(
          { error: `bidAdjust for ${symbol} must be between -50 and 50` },
          { status: 400 }
        );
      }
    }
    
    const saved = saveSettings(settings);
    
    if (saved) {
      return NextResponse.json({ success: true, settings });
    } else {
      return NextResponse.json(
        { error: "Failed to save settings to file" },
        { status: 500 }
      );
    }
  } catch (e: any) {
    console.error("Settings POST error:", e);
    return NextResponse.json(
      { error: e.message || "Unknown error" },
      { status: 500 }
    );
  }
}