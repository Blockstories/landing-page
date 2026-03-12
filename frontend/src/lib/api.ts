import type { ArticlesResponse } from "../pages/api/articles.js";

export interface FetchArticlesOptions {
  publicationId: string;
  limit?: number;
  cursor?: string;
  baseUrl: string;  // Required: pass Astro.url.origin from server context
}

export async function fetchArticles(
  options: FetchArticlesOptions
): Promise<ArticlesResponse> {
  const { publicationId, limit = 10, cursor, baseUrl } = options;

  const params = new URLSearchParams();
  params.set("publicationId", publicationId);
  if (limit !== 10) params.set("limit", limit.toString());
  if (cursor) params.set("cursor", cursor);

  // Construct absolute URL using baseUrl from Astro.url.origin
  const url = `${baseUrl}/api/articles?${params.toString()}`;

  // Add 5-second timeout using AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to fetch articles: ${response.status}`);
    }

    return response.json() as Promise<ArticlesResponse>;
  } finally {
    clearTimeout(timeoutId);
  }
}
