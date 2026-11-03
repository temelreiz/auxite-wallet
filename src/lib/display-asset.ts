// src/lib/display-asset.ts
// AUXM is the internal ledger code for a user's USD cash balance. It stays the
// asset key everywhere in data and APIs, but users only ever see "USD".

export function displayAsset<T extends string | undefined | null>(symbol: T): T | "USD" {
  return typeof symbol === "string" && symbol.toUpperCase() === "AUXM" ? "USD" : symbol;
}
