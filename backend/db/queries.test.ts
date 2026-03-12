import { describe, it, expect, vi, beforeEach } from "vitest";
import { getNewestArticles, getArticleByPublicationIdAndPostId, createArticle } from "./queries.js";
import { Article, Person } from "./types.js";

// Mock the db client
vi.mock("./client.js", () => ({
  db: {
    execute: vi.fn()
  }
}));

import { db } from "./client.js";

const mockExecute = vi.mocked(db.execute);

// Helper to mock empty people results for articles
function mockEmptyPeopleForArticles(articleIds: number[]) {
  for (const _ of articleIds) {
    mockExecute.mockResolvedValueOnce({ rows: [] } as any);
  }
}

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
    mockEmptyPeopleForArticles([1, 2]);

    const result = await getNewestArticles(10);

    expect(mockExecute).toHaveBeenCalledWith(
      "SELECT * FROM articles ORDER BY publish_date DESC LIMIT ?",
      [10]
    );
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("Article 1");
    expect(result[1].title).toBe("Article 2");
    expect(result[0].authors).toEqual([]);
    expect(result[0].featured).toEqual([]);
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
      publish_date: 1700000000,
      status: "confirmed",
      tags: "[\"tag\"]",
      thumbnail_url: "https://example.com/img.jpg",
      web_url: "https://example.com/article",
      summary: "Summary",
      content: "Content"
    };

    mockExecute
      .mockResolvedValueOnce({ rows: [mockRow] } as any)
      .mockResolvedValueOnce({ rows: [] } as any);

    const result = await getArticleByPublicationIdAndPostId("pub_456", "post_123");

    expect(mockExecute).toHaveBeenCalledWith(
      "SELECT * FROM articles WHERE beehiiv_publication_id = ? AND beehiiv_post_id = ?",
      ["pub_456", "post_123"]
    );
    expect(result).not.toBeNull();
    expect(result?.title).toBe("Found Article");
    expect(result?.beehiivPostId).toBe("post_123");
    expect(result?.authors).toEqual([]);
    expect(result?.featured).toEqual([]);
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
    const authors: Person[] = [
      { id: 1, name: "Author A", slug: "author-a" },
      { id: 2, name: "Author B", slug: "author-b" }
    ];

    const newArticle: Omit<Article, "id"> = {
      beehiivPostId: "post_new",
      beehiivPublicationId: "pub_new",
      title: "New Article",
      subtitle: "New Subtitle",
      authors: authors,
      featured: [],
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
      publish_date: 1700000000,
      status: "confirmed",
      tags: "[\"crypto\", \"news\"]",
      thumbnail_url: "https://example.com/new.jpg",
      web_url: "https://example.com/new",
      summary: "New summary",
      content: "<p>New content</p>"
    };

    mockExecute.mockReset();
    mockExecute
      .mockResolvedValueOnce({ rows: [] } as any)  // 1. INSERT article
      .mockResolvedValueOnce({ rows: [mockInsertedRow] } as any)  // 2. SELECT by pub/post (getArticleByPublicationIdAndPostId)
      .mockResolvedValueOnce({ rows: [] } as any)  // 3. SELECT people (getPeopleForArticle called by getArticleByPublicationIdAndPostId)
      .mockResolvedValueOnce({ rows: [] } as any)  // 4. INSERT author 1
      .mockResolvedValueOnce({ rows: [] } as any)  // 5. INSERT author 2
      .mockResolvedValueOnce({ rows: [mockInsertedRow] } as any)  // 6. SELECT by id (getArticleById)
      .mockResolvedValueOnce({ rows: [] } as any); // 7. SELECT people (getPeopleForArticle called by getArticleById)

    const result = await createArticle(newArticle, [
      { personId: 1, role: "author" },
      { personId: 2, role: "author" }
    ]);

    expect(mockExecute).toHaveBeenCalledTimes(7);
    expect(result.id).toBe(100);
    expect(result.title).toBe("New Article");
    expect(result.authors).toEqual([]);
    expect(result.featured).toEqual([]);
  });

  it("should throw error when article retrieval fails after insert", async () => {
    const newArticle: Omit<Article, "id"> = {
      beehiivPostId: "post_fail",
      beehiivPublicationId: "pub_fail",
      title: "Fail Article",
      authors: [],
      featured: [],
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
