# Design Spec: Trending This Week Component

**Date:** 2026-03-20
**Status:** Approved

---

## Overview

Replace the hardcoded "Trending This Week" sidebar lists in `index.astro` and `news.astro` with a live component that computes the top 5 most-relevant news items from the last 7 days using the `entityRelevance` Softr field. Each trending item displays its actual headline and supports the same publisher-selection popup behavior as other news items on each page.

---

## Architecture

### New utility: `frontend/src/lib/newsUtils.ts`

Single exported function:

```ts
import type { MappedRecord } from '../../../backend/services/softrService.js';

export function getTrending(items: MappedRecord[], limit = 5): MappedRecord[] {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return items
    .filter(item => {
      const raw = item.fields?.['Created At'] ?? item.fields?.created_at ?? '';
      const t = new Date(String(raw)).getTime();
      return !isNaN(t) && t >= cutoff;
    })
    .sort((a, b) => {
      const va = Number(a.fields?.entityRelevance ?? 0);
      const vb = Number(b.fields?.entityRelevance ?? 0);
      return vb - va;
    })
    .slice(0, limit);
}
```

- Pure function; no I/O, no side effects.
- `entityRelevance` missing or null → treated as `0`.
- `Created At` date parsing: if the string is invalid, `isNaN(t)` excludes the record.
- Default limit is 5 (matches product requirement); callers may override.

---

## Data Sources

### news.astro

Already fetches `newsItems: MappedRecord[]` with `limit: 50`. Use this array directly:

```ts
const trendingItems = isBuildTime ? [] : getTrending(newsItems);
```

### index.astro

Currently fetches `getLatestNews({ paging: { limit: 10 } })` and maps the result to `NewsItem[]` (losing `entityRelevance`). Changes:

1. Increase the `getLatestNews` call to `limit: 50` to widen the candidate pool.
2. Keep `latestResult.data` (the raw `MappedRecord[]`) in scope and use it for trending:

```ts
const trendingItems = isBuildTime ? [] : getTrending(latestResult.data);
```

The downstream `latestNewsItems` processing (for Market Flow) is unchanged.

Both pages call the same function on equivalent data, so the rendered list is identical.

---

## Template Rendering

Replace the hardcoded `<ul class="trending">` in both pages with:

```astro
<ul class="trending">
  {trendingItems.length > 0 ? trendingItems.map((item, i) => {
    const title = String(item.fields?.title || '');
    const links = item.fields?.links;
    const urls = Array.isArray(links)
      ? links.filter((u): u is string => typeof u === 'string' && u.length > 0)
      : typeof links === 'string' && links ? [links] : [];
    const publisherField = item.fields?.publisher;
    const sources = Array.isArray(publisherField)
      ? publisherField.filter((s): s is string => typeof s === 'string' && s.length > 0)
      : typeof publisherField === 'string' && publisherField ? [publisherField] : [];
    return (
      <li
        class="news-item"
        data-sources={JSON.stringify(sources.length ? sources : ['News'])}
        data-urls={JSON.stringify(urls)}
      >
        <span class="tn">{String(i + 1).padStart(2, '0')}</span>{title}
      </li>
    );
  }) : (
    <li style="color:var(--text-3);font-size:.75rem">No trending items this week.</li>
  )}
</ul>
```

- `data-sources` and `data-urls` carry the same shape used by all other `.news-item` elements on each page.
- The fallback empty-state line is only shown when there are genuinely no items in the last 7 days.

---

## Publisher Popup Integration

The existing popup scripts use event delegation on specific container elements via `querySelectorAll`. Neither currently covers `.trending`.

**Fix (one line per page):** Add `'.trending'` to the container selector.

### news.astro

```js
// Before
const newsContainers = document.querySelectorAll('.feed, .featured-scroll');
// After
const newsContainers = document.querySelectorAll('.feed, .featured-scroll, .trending');
```

### index.astro

```js
// Before
const marketFlowList = document.querySelector('.marketflow-list');
// After — attach the same delegation to both containers
[document.querySelector('.marketflow-list'), document.querySelector('.trending')]
  .filter(Boolean)
  .forEach(container => container.addEventListener('click', handleNewsClick));
```

No changes to `openPopup`, `closePopup`, or the handler logic — those work for any `.news-item` element.

---

## Tests

New file: `frontend/src/__tests__/lib/newsUtils.test.ts`

| Test | Assertion |
|------|-----------|
| Items older than 7 days excluded | Items with `Created At` > 7 days ago are not returned |
| Items within 7 days included | Items with `Created At` within 7 days are candidates |
| Sorted by entityRelevance descending | Higher-relevance item appears first |
| Missing entityRelevance treated as 0 | Item without `entityRelevance` sorts below one with value `1` |
| Respects limit | Returns at most 5 by default |
| Empty input returns empty | `getTrending([])` → `[]` |

All tests use Vitest; no mocking required (pure function).

---

## Error Handling

- `isBuildTime` guard: `trendingItems` is set to `[]` at build time, avoiding HTTP calls. The fallback empty-state renders instead.
- Softr fetch failure: if the surrounding `try/catch` in each page catches an error, `newsItems`/`latestResult.data` will be an empty array; `getTrending([])` returns `[]`; fallback renders.
- Invalid `Created At` date string: `isNaN(t)` check excludes the record silently.
- No `entityRelevance` field: `?? 0` coercion keeps the sort stable and valid.

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/lib/newsUtils.ts` | **NEW** — `getTrending` utility |
| `frontend/src/__tests__/lib/newsUtils.test.ts` | **NEW** — 6 unit tests |
| `frontend/src/pages/news.astro` | Import `getTrending`; compute `trendingItems`; replace hardcoded list; extend popup container selector |
| `frontend/src/pages/index.astro` | Import `getTrending`; bump fetch limit to 50; retain `latestResult.data`; compute `trendingItems`; replace hardcoded list; extend popup container selector |
