import { describe, it, expect, vi, beforeEach } from "vitest";
import articlesHandler from "./articles.js";
import type { Article } from "../db/types.js";

// Mock the db queries
vi.mock("../db/queries.js", () => ({
  getNewestArticles: vi.fn()
}));

import { getNewestArticles } from "../db/queries.js";

const mockGetNewestArticles = vi.mocked(getNewestArticles);

describe("Articles API", () => {
  beforeEach(() => {
    mockGetNewestArticles.mockClear();
  });

  function createMockReq(options: { method?: string; query?: Record<string, string | string[]> } = {}) {
    return {
      method: options.method || "GET",
      query: options.query || {}
    };
  }

  function createMockRes() {
    const jsonMock = vi.fn();
    return {
      status: vi.fn().mockReturnValue({ json: jsonMock }),
      json: jsonMock
    };
  }

  it("should return articles on GET request", async () => {
    const mockArticles: Article[] = [
      {
        id: 1,
        beehiivPostId: "post_1",
        beehiivPublicationId: "pub_1",
        title: "Article 1",
        subtitle: "Subtitle 1",
        authors: [],
        featured: [],
        publishDate: 1700000000,
        status: "confirmed",
        tags: ["crypto"],
        thumbnailUrl: "https://example.com/1.jpg",
        webUrl: "https://example.com/1",
        summary: "Summary 1",
        content: "Content 1"
      },
      {
        id: 2,
        beehiivPostId: "post_2",
        beehiivPublicationId: "pub_1",
        title: "Article 2",
        authors: [],
        featured: [],
        publishDate: 1699999999,
        status: "draft",
        tags: [],
        thumbnailUrl: null,
        webUrl: null
      }
    ];

    mockGetNewestArticles.mockResolvedValueOnce(mockArticles);

    const req = createMockReq();
    const res = createMockRes();

    await articlesHandler(req, res as any);

    expect(mockGetNewestArticles).toHaveBeenCalledWith(10, 0);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      articles: mockArticles,
      count: 2
    });
  });

  it("should use default limit of 10 and offset of 0", async () => {
    mockGetNewestArticles.mockResolvedValueOnce([]);

    const req = createMockReq();
    const res = createMockRes();

    await articlesHandler(req, res as any);

    expect(mockGetNewestArticles).toHaveBeenCalledWith(10, 0);
  });

  it("should accept custom limit and offset", async () => {
    mockGetNewestArticles.mockResolvedValueOnce([]);

    const req = createMockReq({
      query: { limit: "5", offset: "10" }
    });
    const res = createMockRes();

    await articlesHandler(req, res as any);

    expect(mockGetNewestArticles).toHaveBeenCalledWith(5, 10);
  });

  it("should cap limit at 100", async () => {
    mockGetNewestArticles.mockResolvedValueOnce([]);

    const req = createMockReq({
      query: { limit: "500" }
    });
    const res = createMockRes();

    await articlesHandler(req, res as any);

    expect(mockGetNewestArticles).toHaveBeenCalledWith(100, 0);
  });

  it("should reject non-GET methods", async () => {
    const req = createMockReq({ method: "POST" });
    const res = createMockRes();

    await articlesHandler(req, res as any);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: "Method not allowed" });
    expect(mockGetNewestArticles).not.toHaveBeenCalled();
  });

  it("should handle invalid query parameters gracefully", async () => {
    mockGetNewestArticles.mockResolvedValueOnce([]);

    const req = createMockReq({
      query: { limit: "invalid", offset: "invalid" }
    });
    const res = createMockRes();

    await articlesHandler(req, res as any);

    // Should fall back to defaults
    expect(mockGetNewestArticles).toHaveBeenCalledWith(10, 0);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should reject negative offset", async () => {
    mockGetNewestArticles.mockResolvedValueOnce([]);

    const req = createMockReq({
      query: { offset: "-5" }
    });
    const res = createMockRes();

    await articlesHandler(req, res as any);

    // Should fall back to default (0)
    expect(mockGetNewestArticles).toHaveBeenCalledWith(10, 0);
  });

  it("should return 500 on database error", async () => {
    mockGetNewestArticles.mockRejectedValueOnce(new Error("DB Error"));

    const req = createMockReq();
    const res = createMockRes();

    await articlesHandler(req, res as any);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
  });

  it("should handle array query parameters (use first value)", async () => {
    mockGetNewestArticles.mockResolvedValueOnce([]);

    const req = createMockReq({
      query: { limit: ["5", "10"], offset: ["20", "30"] }
    });
    const res = createMockRes();

    await articlesHandler(req, res as any);

    expect(mockGetNewestArticles).toHaveBeenCalledWith(5, 20);
  });
});
