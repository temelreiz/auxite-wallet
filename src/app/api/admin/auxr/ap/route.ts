// src/app/api/admin/auxr/ap/route.ts
//
// Authorised participants (src/lib/auxr-ap.ts): who they are, the inventory
// wallet the Safe refills, and the net position the hedge desk has to cover.
//
//   GET                       → APs, inventory address + balance, net units, recent flows
//   POST {action:"add", address, label, destination}
//   POST {action:"remove", address}
//   POST {action:"add-source", address, source}   → redeem source, live after cooldown
//   POST {action:"remove-source", source}
//
// The inventory address comes from AUXR_AP_INVENTORY_PRIVATE_KEY
// (scripts/setup-ap-inventory.mjs); null until it is set.

import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { requireAdmin } from "@/lib/security/require-user";
import {
  listAps, setAp, removeAp, existingInventoryAddress, inventoryUnits, apNetUnits, recentApFlows,
  listApSources, addApSource, removeApSource,
  AP_SPREAD, AP_DAILY_CAP, INVENTORY_TARGET, INVENTORY_LOW, AP_SOURCE_COOLDOWN_MS,
} from "@/lib/auxr-ap";
import { findUserByWallet } from "@/lib/auxr-bridge";
import { AUXR_CONTRACT_ADDRESS } from "@/lib/auxr-onchain";
import { sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  const [aps, address, units, net, flows, sources] = await Promise.all([
    listAps(), existingInventoryAddress(), inventoryUnits().catch(() => null), apNetUnits(), recentApFlows(20),
    listApSources(),
  ]);
  return NextResponse.json({
    success: true,
    config: {
      spread: AP_SPREAD, dailyCap: AP_DAILY_CAP, inventoryTarget: INVENTORY_TARGET, inventoryLow: INVENTORY_LOW,
      sourceCooldownHours: AP_SOURCE_COOLDOWN_MS / 3_600_000,
    },
    inventory: { address, units },
    netUnits: net,
    aps,
    sources,
    flows,
  });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  const body = await request.json().catch(() => ({}) as any);

  if (body.action === "add") {
    const { address, label, destination } = body;
    if (!isAddress(String(address)) || !isAddress(String(destination)) || !String(label || "").trim()) {
      return NextResponse.json({ success: false, error: "address, destination (EVM) and label required" }, { status: 400 });
    }
    const ap = await setAp({ address, label: String(label).trim(), destination });
    return NextResponse.json({ success: true, ap });
  }

  if (body.action === "remove") {
    if (!isAddress(String(body.address))) {
      return NextResponse.json({ success: false, error: "address required" }, { status: 400 });
    }
    await removeAp(body.address);
    return NextResponse.json({ success: true });
  }

  if (body.action === "add-source") {
    const { address, source } = body;
    if (!isAddress(String(address)) || !isAddress(String(source))) {
      return NextResponse.json({ success: false, error: "address and source (EVM) required" }, { status: 400 });
    }
    const s = String(source).toLowerCase();
    const inventory = await existingInventoryAddress();
    if (s === "0x0000000000000000000000000000000000000000" || s === AUXR_CONTRACT_ADDRESS.toLowerCase() || s === inventory) {
      return NextResponse.json({ success: false, error: "source cannot be the zero, contract or inventory address" }, { status: 400 });
    }
    // A user's own wallet is already attributed to that user; never let an AP claim it.
    if (await findUserByWallet(s as `0x${string}`)) {
      return NextResponse.json({ success: false, error: "source is an Auxite user wallet" }, { status: 409 });
    }
    const res = await addApSource(address, s);
    if (!res.ok) {
      return NextResponse.json({ success: false, error: res.error }, { status: res.error === "ap_not_found" ? 404 : 409 });
    }
    await sendTelegramMessage(
      `🔐 AUXR AP redeem source added\nAP: ${res.source.apAddress}\nSource: ${res.source.source}\nActive from: ${new Date(res.source.activeAt).toISOString()}\nIf this was not you, remove it now: POST /api/admin/auxr/ap {action:"remove-source"}`,
    ).catch(() => {});
    return NextResponse.json({ success: true, source: res.source });
  }

  if (body.action === "remove-source") {
    if (!isAddress(String(body.source))) {
      return NextResponse.json({ success: false, error: "source required" }, { status: 400 });
    }
    await removeApSource(body.source);
    await sendTelegramMessage(`AUXR AP redeem source removed: ${String(body.source).toLowerCase()}`).catch(() => {});
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: "action must be add, remove, add-source or remove-source" }, { status: 400 });
}
