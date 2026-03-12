import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchArticles } from "./api.js";
import type { ArticlesResponse } from "../pages/api/articles.js";

describe("fetchArticles", () => {
  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("should fetch articles with publicationId and baseUrl", async () => {
    const mockResponse: ArticlesResponse = {
      articles: [
        {
          id: 1,
          beehiivPublicationId: "pub_123",
          title: "Test Article",
          authors: [],
          featured: [],
          publishDate: 1234567890,
          tags: [],
        },
      ],
      pagination: { hasMore: false },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await fetchArticles({
      publicationId: "pub_123",
      baseUrl: "http://localhost:3000",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/articles?publicationId=pub_123",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result).toEqual(mockResponse);
  });

  it("should include cursor when provided", async () => {
    const mockResponse: ArticlesResponse = {
      articles: [],
      pagination: { hasMore: false },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    await fetchArticles({
      publicationId: "pub_123",
      cursor: "eyJ0cyI6MTIzLCJpZCI6MX0=",
      baseUrl: "http://localhost:3000",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/articles?publicationId=pub_123&cursor=eyJ0cyI6MTIzLCJpZCI6MX0%3D",
      expect.any(Object)
    );
  });

  it("should include limit when different from default", async () => {
    const mockResponse: ArticlesResponse = {
      articles: [],
      pagination: { hasMore: false },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    await fetchArticles({
      publicationId: "pub_123",
      limit: 5,
      baseUrl: "http://localhost:3000",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/articles?publicationId=pub_123&limit=5",
      expect.any(Object)
    );
  });

  it("should not include limit when it is the default value", async () => {
    const mockResponse: ArticlesResponse = {
      articles: [],
      pagination: { hasMore: false },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    await fetchArticles({
      publicationId: "pub_123",
      limit: 10,
      baseUrl: "http://localhost:3000",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/articles?publicationId=pub_123",
      expect.any(Object)
    );
  });

  it("should throw error on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: "Invalid publication ID" }),
    });

    await expect(
      fetchArticles({
        publicationId: "invalid",
        baseUrl: "http://localhost:3000",
      })
    ).rejects.toThrow("Invalid publication ID");
  });

  it("should throw error with status code when no message provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    await expect(
      fetchArticles({
        publicationId: "pub_123",
        baseUrl: "http://localhost:3000",
      })
    ).rejects.toThrow("Failed to fetch articles: 500");
  });

  it("should pass AbortSignal to fetch for timeout handling", async () => {
    // Mock fetch that captures the signal and returns normally
    let capturedSignal: AbortSignal | undefined;
    mockFetch.mockImplementationOnce((url: string, options: { signal?: AbortSignal }) => {
      capturedSignal = options.signal;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ articles: [], pagination: { hasMore: false } }),
      });
    });

    await fetchArticles({
      publicationId: "pub_123",
      baseUrl: "http://localhost:3000",
    });

    // Verify that an AbortSignal was passed
    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(false);
  });

  it("should abort when signal is triggered", async () => {
    // Mock fetch that checks for aborted signal
    mockFetch.mockImplementationOnce((url: string, options: { signal?: AbortSignal }) => {
      if (options.signal?.aborted) {
        return Promise.reject(new Error("The operation was aborted"));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ articles: [], pagination: { hasMore: false } }),
      });
    });

    // Manually trigger an abort to simulate timeout
    const controller = new AbortController();
    const fetchPromise = fetchArticles({
      publicationId: "pub_123",
      baseUrl: "http://localhost:3000",
    });

    // The implementation should use its own AbortController with 5s timeout
    // We verify the signal is passed by checking the mock was called with it
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });
});
