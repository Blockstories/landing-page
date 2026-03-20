# Market Snapshot — Design Spec
**Date:** 2026-03-20
**Status:** Approved

---

## Overview

Replace hardcoded static values in the existing Market Snapshot sidebar sections on `index.astro` and `news.astro` with live data fetched at SSR render time. A shared utility handles all API calls in parallel with a 60-second in-memory cache to protect against CoinGecko free-tier rate limits.

---

## Architecture

### Approach: SSR fetch at render time

Data is fetched in the Astro page frontmatter using `await`, consistent with the existing pattern used for `getArticlesByPublication`, `getLatestNews`, etc. No client-side JavaScript is added. Values are injected directly into the HTML at render time.

A **module-level cache** (60-second TTL) is held in `marketData.ts`. This assumes a **Node.js SSR runtime** (Vercel serverless functions), where module state persists across requests within the same function instance. This cache is a best-effort optimisation — it is not guaranteed to be effective on all deployments, but it does not affect correctness.

---

## Data Fetching Layer

**File:** `frontend/src/lib/marketData.ts`

### API calls (fired in parallel via `Promise.allSettled`)

Each fetch is individually caught so a single failing API does not null out unrelated fields. Each `fetch` call checks `r.ok` before calling `.json()` — a non-2xx response (e.g. CoinGecko 429 rate-limit) is treated as a rejection so the corresponding fields remain `null` rather than silently becoming `undefined`.

```ts
const safeJson = (r: Response) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); };

const results = await Promise.allSettled([
  fetch('https://api.coingecko.com/api/v3/global').then(safeJson),
  fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true').then(safeJson),
  fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=tether,usd-coin,dai,true-usd').then(safeJson),
  fetch('https://api.alternative.me/fng/').then(safeJson),
  fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1&interval=hourly').then(safeJson),
]);
```

Each `results[i]` is checked: if `status === 'fulfilled'`, extract the fields; if `'rejected'`, the corresponding fields remain `null`.

| Index | Endpoint | Fields extracted |
|-------|----------|-----------------|
| 0 | `/api/v3/global` | `data.total_market_cap.usd`, `data.market_cap_change_percentage_24h_usd`, `data.market_cap_percentage.btc` |
| 1 | `/simple/price?ids=bitcoin` | `bitcoin.usd`, `bitcoin.usd_24h_change` |
| 2 | `/coins/markets?ids=tether,usd-coin,dai,true-usd` | Sum of `market_cap` across all returned coins |
| 3 | `https://api.alternative.me/fng/` | `data[0].value`, `data[0].value_classification` |
| 4 | `/coins/bitcoin/market_chart?days=1&interval=hourly` | `prices` array (each element `[timestamp, price]`) — extract `price` only |

**Note on stablecoin IDs:** `binance-usd` (BUSD) and `usdd` are excluded — BUSD supply is effectively zero since Feb 2024 and `usdd` is fringe. IDs used: `tether`, `usd-coin`, `dai`, `true-usd`.

### Returned type

```ts
type MarketSnapshot = {
  btcPrice: number | null;
  btcChange24h: number | null;        // percent
  totalMarketCap: number | null;      // USD
  marketCapChange24h: number | null;  // percent
  btcDominance: number | null;        // percent
  stablecoinMarketCap: number | null; // USD, aggregated
  fearGreedValue: number | null;      // 0–100
  fearGreedLabel: string | null;      // e.g. "Greed"
  btcPriceHistory: number[] | null;   // hourly close prices, last 24h, ~25 values
};
```

(`fetchedAt` is not included — it has no display use.)

### Cache

```ts
let cache: { data: MarketSnapshot; expires: number } | null = null;
const CACHE_TTL_MS = 60_000; // 60 seconds

export async function fetchMarketSnapshot(): Promise<MarketSnapshot> {
  if (cache && Date.now() < cache.expires) return cache.data;
  const data = await _doFetch();
  cache = { data, expires: Date.now() + CACHE_TTL_MS };
  return data;
}
```

Concurrent requests that both find a stale cache will both fetch — this is a benign race condition (no mutex needed; Node.js is single-threaded per event loop tick).

---

## Formatting Helpers (exported from `marketData.ts`)

### `formatLargeUsd(n: number | null): string`
- `null` → `"—"`
- `n >= 1_000_000_000_000` → `"$" + (n / 1e12).toFixed(2) + "T"` (e.g. `$3.42T`)
- `n >= 1_000_000_000` → `"$" + Math.round(n / 1e9) + "B"` (e.g. `$218B`)
- `n >= 1_000_000` → `"$" + (n / 1e6).toFixed(1) + "M"` (e.g. `$1.2M`)

### `formatPercent(n: number | null): string`
- `null` → `"—"`
- `n > 0` → `"▲ +" + n.toFixed(1) + "%"` (e.g. `"▲ +2.4%"`)
- `n < 0` → `"▼ -" + Math.abs(n).toFixed(1) + "%"` (e.g. `"▼ -1.1%"`) — ASCII hyphen-minus U+002D
- `n === 0` → `"0.0%"`

### `formatBtcPrice(n: number | null): string`
- `null` → `"—"`
- → `"$" + Math.round(n).toLocaleString('en-US')` (e.g. `"$94,280"`)

---

## SVG Sparkline Helper (exported from `marketData.ts`)

```ts
pricesToSvgPath(prices: number[]): { line: string; fill: string }
```

**Coordinate mapping** (SVG viewBox is `0 0 200 40`):

```
n = prices.length
x(i) = (i / (n - 1)) * 200          // equal horizontal spacing
y(i) = 40 - ((prices[i] - min) / (max - min)) * 32   // top margin: 4px, bottom margin: 4px
```

