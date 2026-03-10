import "dotenv/config";
import {
  getPostsByPublicationId,
  getPostByPublicationIdAndPostId,
  BeehiivPost
} from "../integrations/beehiiv.js";

const CRYPTO_PUB_ID = process.env.BEEHIIV_CRYPTO_PUB_ID;

export async function fetchAndPrintCryptoPosts(): Promise<void> {
  if (!CRYPTO_PUB_ID) {
    throw new Error("BEEHIIV_CRYPTO_PUB_ID not set in environment");
  }

  console.log("Fetching first page of crypto posts...");

  const postsResponse = await getPostsByPublicationId(CRYPTO_PUB_ID, {
    page: 1,
    limit: 10
  });

  console.log(`Found ${postsResponse.data.length} posts on page 1`);
  console.log(`Total posts: ${postsResponse.total_results}`);

  const detailedPosts: BeehiivPost[] = [];

  for (const post of postsResponse.data) {
    console.log(`\nFetching full content for post: ${post.id}`);

    const detailedPost = await getPostByPublicationIdAndPostId(
      CRYPTO_PUB_ID,
      post.id
    );

    detailedPosts.push(detailedPost);

    console.log("Post details:");
    console.log(`  Title: ${detailedPost.title}`);
    console.log(`  Status: ${detailedPost.status}`);
    console.log(`  Created: ${new Date(detailedPost.created * 1000).toISOString()}`);
    console.log(`  URL: ${detailedPost.web_url || "N/A"}`);

    if (detailedPost.content?.html) {
      const preview = detailedPost.content.html.substring(0, 200).replace(/\n/g, " ");
      console.log(`  Content preview: ${preview}...`);
    }
  }

  console.log(`\nFetched ${detailedPosts.length} posts with full content`);
}

fetchAndPrintCryptoPosts().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
