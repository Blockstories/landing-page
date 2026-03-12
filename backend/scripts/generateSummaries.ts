import "dotenv/config";
import { db } from "../db/client.js";
import { getArticleById, updateArticleSummary } from "../db/queries.js";
import { generateText } from "../integrations/openai.js";

/**
 * Generate a summary of the article using OpenAI
 * Uses the prompt from prompts/article-summary.md
 */
async function generateArticleSummary(title: string, content: string): Promise<string> {
  const articleText = `Title: ${title}\n\nContent: ${content.substring(0, 6000)}`;

  const systemMessage = `You are a professional editor specializing in blockchain and cryptocurrency news. Summarize the following article in 3-5 bullet points.

Focus on:
- Key facts and events
- Market or industry implications
- Why it matters to the crypto/blockchain space

Be concise and informative. Avoid hype or sensationalism.

Example:
• Luxembourg's CSSF allows UCITS to allocate up to 10% of NAV to crypto via eligible ETPs — a first for a major European fund domicile
• Why tokenized money market funds are blurring the line with stablecoins — and what that means for institutional demand
• Interviews with CoinShares, VanEck, Allfunds Blockchain and Woud Law on the CSSF decision`;

  return generateText({
    model: "gpt-4o-mini",
    prompt: articleText,
    systemMessage,
    maxTokens: 200,
    temperature: 0.3
  });
}

/**
 * Generate summaries for the last N articles missing summaries
 */
async function generateSummariesForRecentArticles(count: number = 20): Promise<void> {
  console.log(`Fetching last ${count} articles...\n`);

  // Get the last N articles that have content but no summary
  const result = await db.execute(
    `SELECT id, title, content FROM articles
     WHERE content IS NOT NULL AND content != ''
     AND (summary IS NULL OR summary = '')
     ORDER BY publish_date DESC
     LIMIT ?`,
    [count]
  );

  const articles = result.rows;

  if (articles.length === 0) {
    console.log("No articles found needing summaries.");
    return;
  }

  console.log(`Found ${articles.length} articles needing summaries\n`);

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const row of articles) {
    const articleId = row.id as number;
    const title = row.title as string;
    const content = row.content as string;

    // Skip if content is too short (less than 100 chars)
    if (!content || content.length < 100) {
      console.log(`⏭️  Skipping "${title}" - content too short (${content?.length || 0} chars)`);
      skippedCount++;
      continue;
    }

    console.log(`📝 Processing "${title}"...`);

    try {
      const summary = await generateArticleSummary(title, content);

      // Update the article with the generated summary
      await updateArticleSummary(articleId, summary);

      console.log(`✅ Generated summary (${summary.length} chars)`);
      successCount++;

      // Rate limiting - be nice to the API
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`❌ Error generating summary for "${title}":`, err);
      errorCount++;
    }
  }

  console.log("\n=== Summary Generation Complete ===");
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

  generateSummariesForRecentArticles(count).catch(err => {
    console.error("Summary generation failed:", err);
    process.exit(1);
  });
}

export { generateSummariesForRecentArticles };