If `max === min` (flat line), set all `y = 20`.

**Path construction:**

Coordinates are emitted as `toFixed(2)` floats (e.g. `6.90,18.34`):

```
points = prices.map((p, i) => `${x(i).toFixed(2)},${y(i).toFixed(2)}`).join(' L ')
line  = `M ${points}`
fill  = `M ${points} L 200,40 L 0,40 Z`
```

The existing markup places the **fill path first**, then the stroke path. The generated paths must follow the same order so the stroke renders on top of the fill.

**Fallback:** If `prices` is empty or has fewer than 2 values, return `{ line: '', fill: '' }` — the SVG renders blank.

---

## Page Changes

### `index.astro`

**Frontmatter addition:**
```ts
import { fetchMarketSnapshot, formatLargeUsd, formatPercent, formatBtcPrice } from '../lib/marketData';
const market = await fetchMarketSnapshot();
```

**Sidebar `.ss` rows** — replace hardcoded values:

| Label | Value | Change indicator |
|-------|-------|-----------------|
| BTC Dominance | `{market.btcDominance != null ? market.btcDominance.toFixed(1) + '%' : '—'}` | — |
| Total Crypto MCap | `{formatLargeUsd(market.totalMarketCap)}` | `{formatPercent(market.marketCapChange24h)}` |
| BTC Price *(replaces DeFi TVL)* | `{formatBtcPrice(market.btcPrice)}` | `{formatPercent(market.btcChange24h)}` |
| Stablecoin MCap | `{formatLargeUsd(market.stablecoinMarketCap)}` | — |
| Fear & Greed | `{market.fearGreedValue ?? '—'}` | `{market.fearGreedLabel ?? '—'}` |

**Structural note:** The existing `Total Crypto MCap` row has no `<span class="ss-chg">` today. Adding `{formatPercent(market.marketCapChange24h)}` requires inserting a new `<span class="ss-chg">` child inside the `ss-val` span, following the same inline-style pattern already used in the DeFi TVL row (e.g. `style="color:var(--green)"`). This is a markup addition, not just a value swap.

**`.ss-chg` color rule** (inline style on the `<span>`):
- `n > 0` → `color: var(--green)`
- `n < 0` → `color: var(--red)`
- `n === 0` or `null` → no color style (inherits `var(--text-3)`)

The existing markup uses inline `style="color:var(--green)"` on `.ss-chg` spans — continue this same pattern (no new CSS class needed).

### `news.astro`

**Frontmatter addition:**
```ts
import { fetchMarketSnapshot, formatLargeUsd, formatPercent, formatBtcPrice, pricesToSvgPath } from '../lib/marketData';
const market = await fetchMarketSnapshot();
const btcSparkline = pricesToSvgPath(market.btcPriceHistory ?? []);
```

**Bitcoin chart-widget:**
- `cw-val` → `{formatBtcPrice(market.btcPrice)}`
- `cw-chg` text → `{formatPercent(market.btcChange24h)}` — the existing markup uses CSS classes `up` and `down` on `.cw-chg` for green/red color. Apply `class={"cw-chg " + (market.btcChange24h > 0 ? "up" : market.btcChange24h < 0 ? "down" : "")}`. **Note:** the existing hardcoded text is `"▲ $2,208 +2.4%"` (percent + absolute dollar delta). The absolute dollar delta is intentionally dropped — only the percent string from `formatPercent` is displayed.
- SVG paths: existing markup has **fill path first**, then stroke path — maintain this order. `<path class="spark-fill" d="...">` (fill) → `{btcSparkline.fill}`. `<path d="...">` (stroke) → `{btcSparkline.line}`. The `fill="var(--green)"` and `stroke="var(--green)"` color attributes on these paths are **static** — leave them as `var(--green)` regardless of price direction. Only the `cw-chg` class changes color based on direction.
- Y-axis labels (3 labels in `.cw-y`): `min` and `max` are computed **inline in the template** as `Math.min(...history)` and `Math.max(...history)` where `history = market.btcPriceHistory ?? []`. top = `formatBtcPrice(max)`, middle = `formatBtcPrice((min+max)/2)`, bottom = `formatBtcPrice(min)`. If `history` is empty, all three labels show `—`.

**Total Crypto MCap chart-widget:**
- `cw-val` → `{formatLargeUsd(market.totalMarketCap)}`
- `cw-chg` → `{formatPercent(market.marketCapChange24h)}` with `up`/`down` class per same rule as Bitcoin widget
- Sparkline SVG paths: **remain as existing static decorative paths**

**Stablecoin MCap chart-widget:**
- `cw-val` → `{formatLargeUsd(market.stablecoinMarketCap)}`
- `cw-chg`: no change data available — remove the static `▲ +4.2%` text or replace with `—`
- Sparkline SVG paths: **remain as existing static decorative paths**

---

## Files Changed

| File | Change type |
|------|-------------|
| `frontend/src/lib/marketData.ts` | **New** — fetch utility, cache, formatters, sparkline helper |
| `frontend/src/pages/index.astro` | **Edit** — import + call `fetchMarketSnapshot`, replace 5 hardcoded `.ss` values |
| `frontend/src/pages/news.astro` | **Edit** — import + call `fetchMarketSnapshot`, replace 3 chart-widget values + BTC sparkline |

---

## Out of Scope

- DeFi TVL (no specified API covers it; replaced with BTC Price in index.astro)
- Stablecoin and total market cap sparkline history (no free-tier endpoint; sparklines remain decorative)
- Any new page route or dedicated `/markets` page
- Client-side refresh / polling
- External cache store (Redis, KV) — module-level cache only
