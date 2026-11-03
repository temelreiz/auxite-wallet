// src/lib/balance-debit.ts
// Take `amount` of one balance field only if it is there — one Lua script, so
// the check and the debit can't be split by a concurrent request. The
// read-then-hincrbyfloat pattern this replaces let N parallel calls all pass
// the check against the same balance (the 2026-09-09 /api/trade exploit).
import { getRedis } from "@/lib/redis";

const DEBIT = `
local amt = tonumber(ARGV[2])
local bal = tonumber(redis.call('HGET', KEYS[1], ARGV[1]) or '0')
if bal + 1e-9 < amt then return {0, tostring(bal)} end
redis.call('HINCRBYFLOAT', KEYS[1], ARGV[1], -amt)
return {1, tostring(bal - amt)}
`;

export async function debitIfAvailable(
  address: string,
  field: string,
  amount: number,
): Promise<{ ok: boolean; available: number }> {
  const res = (await getRedis().eval(DEBIT, [`user:${address.toLowerCase()}:balance`], [field, String(amount)])) as [number, string];
  return { ok: Number(res[0]) === 1, available: Number(res[1]) };
}
