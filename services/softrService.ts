import "dotenv/config";
import { getRecords } from "../integrations/softr.js";

const SOFTR_DATABASE_ID = process.env.SOFTR_DATABASE_ID || "";
const SOFTR_TABLE_ID = process.env.SOFTR_TABLE_ID || "";
const SOFTR_VIEW_ID = process.env.SOFTR_VIEW_ID || "";

async function testSoftrIntegration() {
  console.log("Testing Softr Integration...\n");

  if (!process.env.SOFTR_API_KEY) {
    console.error("Error: SOFTR_API_KEY not set in environment");
    process.exit(1);
  }

  if (!SOFTR_DATABASE_ID || !SOFTR_TABLE_ID) {
    console.error("Error: SOFTR_DATABASE_ID and SOFTR_TABLE_ID must be set in environment");
    process.exit(1);
  }

  try {
    // Test 1: Get records using pre-sorted view
    console.log("Test 1: Get records using view (pre-sorted by J8DwC DESC)");
    console.log("----------------------------------------------------------");

    const sortedResult = await getRecords(
      SOFTR_DATABASE_ID,
      SOFTR_TABLE_ID,
      {
        viewId: SOFTR_VIEW_ID,
        paging: { limit: 10 }
      }
    );

    console.log(`Found ${sortedResult.data.length} records (total: ${sortedResult.metadata.total})`);
    console.log("Metadata:", sortedResult.metadata);
    console.log("\nJ8DwC values (sorted by view):");
    sortedResult.data.forEach((record, index) => {
      const j8dwc = record.fields['J8DwC'] || 'N/A';
      const title = record.fields['O9pID'] || 'No title';
      console.log(`  ${index + 1}. ${j8dwc} - ${title}`);
    });

    // Test 2: Get records with field names
    console.log("\n\nTest 2: Get records with field names");
    console.log("-------------------------------------");

    const fullResult = await getRecords(
      SOFTR_DATABASE_ID,
      SOFTR_TABLE_ID,
      {
        fieldNames: true,
        paging: { offset: 0, limit: 3 }
      }
    );

    console.log(`Found ${fullResult.data.length} records`);
    fullResult.data.forEach((record, index) => {
      console.log(`\nRecord ${index + 1}:`);
      console.log(`  ID: ${record.id}`);
      console.log(`  Fields (with field names):`, record.fields);
    });

    console.log("\n✅ All tests completed successfully!");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

testSoftrIntegration();
