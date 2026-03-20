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
let _cache: { data: MarketSnapshot; expires: number } | null = null;
const CACHE_TTL_MS = 60_000;

const safeJson = async (r: Response) => {
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
};

/** Test-only: resets the in-memory cache. */
export function _resetCacheForTesting(): void {
  _cache = null;
}

export async function fetchMarketSnapshot(): Promise<MarketSnapshot> {
  if (_cache && Date.now() < _cache.expires) return _cache.data;

  const results = await Promise.allSettled([
    fetch('https://api.coingecko.com/api/v3/global').then(safeJson),
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true').then(safeJson),
    fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=tether,usd-coin,dai,true-usd').then(safeJson),
    fetch('https://api.alternative.me/fng/').then(safeJson),
    fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1&interval=hourly').then(safeJson),
  ]);

  const val = <T>(r: PromiseSettledResult<T>): T | null =>
    r.status === 'fulfilled' ? r.value : null;

  const globalData = val(results[0]);
  const priceData = val(results[1]);
  const marketsData = val(results[2]) as Array<{ market_cap: number }> | null;
  const fngData = val(results[3]);
  const chartData = val(results[4]);

  const data: MarketSnapshot = {
    totalMarketCap: globalData?.data?.total_market_cap?.usd ?? null,
    marketCapChange24h: globalData?.data?.market_cap_change_percentage_24h_usd ?? null,
    btcDominance: globalData?.data?.market_cap_percentage?.btc ?? null,
    btcPrice: priceData?.bitcoin?.usd ?? null,
    btcChange24h: priceData?.bitcoin?.usd_24h_change ?? null,
    stablecoinMarketCap: marketsData
      ? marketsData.reduce((sum, c) => sum + (c.market_cap ?? 0), 0)
      : null,
    fearGreedValue: fngData?.data?.[0]?.value != null
      ? Number(fngData.data[0].value)
      : null,
    fearGreedLabel: fngData?.data?.[0]?.value_classification ?? null,
    btcPriceHistory: chartData?.prices
      ? (chartData.prices as [number, number][]).map(([, price]) => price)
      : null,
  };

  _cache = { data, expires: Date.now() + CACHE_TTL_MS };
  return data;
}
