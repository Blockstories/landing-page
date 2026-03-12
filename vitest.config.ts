import { defineConfig } from "vitest/config";
import { config } from "dotenv";

// Load .env from backend directory
config({ path: "./backend/.env" });

export default defineConfig({
  test: {
    globals: true,
    environment: "node"
  }
});
