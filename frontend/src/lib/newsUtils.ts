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
