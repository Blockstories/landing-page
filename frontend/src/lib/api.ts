import type { Article, Report } from "../types/content.js";

export interface FetchArticlesOptions {
  limit?: number;
  offset?: number;
  baseUrl?: string;
  /** Purpose/section identifier for dev logging */
  purpose?: string;
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
  const { limit = 10, offset = 0, baseUrl = "", purpose = "unknown" } = options;

  const url = new URL("/api/articles", baseUrl || window.location.origin);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  console.log(`[API] Fetching articles for: ${purpose} | limit=${limit}, offset=${offset}`);
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

// ============================================================================
// REPORTS API
// ============================================================================

export interface FetchReportsOptions {
  limit?: number;
  offset?: number;
  tags?: string[];
  baseUrl?: string;
  /** Purpose/section identifier for dev logging */
  purpose?: string;
}

export interface FetchReportsResult {
  reports: Report[];
  count: number;
}

/**
 * Fetch reports from the API
 * GET /api/reports
 */
export async function fetchReports(
  options: FetchReportsOptions = {}
): Promise<FetchReportsResult> {
  const { limit = 10, offset = 0, tags, baseUrl = "", purpose = "unknown" } = options;

  const url = new URL("/api/reports", baseUrl || window.location.origin);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  if (tags && tags.length > 0) {
    url.searchParams.set("tags", tags.join(","));
  }

  console.log(`[API] Fetching reports for: ${purpose} | limit=${limit}, offset=${offset}${tags ? `, tags=${tags.join(",")}` : ""}`);
  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Failed to fetch reports: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Filter reports by tags (client-side filtering)
 */
export function filterReportsByTags(
  reports: Report[],
  tags: string[]
): Report[] {
  if (!tags.length) return reports;
  return reports.filter((report) =>
    tags.some((tag) => report.tags.includes(tag))
  );
}

/**
 * Format a report's publish date for display
 */
export function formatReportDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}
