// src/app/api/admin/auxr/ap/route.ts
//
// Authorised participants (src/lib/auxr-ap.ts): who they are, the inventory
// wallet the Safe refills, and the net position the hedge desk has to cover.
//
//   GET                       → APs, inventory address + balance, net units, recent flows
//   POST {action:"add", address, label, destination}
//   POST {action:"remove", address}
//
// The inventory address comes from AUXR_AP_INVENTORY_PRIVATE_KEY
// (scripts/setup-ap-inventory.mjs); null until it is set.

import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { requireAdmin } from "@/lib/security/require-user";
import {
  listAps, setAp, removeAp, existingInventoryAddress, inventoryUnits, apNetUnits, recentApFlows,
  AP_SPREAD, AP_DAILY_CAP, INVENTORY_TARGET, INVENTORY_LOW,
} from "@/lib/auxr-ap";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  const [aps, address, units, net, flows] = await Promise.all([
    listAps(), existingInventoryAddress(), inventoryUnits().catch(() => null), apNetUnits(), recentApFlows(20),
  ]);
  return NextResponse.json({
    success: true,
    config: { spread: AP_SPREAD, dailyCap: AP_DAILY_CAP, inventoryTarget: INVENTORY_TARGET, inventoryLow: INVENTORY_LOW },
    inventory: { address, units },
    netUnits: net,
    aps,
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

  return NextResponse.json({ success: false, error: "action must be 'add' or 'remove'" }, { status: 400 });
}
