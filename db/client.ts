import { Database } from "@libsql/client";

export const db = new Database(process.env.TURSO_DB_URL!);