# Market Snapshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire live market data from CoinGecko and Alternative.me into the existing hardcoded Market Snapshot sections on `index.astro` and `news.astro`.

**Architecture:** A new `marketData.ts` utility fetches five APIs in parallel using `Promise.allSettled`, with a 60-second module-level cache. Formatters and a sparkline helper are exported for use directly in Astro page frontmatter. Pages call `fetchMarketSnapshot()` at render time and inject values into the existing HTML structure — no client-side JS added.

**Tech Stack:** TypeScript, Vitest (test runner at root), Astro SSR (Node.js / Vercel)

**Test note:** `npm test` runs `vitest run --root backend` and only discovers backend tests. To run the new frontend unit tests use `npx vitest run frontend/src/__tests__/lib/` directly — do not use `npm test` for these steps.

**Spec:** `docs/superpowers/specs/2026-03-20-market-snapshot-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/src/lib/marketData.ts` | **Create** | All API fetching, cache, formatters, sparkline helper |
| `frontend/src/__tests__/lib/marketData.test.ts` | **Create** | Unit tests for formatters, sparkline helper, fetch logic |
| `frontend/src/pages/index.astro` | **Modify** | Import + call `fetchMarketSnapshot`, replace 5 `.ss` rows |
| `frontend/src/pages/news.astro` | **Modify** | Import + call `fetchMarketSnapshot`, replace 3 chart-widget values + BTC sparkline |

---

## Task 1: Formatting helpers (TDD)

**Files:**
- Create: `frontend/src/lib/marketData.ts`
- Create: `frontend/src/__tests__/lib/marketData.test.ts`

- [ ] **Step 1: Create the test directory and stub the module**

```bash
mkdir -p frontend/src/__tests__/lib
```

Create `frontend/src/lib/marketData.ts` with empty exports so the test file can import it:

```typescript
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

export function formatLargeUsd(_n: number | null): string { return ''; }
export function formatPercent(_n: number | null): string { return ''; }
export function formatBtcPrice(_n: number | null): string { return ''; }
export function pricesToSvgPath(_prices: number[]): { line: string; fill: string } { return { line: '', fill: '' }; }
export async function fetchMarketSnapshot(): Promise<MarketSnapshot> { throw new Error('not implemented'); }
/** Test-only: clears the in-memory cache so fetch tests start clean. */
export function _resetCacheForTesting(): void { /* implemented in Task 3 */ }
```

- [ ] **Step 2: Write failing tests for formatters**

Create `frontend/src/__tests__/lib/marketData.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { formatLargeUsd, formatPercent, formatBtcPrice } from '../../lib/marketData.js';

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
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npx vitest run frontend/src/__tests__/lib/marketData.test.ts
```

Expected: All tests fail with "not equal" or "expected '' to be ..."

- [ ] **Step 4: Implement the formatters in `marketData.ts`**

Replace the stub formatter bodies with:

```typescript
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
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx vitest run frontend/src/__tests__/lib/marketData.test.ts
```

Expected: All formatter tests pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/marketData.ts frontend/src/__tests__/lib/marketData.test.ts
git commit -m "feat: add market data formatters with tests"
```

---

## Task 2: Sparkline helper (TDD)

**Files:**
- Modify: `frontend/src/lib/marketData.ts`
- Modify: `frontend/src/__tests__/lib/marketData.test.ts`

- [ ] **Step 1: Write failing tests for `pricesToSvgPath`**

Add to `frontend/src/__tests__/lib/marketData.test.ts`:

```typescript
import { pricesToSvgPath } from '../../lib/marketData.js';

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
    expect(result.fill).toStartWith('M ' + linePoints);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run frontend/src/__tests__/lib/marketData.test.ts
```

Expected: All sparkline tests fail.

- [ ] **Step 3: Implement `pricesToSvgPath`**

Replace the stub body with:

```typescript
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
```

- [ ] **Step 4: Run all tests to confirm they pass**

```bash
npx vitest run frontend/src/__tests__/lib/marketData.test.ts
```

Expected: All tests pass including formatters.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/marketData.ts frontend/src/__tests__/lib/marketData.test.ts
git commit -m "feat: add SVG sparkline helper with tests"
```

---

