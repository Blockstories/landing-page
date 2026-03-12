import "dotenv/config";
import { db } from "../db/client.js";
import { findOrCreatePerson, addPersonToArticle } from "../db/queries.js";

/**
 * Migrate existing JSON authors to article_people junction table
 * Run this once after creating the article_people table
 */
async function migrateAuthorsToPeople(): Promise<void> {
  console.log("Starting migration of authors to people...\n");

  // Get all articles with authors JSON data
  const result = await db.execute(
    "SELECT id, title, authors FROM articles WHERE authors IS NOT NULL AND authors != '[]'"
  );

  console.log(`Found ${result.rows.length} articles with authors to migrate`);

  let successCount = 0;
  let errorCount = 0;
  let peopleCreated = 0;
  const uniquePeople = new Set<string>();

  for (const row of result.rows) {
    const articleId = row.id as number;
    const title = row.title as string;
    const authorsJson = row.authors as string | null;

    if (!authorsJson) continue;

    try {
      const authorNames: string[] = JSON.parse(authorsJson);

      if (!Array.isArray(authorNames) || authorNames.length === 0) {
        console.log(`  Skipping article ${articleId} - no authors`);
        continue;
      }

      console.log(`Processing "${title}" (${authorNames.length} authors)...`);

      for (const name of authorNames) {
        if (!name || typeof name !== "string") continue;

        // Find or create person
        const person = await findOrCreatePerson(name.trim());
        uniquePeople.add(person.name);

        if (person.id) {
          // Add to article_people junction table
          await addPersonToArticle(articleId, person.id, "author");
        }
      }

      successCount++;
    } catch (err) {
      console.error(`  Error processing article ${articleId}:`, err);
      errorCount++;
    }
  }

  console.log("\n=== Migration Complete ===");
  console.log(`Articles processed: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Unique people in database: ${uniquePeople.size}`);
  console.log("\nYou can now optionally drop the 'authors' column from articles table:");
  console.log("  ALTER TABLE articles DROP COLUMN authors;");
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith(process.argv[1]) ||
  process.argv[1]?.includes('vite-node');

if (isMainModule) {
  migrateAuthorsToPeople().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}

export { migrateAuthorsToPeople };
