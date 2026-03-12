import type { APIRoute } from "astro";
import { getArticlesByPublication } from "../../../../backend/db/queries.js";
import type { Article, Person } from "../../../../backend/db/types.js";

export interface ArticlesResponse {
  articles: Array<{
    id: number;
    beehiivPublicationId: string;
    title: string;
    subtitle?: string;
    authors: Person[];
    featured: Person[];
    publishDate: number;
    tags: string[];
    thumbnailUrl?: string | null;
    webUrl?: string | null;
    summary?: string;
    content?: string;
  }>;
  pagination: { hasMore: boolean; nextCursor?: string };
}

export interface Cursor {
  ts: number;
  id: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64");
}

function decodeCursor(cursorStr: string): Cursor | null {
  try {
    const decoded = Buffer.from(cursorStr, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    if (typeof parsed.ts === "number" && typeof parsed.id === "number") {
      return parsed as Cursor;
    }
    return null;
  } catch {
    return null;
  }
}

function validateLimit(limitStr: string | null): number | null {
  if (limitStr === null) {
    return DEFAULT_LIMIT;
  }
  const limit = parseInt(limitStr, 10);
  if (isNaN(limit) || limit < 1 || limit > MAX_LIMIT) {
    return null;
  }
  return limit;
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const publicationId = url.searchParams.get("publicationId");

    // Validate publicationId
    if (!publicationId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: publicationId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate limit
    const limit = validateLimit(url.searchParams.get("limit"));
    if (limit === null) {
      return new Response(
        JSON.stringify({ error: "Invalid limit parameter" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate cursor
    const cursorStr = url.searchParams.get("cursor");
    let cursor: Cursor | undefined;
    if (cursorStr) {
      const decoded = decodeCursor(cursorStr);
      if (!decoded) {
        return new Response(
          JSON.stringify({ error: "Invalid cursor parameter" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      cursor = decoded;
    }

    // Fetch articles
    const result = await getArticlesByPublication(publicationId, limit, cursor);

    // Build response
    const response: ArticlesResponse = {
      articles: result.articles,
      pagination: {
        hasMore: result.hasMore,
        ...(result.nextCursor ? { nextCursor: result.nextCursor } : {})
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error fetching articles:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
