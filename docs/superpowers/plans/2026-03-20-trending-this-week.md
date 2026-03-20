# Trending This Week Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded "Trending This Week" sidebar lists on `index.astro` and `news.astro` with live items computed from real Softr news data — the top 5 from the last 7 days, ranked by `entityRelevance`, each clickable via the existing publisher-selection popup.

**Architecture:** A new pure utility function `getTrending` in `frontend/src/lib/newsUtils.ts` filters and sorts `MappedRecord[]` arrays already fetched by each page's SSR block. Both pages call the same function, swap their hardcoded `<ul class="trending">` for a dynamic template, and extend their popup event delegation to cover the trending list.

**Tech Stack:** Astro SSR, TypeScript, Vitest

---

## File Map

| File | Status | Responsibility |
|------|--------|---------------|
| `frontend/src/lib/newsUtils.ts` | **NEW** | `getTrending` pure utility |
| `frontend/src/__tests__/lib/newsUtils.test.ts` | **NEW** | 7 Vitest unit tests for `getTrending` |
| `frontend/src/pages/news.astro` | Modify | Import + compute + render + popup selector |
| `frontend/src/pages/index.astro` | Modify | Import + hoist + compute + render + popup listener |

---

### Task 1: `getTrending` utility (TDD)

**Files:**
- Create: `frontend/src/lib/newsUtils.ts`
- Create: `frontend/src/__tests__/lib/newsUtils.test.ts`

---

- [ ] **Step 1: Create the test file with all 7 failing tests**

Create `frontend/src/__tests__/lib/newsUtils.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getTrending } from '../../lib/newsUtils.js';
import type { MappedRecord } from '../../../../backend/services/softrService.js';

function makeRecord(overrides: { entityRelevance?: number; createdAt?: Date; } = {}): MappedRecord {
  const { entityRelevance, createdAt = new Date() } = overrides;
  const fields: Record<string, unknown> = {
    title: 'Test Headline',
    'Created At': createdAt.toISOString(),
  };
  if (entityRelevance !== undefined) {
    fields.entityRelevance = entityRelevance;
  }
  return { id: crypto.randomUUID(), fields } as unknown as MappedRecord;
}

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

describe('getTrending', () => {
  it('returns empty array for empty input', () => {
    expect(getTrending([])).toEqual([]);
  });

  it('excludes items older than 7 days', () => {
    const old = makeRecord({ createdAt: new Date(NOW - 8 * DAY) });
    expect(getTrending([old])).toHaveLength(0);
  });

  it('includes an item exactly at the 7-day boundary', () => {
    // Use NOW - 7*DAY + a small margin so the item is not excluded by clock drift in test run
    const boundary = makeRecord({ createdAt: new Date(NOW - 7 * DAY + 1000) });
    expect(getTrending([boundary])).toHaveLength(1);
  });

  it('includes items within 7 days', () => {
    const recent = makeRecord({ createdAt: new Date(NOW - 1 * DAY) });
    expect(getTrending([recent])).toHaveLength(1);
  });

  it('sorts by entityRelevance descending', () => {
    const low = makeRecord({ entityRelevance: 1, createdAt: new Date(NOW - 1 * DAY) });
    const high = makeRecord({ entityRelevance: 10, createdAt: new Date(NOW - 2 * DAY) });
    const result = getTrending([low, high]);
    expect(result[0].fields.entityRelevance).toBe(10);
    expect(result[1].fields.entityRelevance).toBe(1);
  });

  it('treats missing entityRelevance as 0 (sorts below items with value 1)', () => {
    const withValue = makeRecord({ entityRelevance: 1, createdAt: new Date(NOW - 1 * DAY) });
    const noValue = makeRecord({ createdAt: new Date(NOW - 2 * DAY) }); // no entityRelevance
    const result = getTrending([noValue, withValue]);
    expect(result[0].fields.entityRelevance).toBe(1);
    expect(result[1].fields.entityRelevance).toBeUndefined();
  });

  it('returns at most 5 items by default', () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      makeRecord({ entityRelevance: i, createdAt: new Date(NOW - 1 * DAY) })
    );
    expect(getTrending(items)).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Run tests — confirm all 7 fail**

```bash
npx vitest run frontend/src/__tests__/lib/newsUtils.test.ts
```

Expected: 7 failures with "Cannot find module '../../lib/newsUtils.js'" or similar.

- [ ] **Step 3: Create the utility**

Create `frontend/src/lib/newsUtils.ts`:

```ts
import type { MappedRecord } from '../../../backend/services/softrService.js';

