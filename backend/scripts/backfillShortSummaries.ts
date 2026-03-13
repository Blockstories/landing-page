import "../loadEnv.js";
import { db } from "../db/client.js";
import { getArticleById, updateArticleShortSummary } from "../db/queries.js";
import { generateShortSummary } from "../services/openaiService.js";

/**
 * Generate short summaries for the latest N articles that already have a summary
 */
async function backfillShortSummaries(count: number = 20): Promise<void> {
  console.log(`Fetching last ${count} articles with summaries...\n`);

  // Get the last N articles that have a summary but no short_summary
  const result = await db.execute(
    `SELECT id, title, summary FROM articles
     WHERE summary IS NOT NULL AND summary != ''
     AND (short_summary IS NULL OR short_summary = '')
     ORDER BY publish_date DESC
     LIMIT ?`,
    [count]
  );

  const articles = result.rows;

  if (articles.length === 0) {
    console.log("No articles found needing short summaries.");
    return;
  }

  console.log(`Found ${articles.length} articles needing short summaries\n`);

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const row of articles) {
    const articleId = row.id as number;
    const title = row.title as string;
    const summary = row.summary as string;

    // Skip if summary is too short (less than 50 chars)
    if (!summary || summary.length < 50) {
      console.log(`⏭️  Skipping "${title}" - summary too short (${summary?.length || 0} chars)`);
      skippedCount++;
      continue;
    }

    console.log(`📝 Processing "${title}"...`);
    console.log(`   Original summary (${summary.length} chars): ${summary.substring(0, 100)}...`);

    try {
      const shortSummary = await generateShortSummary(summary);

      // Update the article with the generated short summary
      await updateArticleShortSummary(articleId, shortSummary);

      console.log(`✅ Generated short summary (${shortSummary.length} chars): ${shortSummary}`);
      successCount++;

      // Rate limiting - be nice to the API
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`❌ Error generating short summary for "${title}":`, err);
      errorCount++;
    }
  }

  console.log("\n=== Short Summary Backfill Complete ===");
  console.log(`Articles processed: ${articles.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`⏭️  Skipped (too short): ${skippedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith(process.argv[1]) ||
  process.argv[1]?.includes('vite-node');

if (isMainModule) {
  // Allow custom count via command line argument, default to 20
  const count = parseInt(process.argv[2], 10) || 20;

  backfillShortSummaries(count).catch(err => {
    console.error("Short summary backfill failed:", err);
    process.exit(1);
  });
}

export { backfillShortSummaries };
