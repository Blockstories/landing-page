import { describe, it, expect } from "vitest";
import { mapBeehiivPostToArticle } from "./article.js";
import { mapRowToArticle } from "../db/mappers.js";
import { BeehiivPost } from "../integrations/beehiiv.js";

describe("mapRowToArticle", () => {
  it("should map a complete database row to an Article base object", () => {
    const row = {
      id: 1,
      beehiiv_post_id: "post_123",
      beehiiv_publication_id: "pub_456",
      title: "Test Article",
      subtitle: "Test Subtitle",
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
      subtitle: undefined,
      publishDate: 1700000000,
      status: "draft",
      tags: [],
      thumbnailUrl: undefined,
      webUrl: undefined,
      summary: undefined,
      content: undefined
    });
  });

  it("should parse empty JSON arrays for tags", () => {
    const row = {
      id: 3,
      beehiiv_post_id: "post_abc",
      beehiiv_publication_id: "pub_def",
      title: "Empty Arrays Article",
      subtitle: "",
      publish_date: 1700000001,
      status: "scheduled",
      tags: "[]",
      thumbnail_url: "",
      web_url: "",
      summary: "",
      content: ""
    };

    const result = mapRowToArticle(row);

    expect(result.tags).toEqual([]);
  });
});

describe("mapBeehiivPostToArticle", () => {
  it("should map a complete BeehiivPost to Article input", () => {
    const post: BeehiivPost = {
      id: "post_123",
      publication_id: "pub_456",
      title: "Test Article",
      subtitle: "Test Subtitle",
      authors: ["Author One", "Author Two"],
      created: 1699999990,
      status: "confirmed",
      subject_line: "Subject",
      preview_text: "Preview",
      slug: "test-article",
      thumbnail_url: "https://example.com/image.jpg",
      web_url: "https://example.com/article",
      audience: "free",
      platform: "both",
      content_tags: ["tag1", "tag2"],
      hidden_from_feed: false,
      publish_date: 1699999999,
      displayed_date: 1699999999,
      free_web_content: "<p>Free web content</p>"
    };

    const result = mapBeehiivPostToArticle(post, "pub_456");

    expect(result).toEqual({
      beehiivPostId: "post_123",
      beehiivPublicationId: "pub_456",
      title: "Test Article",
      subtitle: "Test Subtitle",
      authorNames: ["Author One", "Author Two"],
      publishDate: 1699999999,
      status: "confirmed",
      tags: ["tag1", "tag2"],
      thumbnailUrl: "https://example.com/image.jpg",
      webUrl: "https://example.com/article",
      summary: undefined,
      content: "<p>Free web content</p>"
    });
  });

  it("should use created date when publish_date is null", () => {
    const post: BeehiivPost = {
      id: "post_123",
      title: "Draft Article",
      subtitle: "",
      authors: [],
      created: 1699999990,
      status: "draft",
      subject_line: "Subject",
      preview_text: "",
      slug: "draft",
      thumbnail_url: "",
      web_url: "",
      audience: "free",
      content_tags: [],
      hidden_from_feed: false,
      publish_date: null,
      displayed_date: null
    };

    const result = mapBeehiivPostToArticle(post, "pub_456");

    expect(result.publishDate).toBe(1699999990);
  });

  it("should fallback to content.free.web when free_web_content is not available", () => {
    const post: BeehiivPost = {
      id: "post_123",
      title: "Test",
      subtitle: "",
      authors: [],
      created: 1699999990,
      status: "confirmed",
      subject_line: "Subject",
      preview_text: "",
      slug: "test",
      thumbnail_url: "",
      web_url: "",
      audience: "free",
      content_tags: [],
      hidden_from_feed: false,
      publish_date: 1699999999,
      displayed_date: 1699999999,
      content: {
        free: { web: "<p>Nested content</p>", email: "Email" },
        premium: { web: "<p>Premium</p>", email: "Premium email" }
      }
    };

    const result = mapBeehiivPostToArticle(post, "pub_456");

    expect(result.content).toBe("<p>Nested content</p>");
  });

  it("should prefer free_web_content over nested content", () => {
    const post: BeehiivPost = {
      id: "post_123",
      title: "Test",
      subtitle: "",
      authors: [],
      created: 1699999990,
      status: "confirmed",
      subject_line: "Subject",
      preview_text: "",
      slug: "test",
      thumbnail_url: "",
      web_url: "",
      audience: "free",
      content_tags: [],
      hidden_from_feed: false,
      publish_date: 1699999999,
      displayed_date: 1699999999,
      free_web_content: "<p>Direct content</p>",
      content: {
        free: { web: "<p>Nested content</p>", email: "Email" },
        premium: { web: "<p>Premium</p>", email: "Premium email" }
      }
    };

    const result = mapBeehiivPostToArticle(post, "pub_456");

    expect(result.content).toBe("<p>Direct content</p>");
  });

  it("should handle missing content gracefully", () => {
    const post: BeehiivPost = {
      id: "post_123",
      title: "Test",
      subtitle: "",
      authors: [],
      created: 1699999990,
      status: "confirmed",
      subject_line: "Subject",
      preview_text: "",
      slug: "test",
      thumbnail_url: "",
      web_url: "",
      audience: "free",
      content_tags: [],
      hidden_from_feed: false,
      publish_date: 1699999999,
      displayed_date: 1699999999
    };

    const result = mapBeehiivPostToArticle(post, "pub_456");

    expect(result.content).toBeUndefined();
  });
});
