// src/app/api/admin/bridge/setup/route.ts
//
// One-time setup for the Bridge crypto→USD off-ramp.
//
//   GET  → introspect: customer, stored external account + liquidation addresses,
//          live Bridge external accounts / liquidation addresses.
//   POST { action: "external-account", account: {...} }
//          → register the Wise USD account on our Bridge customer, store the id.
//   POST { action: "liquidation-addresses", targets?: ["base:usdc", ...] }
//          → create one wire→USD liquidation address per target, store the
//            deposit addresses. Idempotent per (chain,currency) via Bridge
//            Idempotency-Key.
//
// Run after BRIDGE_API_KEY + BRIDGE_CUSTOMER_ID are configured, and after the
// Bridge customer's KYB is approved.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  bridgeCustomerId,
  getCustomer,
  createUsExternalAccount,
  listExternalAccounts,
  createLiquidationAddress,
  listLiquidationAddresses,
  getStoredExternalAccount,
  setStoredExternalAccount,
  getStoredLiquidationAddresses,
  setStoredLiquidationAddress,
  type UsBankExternalAccount,
  type BridgeChain,
  type BridgeCurrency,
} from "@/lib/bridge";
import { OFFRAMP_TARGETS } from "@/lib/bridge-offramp";

export const dynamic = "force-dynamic";

const RETURN_ADDRESS = (process.env.HOT_WALLET_ETH_ADDRESS || "").trim();

// ── GET: introspection ─────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response!;

  try {
    const [storedExt, storedLa] = await Promise.all([
      getStoredExternalAccount(),
      getStoredLiquidationAddresses(),
    ]);

    let customer: any = null, liveExt: any = null, liveLa: any = null;
    try { customer = await getCustomer(); } catch (e) { customer = { error: String(e) }; }
    try { liveExt = await listExternalAccounts(); } catch (e) { liveExt = { error: String(e) }; }
    try { liveLa = await listLiquidationAddresses(); } catch (e) { liveLa = { error: String(e) }; }

    return NextResponse.json({
      success: true,
      customerId: process.env.BRIDGE_CUSTOMER_ID || null,
      returnAddress: RETURN_ADDRESS || null,
      stored: { externalAccount: storedExt, liquidationAddresses: storedLa },
      live: { customer, externalAccounts: liveExt, liquidationAddresses: liveLa },
      availableTargets: OFFRAMP_TARGETS.map((t) => ({ key: `${t.chain}:${t.currency}`, label: t.label })),
    });
  } catch (err: any) {
    console.error("[bridge/setup] GET error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

// ── POST: register external account / create liquidation addresses ──────────
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response!;

  try {
    bridgeCustomerId(); // throws clearly if BRIDGE_CUSTOMER_ID unset
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === "external-account") {
      const acct = body.account as UsBankExternalAccount;
      if (!acct?.routingNumber || !acct?.accountNumber || !acct?.bankName || !acct?.accountOwnerName || !acct?.address) {
        return NextResponse.json(
          { error: "account requires bankName, accountOwnerName, routingNumber, accountNumber, address{streetLine1,city,state,postalCode,country}" },
          { status: 400 }
        );
      }
      const created = await createUsExternalAccount(acct);
      const id = created?.id || created?.external_account_id;
      if (!id) return NextResponse.json({ error: "Bridge did not return an external account id", raw: created }, { status: 502 });

      await setStoredExternalAccount({
        id,
        bankName: acct.bankName,
        accountOwnerName: acct.accountOwnerName,
        last4: String(acct.accountNumber).slice(-4),
        createdAt: Date.now(),
      });
      return NextResponse.json({ success: true, externalAccountId: id, raw: created });
    }

    if (action === "liquidation-addresses") {
      if (!RETURN_ADDRESS) {
        return NextResponse.json({ error: "HOT_WALLET_ETH_ADDRESS not set — needed as the return address" }, { status: 400 });
      }
      const ext = await getStoredExternalAccount();
      if (!ext?.id) {
        return NextResponse.json({ error: "No external account stored — run action 'external-account' first" }, { status: 400 });
      }

      const wanted: string[] = Array.isArray(body.targets) && body.targets.length
        ? body.targets
        : OFFRAMP_TARGETS.map((t) => `${t.chain}:${t.currency}`);

      const existing = await getStoredLiquidationAddresses();
      const out: any[] = [];
      for (const key of wanted) {
        const target = OFFRAMP_TARGETS.find((t) => `${t.chain}:${t.currency}` === key);
        if (!target) { out.push({ key, error: "unknown target" }); continue; }
        if (existing[key]?.address) { out.push({ key, alreadyExists: true, address: existing[key].address }); continue; }

        try {
          const created = await createLiquidationAddress({
            chain: target.chain as BridgeChain,
            currency: target.currency as BridgeCurrency,
            externalAccountId: ext.id,
            returnAddress: RETURN_ADDRESS,
          });
          if (!created?.address) { out.push({ key, error: "no address returned", raw: created }); continue; }
          await setStoredLiquidationAddress({
            id: created.id,
            address: created.address,
            chain: target.chain as BridgeChain,
            currency: target.currency as BridgeCurrency,
            externalAccountId: ext.id,
            createdAt: Date.now(),
          });
          out.push({ key, address: created.address, id: created.id });
        } catch (e: any) {
          out.push({ key, error: e?.message || String(e) });
        }
      }
      return NextResponse.json({ success: true, results: out });
    }

    return NextResponse.json({ error: "unknown action — use 'external-account' or 'liquidation-addresses'" }, { status: 400 });
  } catch (err: any) {
    console.error("[bridge/setup] POST error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
