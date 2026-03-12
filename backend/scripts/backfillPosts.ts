import "dotenv/config";
import { getPostsByPublicationId, BeehiivPost } from "../integrations/beehiiv.js";
import { createArticle, getArticleByPublicationIdAndPostId, updateArticleStatus, updateArticleContent, findOrCreatePerson } from "../db/queries.js";
import { mapBeehiivPostToArticle } from "../mappers/article.js";

const CRYPTO_PUB_ID = process.env.BEEHIIV_CRYPTO_PUB_ID;
const INSTITUTIONAL_PUB_ID = process.env.BEEHIIV_INSTITUTIONAL_PUB_ID;

interface BackfillResult {
  publicationId: string;
  publicationName: string;
  totalFetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

/**
 * Process a single Beehiiv post and store in database
 */
async function processPost(
  post: BeehiivPost,
  publicationId: string,
  stats: { created: number; skipped: number; updated: number; errors: number }
): Promise<void> {
  try {
    // Check if article already exists
    const existing = await getArticleByPublicationIdAndPostId(publicationId, post.id);
    if (existing) {
      let wasUpdated = false;

      // Update status if missing
      if (!existing.status) {
        await updateArticleStatus(publicationId, post.id, post.status);
        console.log(`  Updated status for post ${post.id}: ${post.status}`);
        wasUpdated = true;
      }

      // Update content if missing but available from API
      const postContent = post.free_web_content || post.content?.free?.web;
      if (!existing.content && postContent) {
        await updateArticleContent(publicationId, post.id, postContent);
        console.log(`  Updated content for post ${post.id}`);
        wasUpdated = true;
      }

      if (wasUpdated) {
        stats.updated++;
      } else {
        console.log(`  Skipping post ${post.id} - already exists`);
        stats.skipped++;
      }
      return;
    }

    // Store new article using mapper
    const articleInput = mapBeehiivPostToArticle(post, publicationId);

    // Resolve author names to Person objects
    const authorPeople = await Promise.all(
      articleInput.authorNames.map(name => findOrCreatePerson(name))
    );

    await createArticle(
      {
        ...articleInput,
        authors: [], // Will be populated via relations
        featured: [],
      },
      authorPeople.map(p => ({ personId: p.id, role: "author" }))
    );

    console.log(`  Created article: ${post.title} (${post.id})`);
    stats.created++;
  } catch (err) {
    console.error(`  Error processing post ${post.id}:`, err);
    stats.errors++;
  }
}

/**
 * Fetch and process all posts for a publication
 */
async function backfillPublication(
  publicationId: string,
  publicationName: string
): Promise<BackfillResult> {
  console.log(`\n=== Backfilling ${publicationName} (${publicationId}) ===\n`);

  const result: BackfillResult = {
    publicationId,
    publicationName,
    totalFetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  };

  let page = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    console.log(`Fetching page ${page}...`);

    try {
      const response = await getPostsByPublicationId(publicationId, {
        limit: 100,
        page,
        status: "confirmed", // Only fetch confirmed/published posts
        expand: ["free_web_content"]
      });

      const posts = response.data;
      result.totalFetched += posts.length;

      console.log(`  Found ${posts.length} posts on page ${page}`);

      // Process each post
      for (const post of posts) {
        await processPost(post, publicationId, result);
      }

      // Check if there are more pages
      hasMorePages = page < response.total_pages;
      page++;

      // Rate limiting - be nice to the API
      if (hasMorePages) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (err) {
      console.error(`  Error fetching page ${page}:`, err);
      result.errors++;
      hasMorePages = false;
    }
  }

  return result;
}

/**
 * Main backfill function
 */
async function backfillAllPosts(): Promise<void> {
  console.log("Starting backfill of all Beehiiv posts...\n");

  if (!CRYPTO_PUB_ID) {
    throw new Error("BEEHIIV_CRYPTO_PUB_ID environment variable is not set");
  }
  if (!INSTITUTIONAL_PUB_ID) {
    throw new Error("BEEHIIV_INSTITUTIONAL_PUB_ID environment variable is not set");
  }

  const results: BackfillResult[] = [];

  // Backfill crypto publication
  const cryptoResult = await backfillPublication(CRYPTO_PUB_ID, "Crypto");
  results.push(cryptoResult);

  // Backfill institutional publication
  const institutionalResult = await backfillPublication(INSTITUTIONAL_PUB_ID, "Institutional");
  results.push(institutionalResult);

  // Print summary
  console.log("\n=== Backfill Complete ===\n");
  for (const r of results) {
    console.log(`${r.publicationName}:`);
    console.log(`  Total fetched: ${r.totalFetched}`);
    console.log(`  Created: ${r.created}`);
    console.log(`  Updated: ${r.updated}`);
    console.log(`  Skipped (already exist): ${r.skipped}`);
    console.log(`  Errors: ${r.errors}`);
    console.log();
  }

  const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
  const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);

  console.log(`Total: ${totalCreated} created, ${totalUpdated} updated, ${totalSkipped} skipped, ${totalErrors} errors`);
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith(process.argv[1]) ||
  process.argv[1]?.includes('vite-node');

if (isMainModule) {
  backfillAllPosts().catch(err => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
}

export { backfillAllPosts, backfillPublication };
