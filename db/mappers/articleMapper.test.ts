import { describe, it, expect } from "vitest";
import { mapRowToArticle } from "./articleMapper.js";
import { Article } from "../types.js";

describe("mapRowToArticle", () => {
  it("should map a complete database row to an Article object", () => {
    const row = {
      id: 1,
      beehiiv_post_id: "post_123",
      beehiiv_publication_id: "pub_456",
      title: "Test Article",
      subtitle: "Test Subtitle",
      authors: '["Author One", "Author Two"]',
      publish_date: 1699999999,
      status: "confirmed",
      tags: '["tag1", "tag2"]',
      thumbnail_url: "https://example.com/image.jpg",
      web_url: "https://example.com/article",
      summary: "Test summary",
      content: "<p>Test content</p>"
    };

    const result = mapRowToArticle(row);

    expect(result).toEqual({
      id: 1,
      beehiivPostId: "post_123",
      beehiivPublicationId: "pub_456",
      title: "Test Article",
      subtitle: "Test Subtitle",
      authors: ["Author One", "Author Two"],
      publishDate: 1699999999,
      status: "confirmed",
      tags: ["tag1", "tag2"],
      thumbnailUrl: "https://example.com/image.jpg",
      webUrl: "https://example.com/article",
      summary: "Test summary",
      content: "<p>Test content</p>"
    });
  });

  it("should handle null/undefined optional fields gracefully", () => {
    const row = {
      id: 2,
      beehiiv_post_id: "post_789",
      beehiiv_publication_id: "pub_000",
      title: "Minimal Article",
      subtitle: null,
      authors: null,
      publish_date: 1700000000,
      status: "draft",
      tags: null,
      thumbnail_url: null,
      web_url: null,
      summary: null,
      content: null
    };

    const result = mapRowToArticle(row);

    expect(result).toEqual({
      id: 2,
      beehiivPostId: "post_789",
      beehiivPublicationId: "pub_000",
      title: "Minimal Article",
      subtitle: null,
      authors: [],
      publishDate: 1700000000,
      status: "draft",
      tags: [],
      thumbnailUrl: null,
      webUrl: null,
      summary: undefined,
      content: undefined
    });
  });

  it("should parse empty JSON arrays for authors and tags", () => {
    const row = {
      id: 3,
      beehiiv_post_id: "post_abc",
      beehiiv_publication_id: "pub_def",
      title: "Empty Arrays Article",
      subtitle: "",
      authors: "[]",
      publish_date: 1700000001,
      status: "scheduled",
      tags: "[]",
      thumbnail_url: "",
      web_url: "",
      summary: "",
      content: ""
    };

    const result = mapRowToArticle(row);

    expect(result.authors).toEqual([]);
    expect(result.tags).toEqual([]);
  });
});
