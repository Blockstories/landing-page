import "../loadEnv.js";
import { db } from "../db/client.js";
import { updateArticleSummary } from "../db/queries.js";

/**
 * Clean up formatting in summaries by removing bullet points (•) and dashes (-)
 * at the start of lines, and convert multi-line bullet lists to flowing text.
 */
async function cleanSummaryFormatting(count: number = 100): Promise<void> {
  console.log(`Fetching up to ${count} articles with summaries to clean...\n`);

  // Get articles with summaries that might have bullet points or dashes
  const result = await db.execute(
    `SELECT id, title, summary FROM articles
     WHERE summary IS NOT NULL AND summary != ''
     AND (summary LIKE '%•%' OR summary LIKE '%- %' OR summary LIKE '%\n%')
     ORDER BY publish_date DESC
     LIMIT ?`,
    [count]
  );

  const articles = result.rows;

  if (articles.length === 0) {
    console.log("No articles found with formatting to clean.");
    return;
  }

  console.log(`Found ${articles.length} articles with potential formatting issues\n`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const row of articles) {
    const articleId = row.id as number;
    const title = row.title as string;
    let summary = row.summary as string;

    // Skip if no formatting characters found
    if (!summary.match(/^[\s]*[•\-\*]/m)) {
      skippedCount++;
      continue;
    }

    console.log(`📝 Processing "${title}"...`);
    console.log(`   Before: ${summary.substring(0, 80).replace(/\n/g, ' ')}...`);

    try {
      // Remove bullet points (•), dashes (-), and asterisks (*) at start of lines
      // Split by newlines, clean each line, then join with spaces
      const cleanedLines = summary
        .split('\n')
        .map(line => line.replace(/^[\s]*[•\-\*][\s]*/, '').trim())
        .filter(line => line.length > 0);

      // Join lines with space to create flowing text
      let cleanedSummary = cleanedLines.join(' ');

      // Clean up any double spaces
      cleanedSummary = cleanedSummary.replace(/\s+/g, ' ').trim();

      // Update if changed
      if (cleanedSummary !== summary) {
        await updateArticleSummary(articleId, cleanedSummary);
        console.log(`✅ Cleaned (${cleanedSummary.length} chars): ${cleanedSummary.substring(0, 80)}...`);
        successCount++;
      } else {
        console.log(`⏭️  No changes needed`);
        skippedCount++;
      }
    } catch (err) {
      console.error(`❌ Error cleaning "${title}":`, err);
      errorCount++;
    }
  }

  console.log("\n=== Summary Cleaning Complete ===");
  console.log(`Articles processed: ${articles.length}`);
  console.log(`✅ Cleaned: ${successCount}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith(process.argv[1]) ||
  process.argv[1]?.includes('vite-node');

if (isMainModule) {
  const count = parseInt(process.argv[2], 10) || 100;

  cleanSummaryFormatting(count).catch(err => {
    console.error("Summary cleaning failed:", err);
    process.exit(1);
  });
}

export { cleanSummaryFormatting };
