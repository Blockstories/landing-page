import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./articles.js";
import * as queries from "../../../../backend/db/queries.js";

// Mock dependencies
vi.mock("../../../../backend/db/queries.js");

interface MockResponse {
  statusCode: number;
  jsonData: unknown;
  headers: Map<string, string>;
}

function createMockRequest(url: string): Request {
  return new Request(url);
}

async function callHandler(request: Request): Promise<MockResponse> {
  const response = await GET({ request } as any);
  const jsonData = await response.json();
  return {
    statusCode: response.status,
    jsonData,
    headers: new Map(response.headers.entries())
  };
}

describe("GET /api/articles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 when publicationId is missing", async () => {
    const req = createMockRequest("http://localhost/api/articles");
    const res = await callHandler(req);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData).toEqual({ error: "Missing required parameter: publicationId" });
  });

  it("should return articles with pagination", async () => {
    const mockArticles = [
      {
        id: 1,
        beehiivPublicationId: "pub_123",
        title: "Article 1",
        subtitle: "Subtitle 1",
        authors: [{ id: 1, name: "Author 1", slug: "author-1" }],
        featured: [{ id: 2, name: "Featured 1", slug: "featured-1" }],
        publishDate: 1700000000,
        tags: ["crypto"],
        thumbnailUrl: "https://example.com/1.jpg",
        webUrl: "https://example.com/1",
        summary: "Summary 1"
      },
      {
        id: 2,
        beehiivPublicationId: "pub_123",
        title: "Article 2",
        subtitle: undefined,
        authors: [],
        featured: [],
        publishDate: 1699999999,
        tags: [],
        thumbnailUrl: undefined,
        webUrl: undefined,
        summary: undefined
      }
    ];

    vi.mocked(queries.getArticlesByPublication).mockResolvedValue({
      articles: mockArticles,
      hasMore: true,
      nextCursor: "eyJ0cyI6MTY5OTk5OTk5OSwiaWQiOjJ9"
    });

    const req = createMockRequest("http://localhost/api/articles?publicationId=pub_123&limit=2");
    const res = await callHandler(req);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toEqual({
      articles: [
        {
          id: 1,
          beehiivPublicationId: "pub_123",
          title: "Article 1",
          subtitle: "Subtitle 1",
          authors: [{ id: 1, name: "Author 1", slug: "author-1" }],
          featured: [{ id: 2, name: "Featured 1", slug: "featured-1" }],
          publishDate: 1700000000,
          tags: ["crypto"],
          thumbnailUrl: "https://example.com/1.jpg",
          webUrl: "https://example.com/1",
          summary: "Summary 1"
        },
        {
          id: 2,
          beehiivPublicationId: "pub_123",
          title: "Article 2",
          subtitle: undefined,
          authors: [],
          featured: [],
          publishDate: 1699999999,
          tags: [],
          thumbnailUrl: undefined,
          webUrl: undefined,
          summary: undefined
        }
      ],
      pagination: {
        hasMore: true,
        nextCursor: "eyJ0cyI6MTY5OTk5OTk5OSwiaWQiOjJ9"
      }
    });
  });

  it("should return 400 for invalid limit", async () => {
    const req = createMockRequest("http://localhost/api/articles?publicationId=pub_123&limit=invalid");
    const res = await callHandler(req);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData).toEqual({ error: "Invalid limit parameter" });
  });

  it("should return 400 for limit exceeding maximum", async () => {
    const req = createMockRequest("http://localhost/api/articles?publicationId=pub_123&limit=101");
    const res = await callHandler(req);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData).toEqual({ error: "Invalid limit parameter" });
  });

  it("should return 400 for invalid cursor", async () => {
    const req = createMockRequest("http://localhost/api/articles?publicationId=pub_123&cursor=invalid-base64!!!");
    const res = await callHandler(req);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData).toEqual({ error: "Invalid cursor parameter" });
  });

  it("should return 400 for cursor with invalid JSON", async () => {
    // Valid base64 but invalid JSON
    const invalidCursor = Buffer.from("not valid json").toString("base64");
    const req = createMockRequest(`http://localhost/api/articles?publicationId=pub_123&cursor=${invalidCursor}`);
    const res = await callHandler(req);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData).toEqual({ error: "Invalid cursor parameter" });
  });

  it("should use default limit of 20 when not specified", async () => {
    vi.mocked(queries.getArticlesByPublication).mockResolvedValue({
      articles: [],
      hasMore: false
    });

    const req = createMockRequest("http://localhost/api/articles?publicationId=pub_123");
    await callHandler(req);

    expect(queries.getArticlesByPublication).toHaveBeenCalledWith("pub_123", 20, undefined);
  });

  it("should pass cursor to query when provided", async () => {
    const cursor = Buffer.from(JSON.stringify({ ts: 1700000000, id: 5 })).toString("base64");
    vi.mocked(queries.getArticlesByPublication).mockResolvedValue({
      articles: [],
      hasMore: false
    });

    const req = createMockRequest(`http://localhost/api/articles?publicationId=pub_123&cursor=${cursor}`);
    await callHandler(req);

    expect(queries.getArticlesByPublication).toHaveBeenCalledWith("pub_123", 20, { ts: 1700000000, id: 5 });
  });

  it("should return 500 on internal error", async () => {
    vi.mocked(queries.getArticlesByPublication).mockRejectedValue(new Error("Database error"));

    const req = createMockRequest("http://localhost/api/articles?publicationId=pub_123");
    const res = await callHandler(req);

    expect(res.statusCode).toBe(500);
    expect(res.jsonData).toEqual({ error: "Internal server error" });
  });

  it("should handle empty articles list", async () => {
    vi.mocked(queries.getArticlesByPublication).mockResolvedValue({
      articles: [],
      hasMore: false
    });

    const req = createMockRequest("http://localhost/api/articles?publicationId=pub_123");
    const res = await callHandler(req);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toEqual({
      articles: [],
      pagination: {
        hasMore: false
      }
    });
  });
});
