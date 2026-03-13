import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

// Track if we've already loaded env vars
let loaded = false;

/**
 * Load environment variables from the project root .env file.
 * Safe to call multiple times - only loads once.
 */
export function loadEnv(): void {
  if (loaded) return;

  // Try to find the project root by looking for .env relative to this file
  // This file is in backend/config/, so root is two levels up
  const currentFile = fileURLToPath(import.meta.url);
  const backendDir = resolve(currentFile, "../..");
  const rootDir = resolve(backendDir, "..");

  // Try root first, then fall back to current working directory
  const envPaths = [
    resolve(rootDir, ".env"),
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../.env"),
  ];

  for (const envPath of envPaths) {
    try {
      config({ path: envPath });
      // Check if it worked by looking for a required env var
      if (process.env.TURSO_DB_URL) {
        loaded = true;
        console.log(`[env] Loaded from ${envPath}`);
        return;
      }
    } catch {
      // Continue to next path
    }
  }

  // If we get here, we didn't find a valid .env with required vars
  console.warn("[env] Warning: Could not load .env file with required variables");
  loaded = true; // Don't try again
}

// Auto-load on import
loadEnv();
