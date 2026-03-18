/**
 * Backfill article summaries using OpenAI
 * Fetches articles without summaries and generates them from content
 */
import "../loadEnv.js";
import { db } from "../db/client.js";
import { updateArticleSummary, updateArticleShortSummary } from "../db/queries.js";
import { summarizeArticle, generateShortSummary } from "../services/openaiService.js";

async function getArticlesWithoutSummaries(limit: number = 20): Promise<Array<{ id: number; title: string; content?: string }>> {
  const result = await db.execute(
    `SELECT id, title, content FROM articles WHERE summary IS NULL OR summary = '' ORDER BY publish_date DESC LIMIT ?`,
    [limit]
  );
  return result.rows.map(row => ({
    id: row.id as number,
    title: row.title as string,
    content: row.content as string | undefined
  }));
}

async function backfillSummaries() {
  console.log("Fetching latest 20 articles without summaries...\n");

  const articles = await getArticlesWithoutSummaries(20);

  if (articles.length === 0) {
    console.log("No articles need summaries. All caught up!");
    return;
  }

  console.log(`Found ${articles.length} articles without summaries\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    console.log(`[${i + 1}/${articles.length}] Processing: ${article.title}`);

    if (!article.content || article.content.trim().length < 100) {
      console.log(`  ⚠️  Skipping: content too short or missing`);
      errorCount++;
      continue;
    }

    try {
      // Generate full summary
      console.log(`  📝 Generating summary...`);
      const summary = await summarizeArticle(article.content);

      if (!summary || summary.trim().length === 0) {
        console.log(`  ⚠️  Empty summary received, skipping`);
        errorCount++;
        continue;
      }

      // Update full summary in database
      await updateArticleSummary(article.id, summary);
      console.log(`  ✅ Summary saved (${summary.length} chars)`);

      // Generate short summary from the full summary
      console.log(`  📝 Generating short summary...`);
      const shortSummary = await generateShortSummary(summary);

      if (shortSummary && shortSummary.trim().length > 0) {
        await updateArticleShortSummary(article.id, shortSummary);
        console.log(`  ✅ Short summary saved (${shortSummary.length} chars)`);
      }

      successCount++;

      // Small delay to avoid rate limiting
      if (i < articles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

    } catch (error) {
      console.error(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      errorCount++;
    }

    console.log("");
  }

  console.log("=".repeat(50));
  console.log("Backfill complete!");
  console.log(`  Success: ${successCount}`);
  console.log(`  Errors:  ${errorCount}`);
  console.log("=".repeat(50));

  process.exit(errorCount > 0 ? 1 : 0);
}

backfillSummaries().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
