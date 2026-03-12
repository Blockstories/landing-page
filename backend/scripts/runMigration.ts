import "../loadEnv.js";
import { db } from "../db/client.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Run a SQL migration file
 * Usage: npx tsx scripts/runMigration.ts <migration-file-name>
 */
async function runMigration(): Promise<void> {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error("Usage: npx tsx scripts/runMigration.ts <migration-file-name>");
    console.error("Example: npx tsx scripts/runMigration.ts 003_add_company_to_people.sql");
    process.exit(1);
  }

  const migrationPath = join(__dirname, "..", "db", "migrations", migrationFile);

  console.log(`Running migration: ${migrationFile}`);

  try {
    const sql = readFileSync(migrationPath, "utf-8");

    // Split by semicolon to handle multiple statements, but filter out empty statements
    // and comments
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const statement of statements) {
      const fullStatement = statement + ";";
      console.log(`Executing: ${fullStatement.substring(0, 100)}...`);
      await db.execute(fullStatement);
    }

    console.log(`Migration ${migrationFile} completed successfully!`);
  } catch (err) {
    console.error(`Migration ${migrationFile} failed:`, err);
    process.exit(1);
  }
}

runMigration();
