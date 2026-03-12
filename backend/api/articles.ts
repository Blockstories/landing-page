import { getNewestArticles } from "../db/queries.js";
import type { Article } from "../db/types.js";

interface ArticlesResponse {
  articles: Article[];
  count: number;
}

interface ErrorResponse {
  error: string;
}

function log(message: string, data?: Record<string, unknown>): void {
  console.log(`[API] ${message}`, data ? JSON.stringify(data) : "");
}

/**
 * API handler for fetching newest articles
 * GET /api/articles
 *
 * Query params:
 * - limit: Number of articles to fetch (default: 10, max: 100)
 * - offset: Number of articles to skip for pagination (default: 0)
 */
export default async function handler(
  req: {
    method: string;
    query: Record<string, string | string[] | undefined>;
  },
  res: {
    status: (code: number) => {
      json: (data: ArticlesResponse | ErrorResponse) => void;
    };
  }
): Promise<void> {
  log("Received request", { method: req.method });

  // Validate HTTP method
  if (req.method !== "GET") {
    log("Rejected: Method not allowed", { method: req.method });
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Parse and validate query parameters
  let limit = 10;
  let offset = 0;

  if (req.query.limit !== undefined) {
    const parsedLimit = parseInt(String(req.query.limit), 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      limit = Math.min(parsedLimit, 100); // Cap at 100
    }
  }

  if (req.query.offset !== undefined) {
    const parsedOffset = parseInt(String(req.query.offset), 10);
    if (!isNaN(parsedOffset) && parsedOffset >= 0) {
      offset = parsedOffset;
    }
  }

  log("Fetching articles", { limit, offset });

  try {
    const articles = await getNewestArticles(limit, offset);

    log("Articles fetched", { count: articles.length });
    res.status(200).json({ articles, count: articles.length });
  } catch (error) {
    log("Error fetching articles", {
      error: error instanceof Error ? error.message : "Unknown error"
    });
    res.status(500).json({ error: "Internal server error" });
  }
}
