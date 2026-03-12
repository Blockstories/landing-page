import { createClient, Client } from "@libsql/client";

function createDbClient(): Client {
  const url = process.env.TURSO_DB_URL;
  const authToken = process.env.TURSO_DB_AUTH_TOKEN;

  if (!url) {
    throw new Error("TURSO_DB_URL environment variable is not set");
  }

  return createClient({
    url,
    authToken,
  });
}

// Lazy initialization - only create client when first accessed
let dbInstance: Client | null = null;

export const db: Client = new Proxy({} as Client, {
  get(_, prop: string | symbol) {
    if (!dbInstance) {
      dbInstance = createDbClient();
    }
    return dbInstance[prop as keyof Client];
  },
});