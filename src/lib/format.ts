// lib/format.ts
// Centralized amount formatting — single source of truth
// Metals: 2 dec | Stablecoins: 2 dec | Crypto: 6 dec

export function getDecimalPlaces(symbol: string): number {
  const upper = symbol.toUpperCase();
  if (['AUXG', 'AUXS', 'AUXPT', 'AUXPD'].includes(upper)) return 2;
  if (['BTC', 'ETH', 'XRP', 'SOL'].includes(upper)) return 6;
  return 2;
}

export function formatAmount(amount: number, symbol: string): string {
  const decimals = getDecimalPlaces(symbol);
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatAmountWithUnit(amount: number, symbol: string): string {
  const formatted = formatAmount(amount, symbol);
  if (['AUXG', 'AUXS', 'AUXPT', 'AUXPD'].includes(symbol.toUpperCase())) return formatted + 'g';
  return formatted;
}

export function formatUSD(amount: number): string {
  return '$' + amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
