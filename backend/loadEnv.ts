import { config } from "dotenv";
import { resolve } from "path";

// Load .env from project root (parent of backend directory)
config({ path: resolve(__dirname, "../.env") });
