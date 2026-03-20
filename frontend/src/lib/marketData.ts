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
export function pricesToSvgPath(prices: number[]): { line: string; fill: string } {
  if (prices.length < 2) return { line: '', fill: '' };

  const n = prices.length;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min;

  const points = prices.map((p, i) => {
    const x = ((i / (n - 1)) * 200).toFixed(2);
    const y = range === 0 ? '20.00' : (40 - ((p - min) / range) * 32).toFixed(2);
    return `${x},${y}`;
  }).join(' L ');

  const line = `M ${points}`;
  const fill = `M ${points} L 200,40 L 0,40 Z`;
  return { line, fill };
}
export async function fetchMarketSnapshot(): Promise<MarketSnapshot> { throw new Error('not implemented'); }
/** Test-only: clears the in-memory cache so fetch tests start clean. */
export function _resetCacheForTesting(): void { /* implemented in Task 3 */ }
