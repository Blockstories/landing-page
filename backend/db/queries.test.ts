import { describe, it, expect, vi, beforeEach } from "vitest";
import { getNewestArticles, getArticleByPublicationIdAndPostId, createArticle } from "./queries.js";
import { Article } from "./types.js";

// Mock the db client
vi.mock("./client.js", () => ({
  db: {
    execute: vi.fn()
  }
}));

import { db } from "./client.js";

const mockExecute = vi.mocked(db.execute);

describe("getNewestArticles", () => {
  beforeEach(() => {
    mockExecute.mockClear();
  });

  it("should return articles ordered by publish_date DESC", async () => {
    const mockRows = [
      {
        id: 1,
        beehiiv_post_id: "post_1",
        beehiiv_publication_id: "pub_1",
        title: "Article 1",
        subtitle: "Subtitle 1",
        authors: "[\"Author 1\"]",
        publish_date: 1700000000,
        status: "confirmed",
        tags: "[\"tag1\"]",
        thumbnail_url: "https://example.com/1.jpg",
        web_url: "https://example.com/1",
        summary: "Summary 1",
        content: "Content 1"
      },
      {
        id: 2,
        beehiiv_post_id: "post_2",
        beehiiv_publication_id: "pub_1",
        title: "Article 2",
        subtitle: null,
        authors: "[]",
        publish_date: 1699999999,
        status: "draft",
        tags: "[]",
        thumbnail_url: null,
        web_url: null,
        summary: null,
        content: null
      }
    ];

    mockExecute.mockResolvedValueOnce({ rows: mockRows } as any);

    const result = await getNewestArticles(10);

    expect(mockExecute).toHaveBeenCalledWith(
      "SELECT * FROM articles ORDER BY publish_date DESC LIMIT ?",
      [10]
    );
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("Article 1");
    expect(result[1].title).toBe("Article 2");
  });

  it("should use default limit of 10 when not specified", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] } as any);

    await getNewestArticles();

    expect(mockExecute).toHaveBeenCalledWith(
      "SELECT * FROM articles ORDER BY publish_date DESC LIMIT ?",
      [10]
    );
  });

  it("should return empty array when no articles exist", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] } as any);

    const result = await getNewestArticles(5);

    expect(result).toEqual([]);
  });
});

describe("getArticleByPublicationIdAndPostId", () => {
  beforeEach(() => {
    mockExecute.mockClear();
  });

  it("should return article when found", async () => {
    const mockRow = {
      id: 1,
      beehiiv_post_id: "post_123",
      beehiiv_publication_id: "pub_456",
      title: "Found Article",
      subtitle: "Subtitle",
      authors: "[\"Author\"]",
      publish_date: 1700000000,
      status: "confirmed",
      tags: "[\"tag\"]",
      thumbnail_url: "https://example.com/img.jpg",
      web_url: "https://example.com/article",
      summary: "Summary",
      content: "Content"
    };

    mockExecute.mockResolvedValueOnce({ rows: [mockRow] } as any);

    const result = await getArticleByPublicationIdAndPostId("pub_456", "post_123");

    expect(mockExecute).toHaveBeenCalledWith(
      "SELECT * FROM articles WHERE beehiiv_publication_id = ? AND beehiiv_post_id = ?",
      ["pub_456", "post_123"]
    );
    expect(result).not.toBeNull();
    expect(result?.title).toBe("Found Article");
    expect(result?.beehiivPostId).toBe("post_123");
  });

  it("should return null when article not found", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] } as any);

    const result = await getArticleByPublicationIdAndPostId("pub_999", "post_999");

    expect(result).toBeNull();
  });
});

describe("createArticle", () => {
  beforeEach(() => {
    mockExecute.mockClear();
  });

  it("should insert article and return the created article", async () => {
    const newArticle: Omit<Article, "id"> = {
      beehiivPostId: "post_new",
      beehiivPublicationId: "pub_new",
      title: "New Article",
      subtitle: "New Subtitle",
      authors: ["Author A", "Author B"],
      publishDate: 1700000000,
      status: "confirmed",
      tags: ["crypto", "news"],
      thumbnailUrl: "https://example.com/new.jpg",
      webUrl: "https://example.com/new",
      summary: "New summary",
      content: "<p>New content</p>"
    };

    const mockInsertedRow = {
      id: 100,
      beehiiv_post_id: "post_new",
      beehiiv_publication_id: "pub_new",
      title: "New Article",
      subtitle: "New Subtitle",
      authors: "[\"Author A\", \"Author B\"]",
      publish_date: 1700000000,
      status: "confirmed",
      tags: "[\"crypto\", \"news\"]",
      thumbnail_url: "https://example.com/new.jpg",
      web_url: "https://example.com/new",
      summary: "New summary",
      content: "<p>New content</p>"
    };

    mockExecute
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [mockInsertedRow] } as any);

    const result = await createArticle(newArticle);

    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockExecute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("INSERT INTO articles"),
      [
        "post_new",
        "pub_new",
        "New Article",
        "New Subtitle",
        JSON.stringify(["Author A", "Author B"]),
        1700000000,
        "confirmed",
        JSON.stringify(["crypto", "news"]),
        "https://example.com/new.jpg",
        "https://example.com/new",
        "New summary",
        "<p>New content</p>"
      ]
    );
    expect(result.id).toBe(100);
    expect(result.title).toBe("New Article");
  });

  it("should throw error when article retrieval fails after insert", async () => {
    const newArticle: Omit<Article, "id"> = {
      beehiivPostId: "post_fail",
      beehiivPublicationId: "pub_fail",
      title: "Fail Article",
      authors: [],
      publishDate: 1700000000,
      status: "draft",
      tags: []
    };

    mockExecute
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [] } as any);

    await expect(createArticle(newArticle)).rejects.toThrow(
      "Failed to retrieve newly inserted article"
    );
  });
});
