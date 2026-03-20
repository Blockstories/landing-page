export type MarketSnapshot = {
  btcPrice: number | null;
  btcChange24h: number | null;
  totalMarketCap: number | null;
  marketCapChange24h: number | null;
  btcDominance: number | null;
  stablecoinMarketCap: number | null;
  fearGreedValue: number | null;
  fearGreedLabel: string | null;
  btcPriceHistory: number[] | null;
};

export function formatLargeUsd(n: number | null): string {
  if (n === null) return '—';
  if (n >= 1_000_000_000_000) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1_000_000_000) return '$' + Math.round(n / 1e9) + 'B';
  return '$' + (n / 1e6).toFixed(1) + 'M';
}

export function formatPercent(n: number | null): string {
  if (n === null) return '—';
  if (n > 0) return '▲ +' + n.toFixed(1) + '%';
  if (n < 0) return '▼ -' + Math.abs(n).toFixed(1) + '%';
  return '0.0%';
}

export function formatBtcPrice(n: number | null): string {
  if (n === null) return '—';
  return '$' + Math.round(n).toLocaleString('en-US');
}
export function pricesToSvgPath(_prices: number[]): { line: string; fill: string } { return { line: '', fill: '' }; }
export async function fetchMarketSnapshot(): Promise<MarketSnapshot> { throw new Error('not implemented'); }
/** Test-only: clears the in-memory cache so fetch tests start clean. */
export function _resetCacheForTesting(): void { /* implemented in Task 3 */ }