## Task 3: Fetch logic with cache and error isolation (TDD)

**Files:**
- Modify: `frontend/src/lib/marketData.ts`
- Modify: `frontend/src/__tests__/lib/marketData.test.ts`

- [ ] **Step 1: Write failing tests for `fetchMarketSnapshot`**

Add to `frontend/src/__tests__/lib/marketData.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchMarketSnapshot, _resetCacheForTesting } from '../../lib/marketData.js';

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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run frontend/src/__tests__/lib/marketData.test.ts
```

Expected: All `fetchMarketSnapshot` tests fail.

- [ ] **Step 3: Implement `fetchMarketSnapshot` in `marketData.ts`**

Add the cache variable, `safeJson` helper, and `_resetCacheForTesting` **after the `MarketSnapshot` type definition** (the type must be declared before variables that reference it):

```typescript
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
```

Replace the stub `fetchMarketSnapshot` with:

```typescript
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
```

- [ ] **Step 4: Run all tests**

```bash
npx vitest run frontend/src/__tests__/lib/marketData.test.ts
```

Expected: All tests pass — formatters, sparkline, fetch.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/marketData.ts frontend/src/__tests__/lib/marketData.test.ts
git commit -m "feat: add fetchMarketSnapshot with cache and error isolation"
```

---

## Task 4: Wire up `index.astro`

**Files:**
- Modify: `frontend/src/pages/index.astro`

The existing sidebar section (around line 1233–1241) looks like:
```html
<div class="sidebar-sec">
  <h4>Market Snapshot</h4>
  <div class="ss"><span class="ss-lbl">BTC Dominance</span><span class="ss-val">54.2%</span></div>
  <div class="ss"><span class="ss-lbl">Total Crypto MCap</span><span class="ss-val">$3.42T</span></div>
  <div class="ss"><span class="ss-lbl">DeFi TVL</span><span class="ss-val">$98.4B <span class="ss-chg" style="color:var(--green)">+2.1%</span></span></div>
  <div class="ss"><span class="ss-lbl">Stablecoin MCap</span><span class="ss-val">$218B</span></div>
  <div class="ss"><span class="ss-lbl">Fear &amp; Greed</span><span class="ss-val">72 <span class="ss-chg" style="color:var(--text-3)">Greed</span></span></div>
</div>
```

- [ ] **Step 1: Add the import to the frontmatter**

In `frontend/src/pages/index.astro`, find the last import line in the frontmatter (the `---` block at the top). Add after the existing imports:

```typescript
import { fetchMarketSnapshot, formatLargeUsd, formatPercent, formatBtcPrice } from '../lib/marketData.js';
```

Declare a typed default before the existing `if (!isBuildTime)` block, then populate it with a separate guarded call:

```typescript
import type { MarketSnapshot } from '../lib/marketData.js';

const _nullMarket: MarketSnapshot = {
  btcPrice: null, btcChange24h: null, totalMarketCap: null,
  marketCapChange24h: null, btcDominance: null, stablecoinMarketCap: null,
  fearGreedValue: null, fearGreedLabel: null, btcPriceHistory: null,
};
let market: MarketSnapshot = _nullMarket;

