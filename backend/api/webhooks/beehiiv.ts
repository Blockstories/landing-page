import "../../loadEnv.js";
import { getArticleByPublicationIdAndPostId } from "../../db/queries.js";
import { processBeehiivPost } from "../../services/processBeehiivPost.js";

interface BeehiivWebhookPayload {
  type: string;
  publication_id: string;
  post_id: string;
}

interface WebhookResponse {
  status: string;
  articleId?: number;
  message?: string;
}

const VALID_EVENTS = ["post.sent", "post.updated"];

function getCryptoPubId(): string {
  return process.env.BEEHIIV_CRYPTO_PUB_ID || "";
}

function getInstitutionalPubId(): string {
  return process.env.BEEHIIV_INSTITUTIONAL_PUB_ID || "";
}

function isValidPublicationId(pubId: string): boolean {
  return pubId === getCryptoPubId() || pubId === getInstitutionalPubId();
}

function log(message: string, data?: Record<string, unknown>): void {
  console.log(`[WEBHOOK] ${message}`, data ? JSON.stringify(data) : "");
}

/**
 * Serverless handler for Beehiiv webhooks
 * POST /api/webhooks/beehiiv
 */
export default async function handler(
  req: {
    method: string;
    headers: Record<string, string | string[] | undefined>;
    body: unknown;
  },
  res: {
    status: (code: number) => {
      json: (data: WebhookResponse) => void;
    };
  }
): Promise<void> {
  log("Received Beehiiv event", { method: req.method });

  // 1. Validate HTTP method
  if (req.method !== "POST") {
    log("Rejected: Method not allowed", { method: req.method });
    res.status(405).json({ status: "error", message: "Method not allowed" });
    return;
  }

  // 2. Validate webhook secret (optional)
  const webhookSecret = process.env.BEEHIIV_WEBHOOK_SECRET;
  if (webhookSecret) {
    const providedSecret = req.headers["x-beehiiv-webhook-secret"];
    if (providedSecret !== webhookSecret) {
      log("Rejected: Invalid webhook secret");
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }
  }

  // 3. Parse and validate payload
  const payload = req.body as Partial<BeehiivWebhookPayload>;

  if (!payload.type || !payload.publication_id || !payload.post_id) {
    log("Rejected: Missing required fields", {
      hasType: !!payload.type,
      hasPublicationId: !!payload.publication_id,
      hasPostId: !!payload.post_id
    });
    res.status(400).json({ status: "error", message: "Missing required fields" });
    return;
  }

  const { type, publication_id: publicationId, post_id: postId } = payload;

  log("Processing post", { type, publicationId, postId });

  // 4. Filter events
  if (!VALID_EVENTS.includes(type)) {
    log("Ignored: Event type not handled", { type });
    res.status(200).json({ status: "ignored", message: `Event type ${type} not handled` });
    return;
  }

  // 5. Validate publication ID
  if (!isValidPublicationId(publicationId)) {
    log("Ignored: Unknown publication", { publicationId });
    res.status(200).json({ status: "ignored", message: "Unknown publication" });
    return;
  }

  try {
    // 6. Idempotency check
    const existingArticle = await getArticleByPublicationIdAndPostId(publicationId, postId);
    if (existingArticle) {
      log("Already processed", { articleId: existingArticle.id });
      res.status(200).json({ status: "already_processed", articleId: existingArticle.id });
      return;
    }

    // 7. Process the post
    log("Calling processBeehiivPost");
    const article = await processBeehiivPost(publicationId, postId);

    log("Article stored", { articleId: article?.id });
    res.status(200).json({ status: "success", articleId: article?.id });

  } catch (error) {
    log("Error processing webhook", {
      error: error instanceof Error ? error.message : "Unknown error"
    });
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
}
