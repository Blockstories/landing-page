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

A **module-level cache** (60-second TTL) is held in `marketData.ts` so that concurrent visitors or rapid reloads share a single fetch rather than hammering the external APIs.

---

## Data Fetching Layer

**File:** `src/lib/marketData.ts`

### API calls (fired in parallel via `Promise.all`)

| Endpoint | Data used |
|----------|-----------|
| `GET https://api.coingecko.com/api/v3/global` | `total_market_cap.usd`, `market_cap_change_percentage_24h_usd`, `btc_dominance` |
| `GET https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true` | `bitcoin.usd` (price), `bitcoin.usd_24h_change` |
| `GET https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=tether,usd-coin,binance-usd,dai,true-usd,usdd` | Sum of `market_cap` across all returned coins → stablecoin total |
| `GET https://api.alternative.me/fng/` | `data[0].value`, `data[0].value_classification` |
| `GET https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1&interval=hourly` | `prices` array (hourly) → BTC sparkline in news.astro |

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
  btcPriceHistory: number[] | null;   // hourly closes, last 24h
  fetchedAt: Date;
};
```

### Cache

```ts
let cache: { data: MarketSnapshot; expires: number } | null = null;
const CACHE_TTL_MS = 60_000; // 60 seconds
```

On each call to `fetchMarketSnapshot()`: if `cache` exists and `Date.now() < cache.expires`, return `cache.data`. Otherwise fetch, store, and return.

### Error handling

Each API call is wrapped individually. If one fails, its fields in the returned object are `null`. The page renders `—` (em dash) for any `null` field rather than throwing.

---

## Formatting Helpers (in `marketData.ts`)

```ts
formatLargeUsd(n: number | null): string
// null → "—"
// ≥ 1T  → "$3.42T"
// ≥ 1B  → "$218B"
// ≥ 1M  → "$1.2M"

formatPercent(n: number | null): string
// null → "—"
// positive → "▲ +2.4%"
// negative → "▼ −1.1%"

formatBtcPrice(n: number | null): string
// null → "—"
// → "$94,280"
```

---

## SVG Sparkline Helper (in `marketData.ts`)

```ts
pricesToSvgPath(prices: number[]): { line: string; fill: string }
```

Maps an array of price values onto the `200 × 40` SVG viewBox used in the existing `chart-widget` markup. Returns the `d` attribute strings for:
- `line` — the stroke path
- `fill` — the filled area path (same points, closed at the bottom)

If `prices` is empty or null, returns static fallback paths matching the current hardcoded SVG.

---

## Page Changes

### `index.astro`

**Frontmatter addition:**
```ts
import { fetchMarketSnapshot } from '../lib/marketData';
const market = await fetchMarketSnapshot();
```

**Sidebar `.ss` rows** (replacing hardcoded values):

| Label | Value |
|-------|-------|
| BTC Dominance | `{market.btcDominance?.toFixed(1) ?? '—'}%` |
| Total Crypto MCap | `{formatLargeUsd(market.totalMarketCap)}` |
| BTC Price *(replaces DeFi TVL)* | `{formatBtcPrice(market.btcPrice)}` with `{formatPercent(market.btcChange24h)}` |
| Stablecoin MCap | `{formatLargeUsd(market.stablecoinMarketCap)}` |
| Fear & Greed | `{market.fearGreedValue ?? '—'} · {market.fearGreedLabel ?? '—'}` |

The `ss-chg` color is set to `var(--green)` when the change is positive, `var(--red)` when negative.

### `news.astro`

**Frontmatter addition:**
```ts
import { fetchMarketSnapshot, pricesToSvgPath } from '../lib/marketData';
const market = await fetchMarketSnapshot();
const btcSparkline = pricesToSvgPath(market.btcPriceHistory ?? []);
```

**Bitcoin chart-widget:**
- `cw-val` → `{formatBtcPrice(market.btcPrice)}`
- `cw-chg` → `{formatPercent(market.btcChange24h)}` with conditional `up`/`dn` class
- `<path>` and `<path class="spark-fill">` `d` attributes → `btcSparkline.line` / `btcSparkline.fill`
- Y-axis labels (`cw-y`) → computed from `min`, `mid`, `max` of `btcPriceHistory`

**Total Crypto MCap chart-widget:**
- `cw-val` → `{formatLargeUsd(market.totalMarketCap)}`
- `cw-chg` → `{formatPercent(market.marketCapChange24h)}`
- Sparkline SVG: **remains as existing static decorative paths** (no free-tier endpoint for aggregate market cap history)

**Stablecoin MCap chart-widget:**
- `cw-val` → `{formatLargeUsd(market.stablecoinMarketCap)}`
- Sparkline SVG: **remains as existing static decorative paths** (no free-tier aggregated stablecoin history)

---

## Files Changed

| File | Change type |
|------|-------------|
| `src/lib/marketData.ts` | **New** — fetch utility, cache, formatters, sparkline helper |
| `src/pages/index.astro` | **Edit** — import + call `fetchMarketSnapshot`, replace 5 hardcoded `.ss` values |
| `src/pages/news.astro` | **Edit** — import + call `fetchMarketSnapshot`, replace 3 chart-widget values + BTC sparkline |

---

## Out of Scope

- DeFi TVL (no specified API covers it; replaced with BTC Price in index.astro)
- Stablecoin and total market cap sparkline history (no free-tier endpoint; sparklines remain decorative)
- Any new page route or dedicated `/markets` page
- Client-side refresh / polling
