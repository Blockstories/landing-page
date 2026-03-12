import "dotenv/config";

const WEBHOOK_URL = process.env.WEBHOOK_BASE_URL || "http://localhost:3000";
const WEBHOOK_ENDPOINT = `${WEBHOOK_URL}/webhooks/beehiiv`;

const CRYPTO_PUB_ID = process.env.BEEHIIV_CRYPTO_PUB_ID || "";

// Real post ID from crypto publication for testing
const REAL_POST_ID = "post_64f502a2-a718-4215-b12d-d40eb7452988";

interface BeehiivWebhookPayload {
  event: string;
  data: {
    post: {
      id: string;
      publication_id: string;
    };
  };
}

async function sendWebhook(payload: BeehiivWebhookPayload): Promise<Response> {
  return fetch(WEBHOOK_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function testWebhookHandler() {
  console.log("Testing Beehiiv Webhook HTTP Endpoint...\n");
  console.log(`Target: ${WEBHOOK_ENDPOINT}\n`);

  if (!process.env.BEEHIIV_BEARER_TOKEN) {
    console.error("Error: BEEHIIV_BEARER_TOKEN not set in environment");
    process.exit(1);
  }

  // Test 1: Simulate post.created webhook
  console.log("Test 1: POST post.created webhook");
  console.log("----------------------------------");

  const createdPayload: BeehiivWebhookPayload = {
    event: "post.created",
    data: {
      post: {
        id: REAL_POST_ID,
        publication_id: CRYPTO_PUB_ID
      }
    }
  };

  try {
    const response1 = await sendWebhook(createdPayload);
    console.log(`Status: ${response1.status}`);
    const body1 = await response1.json();
    console.log(`Response:`, body1);
  } catch (error) {
    console.log("❌ Server not running. Start it with: npm run webhook-server");
    return;
  }

  // Test 2: Simulate post.updated webhook
  console.log("\n\nTest 2: POST post.updated webhook");
  console.log("----------------------------------");

  const updatedPayload: BeehiivWebhookPayload = {
    event: "post.updated",
    data: {
      post: {
        id: REAL_POST_ID,
        publication_id: CRYPTO_PUB_ID
      }
    }
  };

  try {
    const response2 = await sendWebhook(updatedPayload);
    console.log(`Status: ${response2.status}`);
    const body2 = await response2.json();
    console.log(`Response:`, body2);
  } catch (error) {
    console.log("❌ Request failed");
    return;
  }

  // Test 3: Unknown publication (should be ignored)
  console.log("\n\nTest 3: Unknown publication (should be ignored)");
  console.log("------------------------------------------------");

  const unknownPubPayload: BeehiivWebhookPayload = {
    event: "post.created",
    data: {
      post: {
        id: "post_xyz",
        publication_id: "pub_unknown"
      }
    }
  };

  try {
    const response3 = await sendWebhook(unknownPubPayload);
    console.log(`Status: ${response3.status}`);
    const body3 = await response3.json();
    console.log(`Response:`, body3);
  } catch (error) {
    console.log("❌ Request failed");
    return;
  }

  // Test 4: Unknown event type
  console.log("\n\nTest 4: Unknown event type");
  console.log("---------------------------");

  const unknownEventPayload: BeehiivWebhookPayload = {
    event: "post.deleted",
    data: {
      post: {
        id: "post_xyz",
        publication_id: CRYPTO_PUB_ID
      }
    }
  };

  try {
    const response4 = await sendWebhook(unknownEventPayload);
    console.log(`Status: ${response4.status}`);
    const body4 = await response4.json();
    console.log(`Response:`, body4);
  } catch (error) {
    console.log("❌ Request failed");
    return;
  }

  console.log("\n✅ All webhook HTTP tests completed!");
}

testWebhookHandler();
