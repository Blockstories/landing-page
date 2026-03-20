import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatLargeUsd, formatPercent, formatBtcPrice, pricesToSvgPath, fetchMarketSnapshot, _resetCacheForTesting } from '../../lib/marketData.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('formatLargeUsd', () => {
  it('returns em dash for null', () => {
    expect(formatLargeUsd(null)).toBe('—');
  });
  it('formats trillions with 2 decimal places', () => {
    expect(formatLargeUsd(3_420_000_000_000)).toBe('$3.42T');
  });
  it('formats billions rounded to whole number', () => {
    expect(formatLargeUsd(218_000_000_000)).toBe('$218B');
  });
  it('formats millions with 1 decimal place', () => {
    expect(formatLargeUsd(1_200_000)).toBe('$1.2M');
  });
});

describe('formatPercent', () => {
  it('returns em dash for null', () => {
    expect(formatPercent(null)).toBe('—');
  });
  it('formats positive with up arrow and plus sign', () => {
    expect(formatPercent(2.4)).toBe('▲ +2.4%');
  });
  it('formats negative with down arrow and ASCII hyphen-minus', () => {
    expect(formatPercent(-1.1)).toBe('▼ -1.1%');
  });
  it('formats zero without arrow', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });
});

describe('formatBtcPrice', () => {
  it('returns em dash for null', () => {
    expect(formatBtcPrice(null)).toBe('—');
  });
  it('formats price with dollar sign and comma separator', () => {
    expect(formatBtcPrice(94280)).toBe('$94,280');
  });
  it('rounds to whole number', () => {
    expect(formatBtcPrice(94280.9)).toBe('$94,281');
  });
});

describe('pricesToSvgPath', () => {
  it('returns empty strings for empty array', () => {
    const result = pricesToSvgPath([]);
    expect(result.line).toBe('');
    expect(result.fill).toBe('');
  });

  it('returns empty strings for single-price array', () => {
    const result = pricesToSvgPath([50000]);
    expect(result.line).toBe('');
    expect(result.fill).toBe('');
  });

  it('maps two prices to correct start and end x positions', () => {
    const result = pricesToSvgPath([100, 200]);
    // x(0) = 0, x(1) = 200
    expect(result.line).toMatch(/^M 0\.00,/);
    expect(result.line).toMatch(/L 200\.00,/);
  });

  it('maps flat prices to y=20 (center)', () => {
    const result = pricesToSvgPath([50000, 50000, 50000]);
    // All y values should be 20.00 when min === max
    const points = result.line.replace('M ', '').split(' L ');
    points.forEach(pt => {
      expect(pt.split(',')[1]).toBe('20.00');
    });
  });

  it('fill path closes at bottom corners', () => {
    const result = pricesToSvgPath([100, 200]);
    expect(result.fill).toContain('L 200,40 L 0,40 Z');
  });

  it('fill path starts with same points as line path', () => {
    const result = pricesToSvgPath([100, 200]);
    const linePoints = result.line.replace('M ', '');
    expect(result.fill.startsWith('M ' + linePoints)).toBe(true);
  });
});

describe('fetchMarketSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the module-level cache so each test starts with a fresh fetch.
    // vi.resetModules() would NOT work here because the import binding is already
    // resolved — we use a dedicated reset helper instead.
    _resetCacheForTesting();
  });

  it('returns correctly shaped object from successful API responses', async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse({
        data: {
          total_market_cap: { usd: 3_420_000_000_000 },
          market_cap_change_percentage_24h_usd: 1.9,
          market_cap_percentage: { btc: 54.2 },
        }
      }))
      .mockResolvedValueOnce(makeResponse({
        bitcoin: { usd: 94280, usd_24h_change: 2.4 }
      }))
      .mockResolvedValueOnce(makeResponse([
        { market_cap: 100_000_000_000 },
        { market_cap: 60_000_000_000 },
      ]))
      .mockResolvedValueOnce(makeResponse({
        data: [{ value: '72', value_classification: 'Greed' }]
      }))
      .mockResolvedValueOnce(makeResponse({
        prices: [[1000, 90000], [2000, 92000], [3000, 94280]]
      }));

    const result = await fetchMarketSnapshot();

    expect(result.totalMarketCap).toBe(3_420_000_000_000);
    expect(result.marketCapChange24h).toBe(1.9);
    expect(result.btcDominance).toBe(54.2);
    expect(result.btcPrice).toBe(94280);
    expect(result.btcChange24h).toBe(2.4);
    expect(result.stablecoinMarketCap).toBe(160_000_000_000);
    expect(result.fearGreedValue).toBe(72);
    expect(result.fearGreedLabel).toBe('Greed');
    expect(result.btcPriceHistory).toEqual([90000, 92000, 94280]);
  });

  it('returns null fields when one API call fails (non-2xx)', async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse({ error: 'rate limited' }, false, 429)) // global fails
      .mockResolvedValueOnce(makeResponse({ bitcoin: { usd: 94280, usd_24h_change: 2.4 } }))
      .mockResolvedValueOnce(makeResponse([]))
      .mockResolvedValueOnce(makeResponse({ data: [{ value: '72', value_classification: 'Greed' }] }))
      .mockResolvedValueOnce(makeResponse({ prices: [] }));

    const result = await fetchMarketSnapshot();

    // Global fields should be null
    expect(result.totalMarketCap).toBeNull();
    expect(result.btcDominance).toBeNull();
    expect(result.marketCapChange24h).toBeNull();
    // Other APIs still succeeded
    expect(result.btcPrice).toBe(94280);
    expect(result.fearGreedValue).toBe(72);
  });

  it('returns null fields when one API call throws (network error)', async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse({ data: { total_market_cap: { usd: 1e12 }, market_cap_change_percentage_24h_usd: 1, market_cap_percentage: { btc: 50 } } }))
      .mockRejectedValueOnce(new Error('network error')) // BTC price fails
      .mockResolvedValueOnce(makeResponse([]))
      .mockResolvedValueOnce(makeResponse({ data: [{ value: '50', value_classification: 'Neutral' }] }))
      .mockResolvedValueOnce(makeResponse({ prices: [] }));

    const result = await fetchMarketSnapshot();

    expect(result.btcPrice).toBeNull();
    expect(result.btcChange24h).toBeNull();
    expect(result.totalMarketCap).toBe(1e12); // other APIs unaffected
  });
});
