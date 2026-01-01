import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync, existsSync } from "fs";
import { homedir } from "os";
import { createLogger } from "../utils/logger.js";

const log = createLogger("db");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Resolve database path with the following priority:
 * 1. DMCP_DB_PATH environment variable (absolute path)
 * 2. XDG_DATA_HOME/dmcp/games.db (Linux/macOS standard)
 * 3. Fallback to ./data/games.db (relative to project)
 */
function resolveDataPath(): { dataDir: string; dbPath: string } {
  // Priority 1: Explicit environment variable
  if (process.env.DMCP_DB_PATH) {
    const dbPath = process.env.DMCP_DB_PATH;
    const dataDir = dirname(dbPath);
    log.info("Using database path from DMCP_DB_PATH", { dbPath });
    return { dataDir, dbPath };
  }

  // Priority 2: XDG Base Directory spec
  const xdgDataHome = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
  const xdgDataDir = join(xdgDataHome, "dmcp");
  const xdgDbPath = join(xdgDataDir, "games.db");

  // Use XDG path if it exists or if we're not in a development context
  if (existsSync(xdgDataDir) || !existsSync(join(__dirname, "..", "..", "package.json"))) {
    log.info("Using XDG data directory", { dbPath: xdgDbPath });
    return { dataDir: xdgDataDir, dbPath: xdgDbPath };
  }

  // Priority 3: Fallback to project-relative path (development)
  const fallbackDataDir = join(__dirname, "..", "..", "data");
  const fallbackDbPath = join(fallbackDataDir, "games.db");
  log.debug("Using project-relative data directory", { dbPath: fallbackDbPath });
  return { dataDir: fallbackDataDir, dbPath: fallbackDbPath };
}

const { dataDir: DATA_DIR, dbPath: DB_PATH } = resolveDataPath();

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
      log.info("Created data directory", { path: DATA_DIR });
    }

    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    log.info("Database connection established", { path: DB_PATH });
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    log.info("Database connection closed");
  }
}

/**
 * Execute multiple operations atomically within a transaction.
 * Automatically rolls back on error.
 */
export function withTransaction<T>(fn: () => T): T {
  const database = getDatabase();
  return database.transaction(fn)();
}

/**
 * Get the current database path (useful for debugging/logging).
 */
export function getDatabasePath(): string {
  return DB_PATH;
}
