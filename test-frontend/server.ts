import "dotenv/config";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { getArticleByPublicationIdAndPostId, getNewestArticles } from "../db/queries.js";
import { getRecordsWithMappedFields, getRecordsRaw } from "../services/softrService.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.TEST_FRONTEND_PORT || 3001;

// Simple CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

// Serve static HTML
function serveHTML(res: ServerResponse) {
  try {
    const html = readFileSync(join(__dirname, "index.html"), "utf-8");
    res.writeHead(200, { "Content-Type": "text/html", ...corsHeaders });
    res.end(html);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Error loading HTML file");
  }
}

// API handler
async function handleAPI(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const pathname = url.pathname;

  // GET /api/articles - list newest articles
  if (pathname === "/api/articles" && req.method === "GET") {
    try {
      const limit = parseInt(url.searchParams.get("limit") || "10");
      const articles = await getNewestArticles(limit);
      res.writeHead(200, { "Content-Type": "application/json", ...corsHeaders });
      res.end(JSON.stringify({ articles }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json", ...corsHeaders });
      res.end(JSON.stringify({ error: "Failed to fetch articles" }));
    }
    return;
  }

  // GET /api/articles/:pubId/:postId - get single article
  const articleMatch = pathname.match(/\/api\/articles\/([^/]+)\/([^/]+)/);
  if (articleMatch && req.method === "GET") {
    const [, pubId, postId] = articleMatch;
    try {
      const article = await getArticleByPublicationIdAndPostId(pubId, postId);
      if (!article) {
        res.writeHead(404, { "Content-Type": "application/json", ...corsHeaders });
        res.end(JSON.stringify({ error: "Article not found" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json", ...corsHeaders });
      res.end(JSON.stringify({ article }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json", ...corsHeaders });
      res.end(JSON.stringify({ error: "Failed to fetch article" }));
    }
    return;
  }

  // GET /api/softr/records - test Softr API
  if (pathname === "/api/softr/records" && req.method === "GET") {
    const databaseId = url.searchParams.get("databaseId") || process.env.SOFTR_DATABASE_ID || "";
    const tableId = url.searchParams.get("tableId") || process.env.SOFTR_TABLE_ID || "";
    const viewId = url.searchParams.get("viewId") || process.env.SOFTR_VIEW_ID || undefined;
    const fieldNames = url.searchParams.get("fieldNames") === "true";
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    if (!databaseId || !tableId) {
      res.writeHead(400, { "Content-Type": "application/json", ...corsHeaders });
      res.end(JSON.stringify({ error: "databaseId and tableId are required" }));
      return;
    }

    try {
      const records = await getRecords(databaseId, tableId, {
        viewId: viewId || undefined,
        fieldNames,
        paging: { limit, offset }
      });
      res.writeHead(200, { "Content-Type": "application/json", ...corsHeaders });
      res.end(JSON.stringify({ records }));
    } catch (err: any) {
      res.writeHead(500, { "Content-Type": "application/json", ...corsHeaders });
      res.end(JSON.stringify({ error: err.message || "Failed to fetch Softr records" }));
    }
    return;
  }

  // GET /api/softr/records/mapped - fetch with field name mapping (default)
  if (pathname === "/api/softr/records/mapped" && req.method === "GET") {
    const databaseId = url.searchParams.get("databaseId") || process.env.SOFTR_DATABASE_ID || "";
    const tableId = url.searchParams.get("tableId") || process.env.SOFTR_TABLE_ID || "";
    const viewId = url.searchParams.get("viewId") || process.env.SOFTR_VIEW_ID || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    if (!databaseId || !tableId) {
      res.writeHead(400, { "Content-Type": "application/json", ...corsHeaders });
      res.end(JSON.stringify({ error: "databaseId and tableId are required" }));
      return;
    }

    try {
      const records = await getRecordsWithMappedFields(databaseId, tableId, {
        viewId: viewId || undefined,
        paging: { limit, offset }
      });

      res.writeHead(200, { "Content-Type": "application/json", ...corsHeaders });
      res.end(JSON.stringify({ records }));
    } catch (err: any) {
      res.writeHead(500, { "Content-Type": "application/json", ...corsHeaders });
      res.end(JSON.stringify({ error: err.message || "Failed to fetch Softr records" }));
    }
    return;
  }

  // GET /api/softr/records/raw - fetch with raw field IDs
  if (pathname === "/api/softr/records/raw" && req.method === "GET") {
    const databaseId = url.searchParams.get("databaseId") || process.env.SOFTR_DATABASE_ID || "";
    const tableId = url.searchParams.get("tableId") || process.env.SOFTR_TABLE_ID || "";
    const viewId = url.searchParams.get("viewId") || process.env.SOFTR_VIEW_ID || undefined;
    const fieldNames = url.searchParams.get("fieldNames") === "true";
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    if (!databaseId || !tableId) {
      res.writeHead(400, { "Content-Type": "application/json", ...corsHeaders });
      res.end(JSON.stringify({ error: "databaseId and tableId are required" }));
      return;
    }

    try {
      const records = await getRecordsRaw(databaseId, tableId, {
        viewId: viewId || undefined,
        fieldNames,
        paging: { limit, offset }
      });
      res.writeHead(200, { "Content-Type": "application/json", ...corsHeaders });
      res.end(JSON.stringify({ records }));
    } catch (err: any) {
      res.writeHead(500, { "Content-Type": "application/json", ...corsHeaders });
      res.end(JSON.stringify({ error: err.message || "Failed to fetch Softr records" }));
    }
    return;
  }

  // 404 for unknown API routes
  res.writeHead(404, { "Content-Type": "application/json", ...corsHeaders });
  res.end(JSON.stringify({ error: "Not found" }));
}

// Main server
const server = createServer(async (req, res) => {
  const url = req.url || "";

  // Handle API routes
  if (url.startsWith("/api/")) {
    await handleAPI(req, res);
    return;
  }

  // Serve HTML for root
  if (url === "/" || url === "/index.html") {
    serveHTML(res);
    return;
  }

  // 404 for everything else
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Test frontend server running at http://localhost:${PORT}`);
});
