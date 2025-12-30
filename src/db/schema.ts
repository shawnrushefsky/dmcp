import { getDatabase } from "./connection.js";

export function initializeSchema(): void {
  const db = getDatabase();

  // Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      setting TEXT NOT NULL,
      style TEXT NOT NULL,
      rules TEXT,
      preferences TEXT,
      current_location_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Add preferences column if it doesn't exist (migration)
  try {
    db.exec(`ALTER TABLE sessions ADD COLUMN preferences TEXT`);
  } catch {
    // Column already exists
  }

  // Characters table
  db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      name TEXT NOT NULL,
      is_player INTEGER NOT NULL DEFAULT 0,
      attributes TEXT NOT NULL DEFAULT '{}',
      skills TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT '{}',
      location_id TEXT,
      notes TEXT DEFAULT '',
      voice TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);

  // Add voice column if it doesn't exist (migration for existing databases)
  try {
    db.exec(`ALTER TABLE characters ADD COLUMN voice TEXT`);
  } catch {
    // Column already exists, ignore
  }

  // Locations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      properties TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);

  // Items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      owner_type TEXT NOT NULL CHECK (owner_type IN ('character', 'location')),
      name TEXT NOT NULL,
      properties TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);

  // Quests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS quests (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      objectives TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'abandoned')),
      rewards TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);

  // Narrative events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS narrative_events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      timestamp TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);

  // Combat table
  db.exec(`
    CREATE TABLE IF NOT EXISTS combats (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      location_id TEXT NOT NULL,
      participants TEXT NOT NULL DEFAULT '[]',
      current_turn INTEGER NOT NULL DEFAULT 0,
      round INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
      log TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for common queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_characters_session ON characters(session_id);
    CREATE INDEX IF NOT EXISTS idx_characters_location ON characters(location_id);
    CREATE INDEX IF NOT EXISTS idx_locations_session ON locations(session_id);
    CREATE INDEX IF NOT EXISTS idx_items_session ON items(session_id);
    CREATE INDEX IF NOT EXISTS idx_items_owner ON items(owner_id, owner_type);
    CREATE INDEX IF NOT EXISTS idx_quests_session ON quests(session_id);
    CREATE INDEX IF NOT EXISTS idx_quests_status ON quests(status);
    CREATE INDEX IF NOT EXISTS idx_narrative_session ON narrative_events(session_id);
    CREATE INDEX IF NOT EXISTS idx_narrative_timestamp ON narrative_events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_combats_session ON combats(session_id);
    CREATE INDEX IF NOT EXISTS idx_combats_status ON combats(status);
  `);
}
