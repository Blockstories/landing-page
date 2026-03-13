import type { Article } from "../types/article.js";

export interface FetchArticlesOptions {
  limit?: number;
  offset?: number;
  baseUrl?: string;
}

export interface FetchArticlesResult {
  articles: Article[];
  count: number;
}

/**
 * Fetch articles from the API
 * GET /api/articles
 */
export async function fetchArticles(
  options: FetchArticlesOptions = {}
): Promise<FetchArticlesResult> {
  const { limit = 10, offset = 0, baseUrl = "" } = options;

  const url = new URL("/api/articles", baseUrl || window.location.origin);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Failed to fetch articles: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Filter articles by publication ID
 */
export function filterArticlesByPublication(
  articles: Article[],
  publicationId: string
): Article[] {
  return articles.filter(
    (article) => article.beehiivPublicationId === publicationId
  );
}
