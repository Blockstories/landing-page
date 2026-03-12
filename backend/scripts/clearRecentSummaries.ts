import "dotenv/config";
import { db } from "../db/client.js";

async function clearRecentSummaries(count: number = 20): Promise<void> {
  console.log(`Clearing summaries for last ${count} articles...\n`);

  await db.execute(
    `UPDATE articles SET summary = NULL
     WHERE id IN (
       SELECT id FROM articles
       WHERE summary IS NOT NULL
       ORDER BY publish_date DESC
       LIMIT ?
     )`,
    [count]
  );

  console.log(`Cleared summaries for last ${count} articles`);
}

const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith(process.argv[1]) ||
  process.argv[1]?.includes('vite-node');

if (isMainModule) {
  const count = parseInt(process.argv[2], 10) || 20;
  clearRecentSummaries(count).catch(err => {
    console.error("Failed:", err);
    process.exit(1);
  });
}

export { clearRecentSummaries };
