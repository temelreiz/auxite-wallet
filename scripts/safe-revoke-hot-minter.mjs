// scripts/safe-revoke-hot-minter.mjs
//
// Prints the transaction that takes minting away from the web process.
//
// The hot wallet 0xd4cecfdf…a1658 holds MINTER_ROLE and its private key is an
// environment variable in the Next.js app. Every incident in October was an
// authorisation bug in that app, and the caps, kill switch and alerts that
// answered them all run inside it — downstream of the thing that failed. This
// revokes the role, so a bug there can at most create a queue entry.
//
// It prints; it does not send. The admin Safe holds DEFAULT_ADMIN_ROLE and the
// keys for it are not here and should not be. Paste the values below into the
// Safe and sign.
//
// Checks state first, so it will tell you if the role is already gone, or if
// the Safe cannot actually do this.

import { createPublicClient, http, encodeFunctionData, getAddress } from "viem";
import { base } from "viem/chains";

const AUXR = getAddress("0xB145B8e9C02193d55454f534f917Cabe704FA042");
const SAFE = getAddress("0xedc9163c5f8a2a76bd1cdda6baa4eb576b481070");
const HOT = getAddress("0xd4cecfdf73cccd0517f576e75be469d75e0a1658");

const ABI = [
  { type: "function", name: "MINTER_ROLE", stateMutability: "view", inputs: [], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "DEFAULT_ADMIN_ROLE", stateMutability: "view", inputs: [], outputs: [{ type: "bytes32" }] },
  {
    type: "function", name: "hasRole", stateMutability: "view",
    inputs: [{ type: "bytes32" }, { type: "address" }], outputs: [{ type: "bool" }],
  },
  {
    type: "function", name: "revokeRole", stateMutability: "nonpayable",
    inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], outputs: [],
  },
];

const client = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org"),
});

const read = (functionName, args) =>
  client.readContract({ address: AUXR, abi: ABI, functionName, args });

const [MINTER_ROLE, ADMIN_ROLE] = await Promise.all([
  read("MINTER_ROLE", []),
  read("DEFAULT_ADMIN_ROLE", []),
]);

const SAFE_ABI = [
  { type: "function", name: "getThreshold", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "getOwners", stateMutability: "view", inputs: [], outputs: [{ type: "address[]" }] },
];

const [hotIsMinter, safeIsMinter, safeIsAdmin, threshold, owners] = await Promise.all([
  read("hasRole", [MINTER_ROLE, HOT]),
  read("hasRole", [MINTER_ROLE, SAFE]),
  read("hasRole", [ADMIN_ROLE, SAFE]),
  client.readContract({ address: SAFE, abi: SAFE_ABI, functionName: "getThreshold" }),
  client.readContract({ address: SAFE, abi: SAFE_ABI, functionName: "getOwners" }),
]);

// A Safe does not pay for its own transactions: execTransaction is called by
// an owner, and that caller pays the gas. So what matters is whether an owner
// can execute, not what the Safe holds — an earlier version of this script
// checked the Safe's balance and reported a working lever as unusable.
const ownerGas = await Promise.all(
  owners.map(async (o) => ({ owner: o, eth: Number(await client.getBalance({ address: o })) / 1e18 })),
);

console.log("Current state on Base");
console.log(`  hot wallet  ${HOT}`);
console.log(`    MINTER_ROLE          ${hotIsMinter ? "YES — this is what we are removing" : "no — already revoked"}`);
console.log(`  admin Safe  ${SAFE}`);
console.log(`    MINTER_ROLE          ${safeIsMinter ? "yes — minting survives the revoke" : "NO"}`);
console.log(`    DEFAULT_ADMIN_ROLE   ${safeIsAdmin ? "yes — can revoke" : "NO — cannot revoke"}`);
console.log(`    threshold            ${threshold} of ${owners.length}`);
console.log("");
console.log("  owners — whoever executes pays the gas, not the Safe:");
for (const { owner, eth } of ownerGas) {
  const can = eth >= 0.0005;
  console.log(`    ${owner}  ETH ${eth.toFixed(6)}  ${can ? "can execute" : "can sign (signing is free, off-chain)"}`);
}
console.log("");

// Refuse to print a transaction that would leave nobody able to mint, or that
// the Safe could not send anyway. A revoke that strands issuance is worse than
// the problem it solves.
const blockers = [];
if (!hotIsMinter) blockers.push("the hot wallet already holds no MINTER_ROLE — nothing to do");
if (!safeIsMinter) blockers.push("the Safe does NOT hold MINTER_ROLE — revoking would leave nobody able to mint");
if (!safeIsAdmin) blockers.push("the Safe does NOT hold DEFAULT_ADMIN_ROLE — it cannot revoke");

if (blockers.length) {
  console.log("Not printing a transaction:");
  for (const b of blockers) console.log(`  · ${b}`);
  process.exit(1);
}

const calldata = encodeFunctionData({
  abi: ABI,
  functionName: "revokeRole",
  args: [MINTER_ROLE, HOT],
});

console.log("Create this transaction in the Safe and have two owners sign it:");
console.log("");
console.log(`  To        ${AUXR}`);
console.log(`  Value     0 ETH`);
console.log(`  Function  revokeRole(bytes32,address)`);
console.log(`    role    ${MINTER_ROLE}   (MINTER_ROLE)`);
console.log(`    account ${HOT}   (hot wallet)`);
console.log("");
console.log(`  Calldata  ${calldata}`);
console.log("");

const executors = ownerGas.filter((o) => o.eth >= 0.0005);
if (executors.length === 0) {
  console.log("No owner holds enough ETH on Base to execute. Signing is free, but");
  console.log("somebody has to send the transaction — fund any one owner with");
  console.log("0.01 ETH. The Safe itself does not need ETH and never did.");
  console.log("");
} else {
  const thin = executors.every((o) => o.eth < 0.005);
  console.log(`Execute from ${executors[0].owner} (${executors[0].eth.toFixed(6)} ETH).`);
  console.log(`Needs ${threshold} signatures; the other owners only sign, which costs nothing.`);
  if (thin) {
    console.log("");
    console.log("That balance is thin. Top it up to 0.01 ETH — the same gas is what");
    console.log("pause() needs in an emergency, and an emergency is a bad time to");
    console.log("discover the only funded owner ran out.");
  }
  console.log("");
}

console.log("Afterwards:");
console.log("  1. delete AUXR_MINTER_PRIVATE_KEY from Vercel — Production AND Preview;");
console.log("     a preview deployment holding a minting key is a live key in a");
console.log("     place nobody is watching");
console.log("  2. leave AUXR_ALLOW_HOT_MINT unset, so a future code path that reaches");
console.log("     mintOnChain fails on the flag rather than on an unread revert");
console.log("  3. withdrawals now queue at /admin/auxr/mint-requests for co-signature");
console.log("  4. the ops watchdog asserts every five minutes that the hot wallet");
console.log("     still holds no role, and says so if that changes");
