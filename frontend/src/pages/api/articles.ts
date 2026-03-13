import type { APIRoute } from "astro";
import { getNewestArticles } from "../../../../backend/db/queries.js";

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);

  // Parse query parameters
  let limit = 10;
  let offset = 0;

  const limitParam = url.searchParams.get("limit");
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, 100);
    }
  }

  const offsetParam = url.searchParams.get("offset");
  if (offsetParam) {
    const parsed = parseInt(offsetParam, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      offset = parsed;
    }
  }

  try {
    const articles = await getNewestArticles(limit, offset);
    return new Response(JSON.stringify({ articles, count: articles.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("[API] Error fetching articles:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