export function getTrending(items: MappedRecord[], limit = 5): MappedRecord[] {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return items
    .filter(item => {
      const raw = item.fields?.['Created At'] ?? item.fields?.created_at
               ?? item.fields?.firstPublished ?? item.fields?.createdAt
               ?? item.created_at ?? '';
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

- [ ] **Step 4: Run tests — confirm all 7 pass**

```bash
npx vitest run frontend/src/__tests__/lib/newsUtils.test.ts
```

Expected: 7 passing tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/newsUtils.ts frontend/src/__tests__/lib/newsUtils.test.ts
git commit -m "feat: add getTrending utility with tests"
```

---

### Task 2: Wire up news.astro

**Files:**
- Modify: `frontend/src/pages/news.astro`

The page already fetches `newsItems: MappedRecord[]` with `limit: 50` (line 30). Four changes needed:
1. Add import
2. Compute `trendingItems` after the fetch block
3. Replace hardcoded `<ul class="trending">` (lines 884–892)
4. Add `.trending` to the popup container selector (line 1181)

---

- [ ] **Step 1: Add import**

In `frontend/src/pages/news.astro`, the frontmatter already has (line 5):
```ts
import { getLatestNews, getNewsForThemes, type MappedRecord } from '../../../backend/services/softrService.js';
```

Add immediately after it:
```ts
import { getTrending } from '../lib/newsUtils.js';
```

- [ ] **Step 2: Compute `trendingItems` after the fetch block**

In the frontmatter, after the closing `}` of the second `if (!isBuildTime)` block (the market snapshot fetch, around line 67), add:

```ts
const trendingItems = getTrending(newsItems);
```

- [ ] **Step 3: Replace the hardcoded trending list**

Find this block (lines 884–892):
```html
<ul class="trending">
  <li><span class="tn">01</span>ECB digital euro Phase 3</li>
  <li><span class="tn">02</span>MiCA enforcement timeline</li>
  <li><span class="tn">03</span>Tokenized treasuries AUM record</li>
  <li><span class="tn">04</span>Deutsche Bank custody expansion</li>
  <li><span class="tn">05</span>UCITS crypto allocation rules</li>
  <li><span class="tn">06</span>Stablecoin reserve transparency</li>
  <li><span class="tn">07</span>Bank custody licensing Europe</li>
</ul>
```

Replace with:
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

- [ ] **Step 4: Extend the popup container selector**

In the `<script>` block, find (line 1181):
```js
const newsContainers = document.querySelectorAll('.feed, .featured-scroll');
```

Change to:
```js
const newsContainers = document.querySelectorAll('.feed, .featured-scroll, .trending');
```

- [ ] **Step 5: Build check**

```bash
npm run build
```

Expected: build completes with no errors or TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/news.astro
git commit -m "feat: wire trending this week in news.astro"
```

---

### Task 3: Wire up index.astro

**Files:**
- Modify: `frontend/src/pages/index.astro`

Four changes needed:
1. Update imports (add `type` keyword to `MappedRecord`, add `getTrending`)
2. Hoist `rawLatestItems`, bump fetch limit to 50, capture `latestResult.data`
3. Compute `trendingItems` and replace hardcoded list
4. Add independent popup listener on `.trending`

---

- [ ] **Step 1: Update imports**

Find line 6 (current content):
```ts
import { getLatestNews, getNewsForThemes, MappedRecord } from '../../../backend/services/softrService.js';
```

Replace with:
```ts
import { getLatestNews, getNewsForThemes, type MappedRecord } from '../../../backend/services/softrService.js';
import { getTrending } from '../lib/newsUtils.js';
```

- [ ] **Step 2: Hoist `rawLatestItems`**

Find `let latestNewsItems` declaration (around line 119):
```ts
let latestNewsItems: NewsItem[] = [];
let newsByTheme = new Map<string, NewsItem[]>();
```

Add `rawLatestItems` after it:
```ts
let latestNewsItems: NewsItem[] = [];
let newsByTheme = new Map<string, NewsItem[]>();
let rawLatestItems: MappedRecord[] = [];
```

- [ ] **Step 3: Bump fetch limit and capture raw data**

Inside the `if (!isBuildTime)` block, find (line 170–171):
```ts
const [latestResult, themedResults] = await Promise.all([
  getLatestNews({ paging: { limit: 10 } }),
```

Change `limit: 10` to `limit: 50`:
```ts
const [latestResult, themedResults] = await Promise.all([
  getLatestNews({ paging: { limit: 50 } }),
```

Then immediately after the `await Promise.all(...)` line (before the `// Process latest news` comment, around line 175), add:
```ts
rawLatestItems = latestResult.data;
```

After this change, lines 170–180 should look like:
```ts
const [latestResult, themedResults] = await Promise.all([
  getLatestNews({ paging: { limit: 50 } }),
  getNewsForThemes(MARKET_FLOW_THEMES, { paging: { limit: 10 } }),
]);

rawLatestItems = latestResult.data;

// Process latest news
latestNewsItems = latestResult.data
  .map(mapRecordToNewsItem)
  .filter((item): item is NewsItem => item !== null)
  .slice(0, 5);
```

- [ ] **Step 4: Compute `trendingItems`**

After the closing `}` of the `if (!isBuildTime)` block that fetches news (around line 200), add:

```ts
const trendingItems = getTrending(rawLatestItems);
```

- [ ] **Step 5: Replace the hardcoded trending list**

Find this block (lines 1283–1290):
```html
<ul class="trending">
  <li><span class="tn">01</span>MiCA enforcement timeline</li>
  <li><span class="tn">02</span>Tokenized treasuries AUM record</li>
  <li><span class="tn">03</span>ECB digital euro Phase 2</li>
  <li><span class="tn">04</span>Stablecoin reserve transparency</li>
  <li><span class="tn">05</span>Bank custody licensing Europe</li>
</ul>
```

Replace with (same template as news.astro):
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

- [ ] **Step 6: Add the trending popup listener**

In the `<script>` block containing the popup IIFE, find lines 1747–1751 (after the three existing listener attachments, before the `marketFlowList` querySelector):

```js
  popupClose?.addEventListener('click', closePopup);
  popupOverlay?.addEventListener('click', closePopup);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePopup(); });

  // Handle news link clicks - use event delegation on the list
  const marketFlowList = document.querySelector('.marketflow-list');
```

Insert the trending listener block between the `keydown` listener and the `// Handle news link clicks` comment:

```js
  popupClose?.addEventListener('click', closePopup);
  popupOverlay?.addEventListener('click', closePopup);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePopup(); });

  // Trending sidebar popup — uses .news-item class (different from .marketflow-item)
  const trendingList = document.querySelector('.trending');
  if (trendingList) {
    trendingList.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest('.news-item') as HTMLElement | null;
      if (!item) return;
      e.preventDefault();

      const sourcesStr = item.getAttribute('data-sources');
      const urlsStr = item.getAttribute('data-urls');
      if (!sourcesStr || !urlsStr) return;

      let sources: string[], urls: string[];
      try {
        sources = JSON.parse(sourcesStr);
        urls = JSON.parse(urlsStr);
      } catch { return; }

      if (!Array.isArray(urls) || urls.length === 0) return;

      if (urls.length === 1) {
        window.open(urls[0], '_blank', 'noopener,noreferrer');
      } else {
        openPopup(sources, urls);
      }
    });
  }

  // Handle news link clicks - use event delegation on the list
  const marketFlowList = document.querySelector('.marketflow-list');
```

- [ ] **Step 7: Build check**

```bash
npm run build
```

Expected: build completes with no errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/index.astro
git commit -m "feat: wire trending this week in index.astro"
```