if (!isBuildTime) {
  try {
    market = await fetchMarketSnapshot();
  } catch (e) {
    console.error('[index.astro] Failed to fetch market data:', e);
  }
}
```

Place this block after the existing `if (!isBuildTime)` blocks (after the market flow articles fetch), before the `---` that closes the frontmatter.

- [ ] **Step 2: Replace the 5 hardcoded `.ss` rows**

Replace the entire `<div class="sidebar-sec">` Market Snapshot block with:

```astro
<div class="sidebar-sec">
  <h4>Market Snapshot</h4>
  <div class="ss">
    <span class="ss-lbl">BTC Dominance</span>
    <span class="ss-val">{market.btcDominance != null ? market.btcDominance.toFixed(1) + '%' : '—'}</span>
  </div>
  <div class="ss">
    <span class="ss-lbl">Total Crypto MCap</span>
    <span class="ss-val">{formatLargeUsd(market.totalMarketCap)}{market.marketCapChange24h != null && (
      <span class="ss-chg" style={`color:${market.marketCapChange24h > 0 ? 'var(--green)' : market.marketCapChange24h < 0 ? 'var(--red)' : 'var(--text-3)'}`}>
        {formatPercent(market.marketCapChange24h)}
      </span>
    )}</span>
  </div>
  <div class="ss">
    <span class="ss-lbl">BTC Price</span>
    <span class="ss-val">{formatBtcPrice(market.btcPrice)}{market.btcChange24h != null && (
      <span class="ss-chg" style={`color:${market.btcChange24h > 0 ? 'var(--green)' : market.btcChange24h < 0 ? 'var(--red)' : 'var(--text-3)'}`}>
        {formatPercent(market.btcChange24h)}
      </span>
    )}</span>
  </div>
  <div class="ss">
    <span class="ss-lbl">Stablecoin MCap</span>
    <span class="ss-val">{formatLargeUsd(market.stablecoinMarketCap)}</span>
  </div>
  <div class="ss">
    <span class="ss-lbl">Fear &amp; Greed</span>
    <span class="ss-val">{market.fearGreedValue ?? '—'} <span class="ss-chg" style="color:var(--text-3)">{market.fearGreedLabel ?? '—'}</span></span>
  </div>
</div>
```

- [ ] **Step 3: Verify the build compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build completes without TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/index.astro
git commit -m "feat: wire live market data into index.astro sidebar"
```

---

## Task 5: Wire up `news.astro`

**Files:**
- Modify: `frontend/src/pages/news.astro`

The existing Market Snapshot section (around line 744) has three `chart-widget` divs for Bitcoin, Total Crypto MCap, and Stablecoin MCap.

- [ ] **Step 1: Add the import to the frontmatter**

In `frontend/src/pages/news.astro`, add after the existing imports:

```typescript
import { fetchMarketSnapshot, formatLargeUsd, formatPercent, formatBtcPrice, pricesToSvgPath } from '../lib/marketData.js';
```

Add the fetch + sparkline computation **inside the `if (!isBuildTime)` guard**, consistent with how `index.astro` handles all external data calls. `isBuildTime` is `true` only during static export builds — in normal SSR on Vercel this is always `false`, so the fetch always runs. Calling it outside the guard would make live HTTP calls during `astro build`, which the rest of the codebase intentionally avoids.

Declare defaults before the guard, then populate inside it — the same pattern used throughout `news.astro` and `index.astro`:

```typescript
import type { MarketSnapshot } from '../lib/marketData.js';

const _nullMarket: MarketSnapshot = {
  btcPrice: null, btcChange24h: null, totalMarketCap: null,
  marketCapChange24h: null, btcDominance: null, stablecoinMarketCap: null,
  fearGreedValue: null, fearGreedLabel: null, btcPriceHistory: null,
};
let market: MarketSnapshot = _nullMarket;

if (!isBuildTime) {
  try {
    market = await fetchMarketSnapshot();
  } catch (e) {
    console.error('[news.astro] Failed to fetch market data:', e);
  }
}

const btcSparkline = pricesToSvgPath(market.btcPriceHistory ?? []);
const btcHistory = market.btcPriceHistory ?? [];
const btcMin = btcHistory.length > 0 ? Math.min(...btcHistory) : null;
const btcMax = btcHistory.length > 0 ? Math.max(...btcHistory) : null;
const btcMid = btcMin !== null && btcMax !== null ? (btcMin + btcMax) / 2 : null;
```

- [ ] **Step 2: Replace the Bitcoin chart-widget**

Find the `<!-- Bitcoin 24h -->` chart-widget block and replace its dynamic parts:

