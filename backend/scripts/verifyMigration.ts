import "dotenv/config";
import { db } from "../db/client.js";

async function verifyMigration(): Promise<void> {
  console.log("Verifying people table schema...\n");

  const result = await db.execute("PRAGMA table_info(people);");

  console.log("People table columns:");
  console.table(result.rows);

  // Check if company column exists
  const hasCompany = result.rows.some((row: any) => row.name === "company");

  if (hasCompany) {
    console.log("\n✓ SUCCESS: 'company' column exists in people table");
  } else {
    console.log("\n✗ FAILURE: 'company' column NOT found in people table");
    process.exit(1);
  }
}

verifyMigration().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
