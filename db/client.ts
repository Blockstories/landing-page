import { createClient, Client } from "@libsql/client";

export const db: Client = createClient({
  url: process.env.TURSO_DB_URL || "",
});