```astro
<!-- Bitcoin 24h -->
<div class="chart-widget">
  <div class="cw-header">
    <div class="cw-name">Bitcoin</div>
    <div class="cw-period">24h</div>
  </div>
  <div class="cw-row">
    <span class="cw-val">{formatBtcPrice(market.btcPrice)}</span>
    <span class={`cw-chg ${market.btcChange24h != null && market.btcChange24h > 0 ? 'up' : market.btcChange24h != null && market.btcChange24h < 0 ? 'down' : ''}`}>
      {formatPercent(market.btcChange24h)}
    </span>
  </div>
  <div class="cw-chart">
    <div class="cw-spark">
      <svg viewBox="0 0 200 40" preserveAspectRatio="none">
        <line class="grid-line" x1="0" y1="8" x2="200" y2="8"/>
        <line class="grid-line" x1="0" y1="20" x2="200" y2="20"/>
        <line class="grid-line" x1="0" y1="32" x2="200" y2="32"/>
        {btcSparkline.fill ? (
          <>
            <path class="spark-fill" d={btcSparkline.fill} fill="var(--green)"/>
            <path d={btcSparkline.line} stroke="var(--green)" fill="none"/>
          </>
        ) : (
          <>
            <path class="spark-fill" d="M0,32 L8,30 L16,28 L24,31 L32,27 L40,24 L48,26 L56,22 L64,20 L72,18 L80,21 L88,17 L96,15 L104,16 L112,14 L120,12 L128,13 L136,11 L144,10 L152,12 L160,9 L168,8 L176,10 L184,7 L192,8 L200,6 L200,40 L0,40Z" fill="var(--green)"/>
            <path d="M0,32 L8,30 L16,28 L24,31 L32,27 L40,24 L48,26 L56,22 L64,20 L72,18 L80,21 L88,17 L96,15 L104,16 L112,14 L120,12 L128,13 L136,11 L144,10 L152,12 L160,9 L168,8 L176,10 L184,7 L192,8 L200,6" stroke="var(--green)" fill="none"/>
          </>
        )}
      </svg>
    </div>
    <div class="cw-y">
      <span>{formatBtcPrice(btcMax)}</span>
      <span>{formatBtcPrice(btcMid)}</span>
      <span>{formatBtcPrice(btcMin)}</span>
    </div>
  </div>
  <div class="cw-x">
    <span>06:00</span>
    <span>12:00</span>
    <span>18:00</span>
  </div>
</div>
```

- [ ] **Step 3: Replace the Total Crypto MCap chart-widget values**

Find the `<!-- Total Crypto Market Cap 24h -->` widget. Replace only the `cw-val` and `cw-chg` spans — leave the SVG paths untouched:

```astro
<div class="cw-row">
  <span class="cw-val">{formatLargeUsd(market.totalMarketCap)}</span>
  <span class={`cw-chg ${market.marketCapChange24h != null && market.marketCapChange24h > 0 ? 'up' : market.marketCapChange24h != null && market.marketCapChange24h < 0 ? 'down' : ''}`}>
    {formatPercent(market.marketCapChange24h)}
  </span>
</div>
```

- [ ] **Step 4: Replace the Stablecoin MCap chart-widget value**

Find the `<!-- Stablecoin Market Cap 30d -->` widget. Replace the `cw-row` — no change data available so show `—`:

```astro
<div class="cw-row">
  <span class="cw-val">{formatLargeUsd(market.stablecoinMarketCap)}</span>
  <span class="cw-chg">—</span>
</div>
```

- [ ] **Step 5: Verify the build compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build completes without TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/news.astro
git commit -m "feat: wire live market data into news.astro chart widgets"
```

---

## Task 6: Smoke test on dev server

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Open `http://localhost:4321` and `http://localhost:4321/news` in a browser.

- [ ] **Step 2: Verify index.astro sidebar**

In the Market Snapshot sidebar, confirm:
- BTC Dominance shows a percentage (not "54.2%" static)
- Total Crypto MCap shows a T-formatted number with a change indicator
- BTC Price row is present (not "DeFi TVL")
- Stablecoin MCap shows a B-formatted number
- Fear & Greed shows a number and label

- [ ] **Step 3: Verify news.astro sidebar**

In the Market Snapshot sidebar, confirm:
- Bitcoin widget shows a live price and percent change
- BTC sparkline renders (not blank)
- Y-axis labels on BTC widget are formatted prices
- Total Crypto MCap shows live value
- Stablecoin MCap shows live value

- [ ] **Step 4: Final commit if any minor fixes were needed**

```bash
git add -p
git commit -m "fix: market snapshot smoke test adjustments"
```

---

## Running All Tests

```bash
# Backend tests (existing suite)
npm test

# Frontend unit tests (new suite — not included in npm test)
npx vitest run frontend/src/__tests__/lib/
```

Expected: All tests pass in both suites.
