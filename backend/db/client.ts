import { createClient, Client, ResultSet } from "@libsql/client";

let dbInstance: Client | null = null;

function getDbClient(): Client {
  if (!dbInstance) {
    const url = process.env.TURSO_DB_URL;
    const authToken = process.env.TURSO_DB_AUTH_TOKEN;

    if (!url) {
      throw new Error("TURSO_DB_URL environment variable is not set");
    }

    dbInstance = createClient({
      url,
      authToken,
    });
  }
  return dbInstance;
}

// Export a compatible interface that lazily initializes on first use
export const db = {
  execute: (sql: string, args?: unknown[]): Promise<ResultSet> => {
    return getDbClient().execute(sql, args);
  },
  batch: (sqls: string[]): Promise<ResultSet[]> => {
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
