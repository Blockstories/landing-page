// Use web import for better serverless/edge performance
import { createClient, Client, ResultSet } from "@libsql/client/web";
import "../config/env.js"; // Ensures env vars are loaded from root

let dbInstance: Client | null = null;

function getDbClient(): Client {
  if (!dbInstance) {
    const url = process.env.TURSO_DB_URL;
    const authToken = process.env.TURSO_DB_AUTH_TOKEN;

    if (!url) {
      throw new Error("TURSO_DB_URL environment variable is not set");
    }

    console.log(`[DB] Connecting to Turso: ${url.slice(0, 30)}...`);
    const start = performance.now();

    dbInstance = createClient({
      url,
      authToken,
    });

    console.log(`[DB] Client created in ${(performance.now() - start).toFixed(2)}ms`);
  }
  return dbInstance;
}

// Export a compatible interface that lazily initializes on first use
export const db = {
  execute: async (sql: string, args?: unknown[]): Promise<ResultSet> => {
    const client = getDbClient();
    const start = performance.now();
    const shortSql = sql.replace(/\s+/g, ' ').slice(0, 60);
    console.log(`[DB] Executing: ${shortSql}...`);
    try {
      const result = await client.execute(sql, args);
      console.log(`[DB] Query completed in ${(performance.now() - start).toFixed(2)}ms, rows: ${result.rows.length}`);
      return result;
    } catch (error) {
      console.error(`[DB] Query failed after ${(performance.now() - start).toFixed(2)}ms:`, error);
      throw error;
    }
  },
  batch: (sqls: string[]): Promise<ResultSet[]> => {
    console.log(`[DB] Batch executing ${sqls.length} queries`);
    return getDbClient().batch(sqls);
  },
  transaction: () => {
    return getDbClient().transaction();
  },
  migrate: () => {
    return getDbClient().migrate();
  },
  close: () => {
    return getDbClient().close();
  },
};
