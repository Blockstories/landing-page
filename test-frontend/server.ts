  import "dotenv/config";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { getArticleByPublicationIdAndPostId, getNewestArticles } from "../db/queries.js";
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
