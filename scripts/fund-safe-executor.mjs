// scripts/fund-safe-executor.mjs
//
// Sends ETH on Base from the old hot wallet to the Safe owner that executes.
//
// 0x7227130E…f5A0 is the only Safe owner holding gas, which makes it the only
// owner that can execute anything — including pause(). It was down to 0.0028
// ETH, and "the one owner who can execute has run out" is a thing to discover
// on a quiet afternoon, not during an incident.
//
// The ETH comes from the hot wallet 0xD4ceCfdf…a1658, which still holds about
// 0.05 ETH and, since its MINTER_ROLE was revoked on 20 October 2026, has no
// privileges left at all. Sweeping it serves twice: it funds the executor and
// it empties a wallet whose key spent months in a production environment.
//
// Run with --apply to send. Without it, nothing moves.
//   node scripts/fund-safe-executor.mjs                # dry run, 0.01 ETH
//   node scripts/fund-safe-executor.mjs 0.04 --apply   # send 0.04
//   node scripts/fund-safe-executor.mjs --all --apply  # sweep, leaving gas

import { createWalletClient, createPublicClient, http, parseEther, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { config } from "dotenv";

config({ path: new URL("../.env.local", import.meta.url).pathname, quiet: true });

/** The Safe owner that executes. Checked against the Safe before sending. */
const EXECUTOR = "0x7227130EAaad17a35300A90631984676d303f5A0";
const SAFE = "0xEdC9163c5f8A2a76BD1CdDa6BAA4Eb576B481070";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const SWEEP = args.includes("--all");
const amountArg = args.find((a) => /^[\d.]+$/.test(a));
const AMOUNT = amountArg ? parseEther(amountArg) : parseEther("0.01");

const raw = process.env.AUXR_MINTER_PRIVATE_KEY || process.env.ANCHOR_PRIVATE_KEY || process.env.PRIVATE_KEY;
if (!raw) {
  console.error("No key found in .env.local (AUXR_MINTER_PRIVATE_KEY / ANCHOR_PRIVATE_KEY / PRIVATE_KEY).");
  process.exit(1);
}
const account = privateKeyToAccount(raw.startsWith("0x") ? raw : `0x${raw}`);

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || "https://base-rpc.publicnode.com"),
});

// Confirm the destination really is a Safe owner before sending anything to
// it. A typo here sends real money to an address nobody controls.
const isOwner = await publicClient.readContract({
  address: SAFE,
  abi: [{ type: "function", name: "isOwner", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "bool" }] }],
  functionName: "isOwner",
  args: [EXECUTOR],
});
if (!isOwner) {
  console.error(`${EXECUTOR} is not an owner of the Safe. Refusing to send.`);
  process.exit(1);
}

const [fromBal, toBal, gasPrice] = await Promise.all([
  publicClient.getBalance({ address: account.address }),
  publicClient.getBalance({ address: EXECUTOR }),
  publicClient.getGasPrice(),
]);

// 21000 gas for a plain transfer, with generous headroom so a sweep cannot
// leave the account unable to pay for its own transaction.
const gasCost = gasPrice * 21_000n * 4n;
const value = SWEEP ? fromBal - gasCost : AMOUNT;

console.log(APPLY ? "MODE: APPLY\n" : "MODE: DRY RUN (nothing sent)\n");
console.log(`from   ${account.address}   ${formatEther(fromBal)} ETH   (old hot wallet, no roles)`);
console.log(`to     ${EXECUTOR}   ${formatEther(toBal)} ETH   (Safe owner, verified)`);
console.log(`send   ${formatEther(value)} ETH`);
console.log(`gas    ~${formatEther(gasPrice * 21_000n)} ETH at ${Number(gasPrice) / 1e9} gwei`);
console.log(`after  from ${formatEther(fromBal - value - gasPrice * 21_000n)} · to ${formatEther(toBal + value)}`);

if (value <= 0n || value > fromBal - gasCost) {
  console.error("\nAmount is not affordable after gas. Refusing.");
  process.exit(1);
}

if (!APPLY) {
  console.log("\nNothing sent — re-run with --apply");
  process.exit(0);
}

const wallet = createWalletClient({ account, chain: base, transport: http(process.env.BASE_RPC_URL || "https://base-rpc.publicnode.com") });
const hash = await wallet.sendTransaction({ to: EXECUTOR, value });
console.log(`\nsent: ${hash}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
console.log(`status: ${receipt.status}`);
console.log(`executor balance now: ${formatEther(await publicClient.getBalance({ address: EXECUTOR }))} ETH`);
