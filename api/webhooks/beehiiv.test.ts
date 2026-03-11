import { describe, it, expect, vi, beforeEach } from "vitest";
import handler from "./beehiiv.js";
import * as queries from "../../db/queries.js";
import * as service from "../../services/processBeehiivPost.js";

// Mock dependencies
vi.mock("../../db/queries.js");
vi.mock("../../services/processBeehiivPost.js");

const CRYPTO_PUB_ID = "pub_crypto_test";
const INSTITUTIONAL_PUB_ID = "pub_institutional_test";

// Set env vars
process.env.BEEHIIV_CRYPTO_PUB_ID = CRYPTO_PUB_ID;
process.env.BEEHIIV_INSTITUTIONAL_PUB_ID = INSTITUTIONAL_PUB_ID;

interface MockRes {
  statusCode: number;
  jsonData: unknown;
  status: (code: number) => { json: (data: unknown) => void };
}

function createMockRes(): MockRes {
  const res: MockRes = {
    statusCode: 0,
    jsonData: null,
    status(code: number) {
      this.statusCode = code;
      return {
        json: (data: unknown) => {
          this.jsonData = data;
        }
      };
    }
  };
  return res;
}

describe("Beehiiv Webhook Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.BEEHIIV_WEBHOOK_SECRET;
  });

  it("should reject non-POST methods", async () => {
    const res = createMockRes();
    await handler({
      method: "GET",
      headers: {},
      body: {}
    }, res);

    expect(res.statusCode).toBe(405);
    expect(res.jsonData).toEqual({ status: "error", message: "Method not allowed" });
  });

  it("should reject missing required fields", async () => {
    const res = createMockRes();
    await handler({
      method: "POST",
      headers: {},
      body: { type: "post.sent" }
    }, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData).toEqual({ status: "error", message: "Missing required fields" });
  });

  it("should reject invalid webhook secret", async () => {
    process.env.BEEHIIV_WEBHOOK_SECRET = "correct_secret";

    const res = createMockRes();
    await handler({
      method: "POST",
      headers: { "x-beehiiv-webhook-secret": "wrong_secret" },
      body: {
        type: "post.sent",
        publication_id: CRYPTO_PUB_ID,
        post_id: "post_123"
      }
    }, res);

    expect(res.statusCode).toBe(401);
    expect(res.jsonData).toEqual({ status: "error", message: "Unauthorized" });
  });

  it("should ignore unknown event types", async () => {
    const res = createMockRes();
    await handler({
      method: "POST",
      headers: {},
      body: {
        type: "post.deleted",
        publication_id: CRYPTO_PUB_ID,
        post_id: "post_123"
      }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toEqual({ status: "ignored", message: "Event type post.deleted not handled" });
  });

  it("should ignore unknown publications", async () => {
    const res = createMockRes();
    await handler({
      method: "POST",
      headers: {},
      body: {
        type: "post.sent",
        publication_id: "pub_unknown",
        post_id: "post_123"
      }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toEqual({ status: "ignored", message: "Unknown publication" });
  });

  it("should return already_processed for duplicate posts", async () => {
    vi.mocked(queries.getArticleByPublicationIdAndPostId).mockResolvedValue({
      id: 1,
      beehiivPostId: "post_123",
      beehiivPublicationId: CRYPTO_PUB_ID,
      title: "Test",
      authors: [],
      publishDate: 1234567890,
      status: "confirmed",
      tags: []
    } as queries.Article);

    const res = createMockRes();
    await handler({
      method: "POST",
      headers: {},
      body: {
        type: "post.sent",
        publication_id: CRYPTO_PUB_ID,
        post_id: "post_123"
      }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toEqual({ status: "already_processed", articleId: 1 });
    expect(queries.getArticleByPublicationIdAndPostId).toHaveBeenCalledWith(CRYPTO_PUB_ID, "post_123");
  });

  it("should process new post successfully", async () => {
    vi.mocked(queries.getArticleByPublicationIdAndPostId).mockResolvedValue(null);
    vi.mocked(service.processBeehiivPost).mockResolvedValue({
      id: 42,
      beehiivPostId: "post_123",
      beehiivPublicationId: CRYPTO_PUB_ID,
      title: "Test Article",
      authors: ["Author"],
      publishDate: 1234567890,
      status: "confirmed",
      tags: ["crypto"]
    } as queries.Article);

    const res = createMockRes();
    await handler({
      method: "POST",
      headers: {},
      body: {
        type: "post.sent",
        publication_id: CRYPTO_PUB_ID,
        post_id: "post_123"
      }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toEqual({ status: "success", articleId: 42 });
    expect(service.processBeehiivPost).toHaveBeenCalledWith(CRYPTO_PUB_ID, "post_123");
  });

  it("should return 500 on service error", async () => {
    vi.mocked(queries.getArticleByPublicationIdAndPostId).mockResolvedValue(null);
    vi.mocked(service.processBeehiivPost).mockRejectedValue(new Error("API Error"));

    const res = createMockRes();
    await handler({
      method: "POST",
      headers: {},
      body: {
        type: "post.sent",
        publication_id: CRYPTO_PUB_ID,
        post_id: "post_123"
      }
    }, res);

    expect(res.statusCode).toBe(500);
    expect(res.jsonData).toEqual({ status: "error", message: "Internal server error" });
  });
});
