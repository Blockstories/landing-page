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
