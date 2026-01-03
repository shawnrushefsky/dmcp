import { getDatabase } from "./connection.js";

export function initializeSchema(): void {
  const db = getDatabase();

  // ============================================================================
  // MIGRATION: Rename 'sessions' to 'games' and 'session_id' to 'game_id'
  // This handles existing databases that use the old 'session' terminology
  // ============================================================================

  // Check if the old 'sessions' table exists and migrate to 'games'
  const sessionsTableExists = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'"
  ).get();

  if (sessionsTableExists) {
    // Rename the main sessions table to games
    db.exec(`ALTER TABLE sessions RENAME TO games`);

    // Rename session_id columns to game_id in all tables that have them
    const tablesWithSessionId = [
      'characters', 'locations', 'items', 'quests', 'narrative_events',
      'combats', 'resources', 'game_time', 'scheduled_events', 'timers',
      'random_tables', 'secrets', 'relationships', 'factions', 'abilities',
      'status_effects', 'tags', 'notes', 'external_updates', 'pause_states',
      'stored_images'
    ];

    for (const table of tablesWithSessionId) {
      try {
        db.exec(`ALTER TABLE ${table} RENAME COLUMN session_id TO game_id`);
      } catch {
        // Column doesn't exist or already renamed
      }
    }

    // Rename session_themes table to game_themes if it exists
    try {
      // First rename the column, then rename the table
      db.exec(`ALTER TABLE session_themes RENAME COLUMN session_id TO game_id`);
      db.exec(`ALTER TABLE session_themes RENAME TO game_themes`);
    } catch {
      // Table doesn't exist or already renamed
    }

    // Update owner_type values in resources table
    try {
      db.exec(`UPDATE resources SET owner_type = 'game' WHERE owner_type = 'session'`);
    } catch {
      // Table might not exist yet
    }
  }

  // Games table (formerly sessions)
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
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
    db.exec(`ALTER TABLE games ADD COLUMN preferences TEXT`);
  } catch {
    // Column already exists
  }

  // Add title_image_id column if it doesn't exist (migration)
  try {
    db.exec(`ALTER TABLE games ADD COLUMN title_image_id TEXT`);
  } catch {
    // Column already exists
  }

  // Add favicon_image_id column if it doesn't exist (migration)
  try {
    db.exec(`ALTER TABLE games ADD COLUMN favicon_image_id TEXT`);
  } catch {
    // Column already exists
  }

  // Characters table
  db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      name TEXT NOT NULL,
      is_player INTEGER NOT NULL DEFAULT 0,
      attributes TEXT NOT NULL DEFAULT '{}',
      skills TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT '{}',
      location_id TEXT,
      notes TEXT DEFAULT '',
      voice TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  // Add voice column if it doesn't exist (migration for existing databases)
  try {
    db.exec(`ALTER TABLE characters ADD COLUMN voice TEXT`);
  } catch {
    // Column already exists
  }

  // Add image_gen column to characters
  try {
    db.exec(`ALTER TABLE characters ADD COLUMN image_gen TEXT`);
  } catch {
    // Column already exists
  }

  // Locations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      properties TEXT NOT NULL DEFAULT '{}',
      image_gen TEXT,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  // Add image_gen column to locations
  try {
    db.exec(`ALTER TABLE locations ADD COLUMN image_gen TEXT`);
  } catch {
    // Column already exists
  }

  // Items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      owner_type TEXT NOT NULL CHECK (owner_type IN ('character', 'location')),
      name TEXT NOT NULL,
      properties TEXT NOT NULL DEFAULT '{}',
      image_gen TEXT,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  // Add image_gen column to items
  try {
    db.exec(`ALTER TABLE items ADD COLUMN image_gen TEXT`);
  } catch {
    // Column already exists
  }

  // Quests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS quests (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      objectives TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'abandoned')),
      rewards TEXT,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  // Narrative events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS narrative_events (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      timestamp TEXT NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  // Combat table
  db.exec(`
    CREATE TABLE IF NOT EXISTS combats (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      location_id TEXT NOT NULL,
      participants TEXT NOT NULL DEFAULT '[]',
      current_turn INTEGER NOT NULL DEFAULT 0,
      round INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
      log TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  // Resources table (for tracking currency, reputation, counters, etc.)
  db.exec(`
    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      owner_id TEXT,
      owner_type TEXT NOT NULL CHECK (owner_type IN ('game', 'character')),
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      value REAL NOT NULL DEFAULT 0,
      min_value REAL,
      max_value REAL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  // Resource history table (tracks all changes)
  db.exec(`
    CREATE TABLE IF NOT EXISTS resource_history (
      id TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL,
      previous_value REAL NOT NULL,
      new_value REAL NOT NULL,
      delta REAL NOT NULL,
      reason TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
    )
  `);

  // Game time table (one per game)
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_time (
      game_id TEXT PRIMARY KEY,
      current_time TEXT NOT NULL,
      calendar_config TEXT NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  // Scheduled events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS scheduled_events (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      trigger_time TEXT NOT NULL,
      recurring TEXT,
      triggered INTEGER DEFAULT 0,
      metadata TEXT DEFAULT '{}',
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  // Timers table (countdowns, stopwatches, clocks)
  db.exec(`
    CREATE TABLE IF NOT EXISTS timers (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      timer_type TEXT NOT NULL CHECK (timer_type IN ('countdown', 'stopwatch', 'clock')),
      current_value INTEGER NOT NULL,
      max_value INTEGER,
      direction TEXT DEFAULT 'down' CHECK (direction IN ('up', 'down')),
      trigger_at INTEGER,
      triggered INTEGER DEFAULT 0,
      unit TEXT DEFAULT 'tick',
      visible_to_players INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  // Random tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS random_tables (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      entries TEXT NOT NULL DEFAULT '[]',
      roll_expression TEXT DEFAULT '1d100',
      created_at TEXT NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  // Secrets table
  db.exec(`
    CREATE TABLE IF NOT EXISTS secrets (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT,
      related_entity_id TEXT,
      related_entity_type TEXT,
      revealed_to TEXT DEFAULT '[]',
      is_public INTEGER DEFAULT 0,
      clues TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  // Relationships table
  db.exec(`
    CREATE TABLE IF NOT EXISTS relationships (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      source_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      relationship_type TEXT NOT NULL,
      value INTEGER DEFAULT 0,
      label TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  // Relationship history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS relationship_history (
      id TEXT PRIMARY KEY,
      relationship_id TEXT NOT NULL,
      previous_value INTEGER,
      new_value INTEGER,
      reason TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (relationship_id) REFERENCES relationships(id) ON DELETE CASCADE
    )
  `);

  // Factions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS factions (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      leader_id TEXT,
      headquarters_id TEXT,
      resources TEXT DEFAULT '{}',
      goals TEXT DEFAULT '[]',
      traits TEXT DEFAULT '[]',
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disbanded', 'hidden')),
      created_at TEXT NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  // Abilities table
  db.exec(`
    CREATE TABLE IF NOT EXISTS abilities (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      owner_id TEXT,
      owner_type TEXT CHECK (owner_type IN ('template', 'character')),
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      cost TEXT DEFAULT '{}',
      cooldown INTEGER,
      current_cooldown INTEGER DEFAULT 0,
      effects TEXT DEFAULT '[]',
      requirements TEXT DEFAULT '{}',
      tags TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  // Status effects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS status_effects (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      effect_type TEXT CHECK (effect_type IN ('buff', 'debuff', 'neutral')),
      duration INTEGER,
      stacks INTEGER DEFAULT 1,
      max_stacks INTEGER,
      effects TEXT DEFAULT '{}',
      source_id TEXT,
      source_type TEXT,
      expires_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  // Tags table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      tag TEXT NOT NULL,
      color TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      UNIQUE (game_id, entity_id, entity_type, tag)
    )
  `);

  // Notes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT,
      pinned INTEGER DEFAULT 0,
      related_entity_id TEXT,
      related_entity_type TEXT,
      tags TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  // External updates table - enables multi-agent collaboration
  // External agents can push updates that the primary DM agent receives
  db.exec(`
    CREATE TABLE IF NOT EXISTS external_updates (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,

      -- Source identification
      source_agent TEXT NOT NULL,
      source_description TEXT,

      -- Update content
      update_type TEXT NOT NULL,
      category TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      structured_data TEXT,

      -- Targeting (what entities this relates to)
      target_entity_id TEXT,
      target_entity_type TEXT,

      -- Priority and status
      priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'applied', 'rejected')),

      -- Timestamps
      created_at TEXT NOT NULL,
      acknowledged_at TEXT,
      applied_at TEXT,

      -- DM notes on how update was used
      dm_notes TEXT,

      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  // Pause states table - captures agent context for seamless resume
  db.exec(`
    CREATE TABLE IF NOT EXISTS pause_states (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL UNIQUE,

      -- Current scene/moment context
      current_scene TEXT NOT NULL,
      scene_atmosphere TEXT,
      immediate_situation TEXT NOT NULL,

      -- Pending player interaction
      pending_player_action TEXT,
      awaiting_response_to TEXT,
      presented_choices TEXT,

      -- Active narrative threads
      active_threads TEXT DEFAULT '[]',

      -- DM's plans and notes
      dm_short_term_plans TEXT,
      dm_long_term_plans TEXT,
      upcoming_reveals TEXT DEFAULT '[]',

      -- NPC states (not persisted elsewhere)
      npc_attitudes TEXT DEFAULT '{}',
      active_conversations TEXT DEFAULT '[]',

      -- Important context that might be lost
      recent_tone TEXT,
      player_apparent_goals TEXT,
      unresolved_hooks TEXT DEFAULT '[]',

      -- Metadata
      pause_reason TEXT,
      created_at TEXT NOT NULL,
      model_used TEXT,

      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  // Stored images table - file-based image storage
  db.exec(`
    CREATE TABLE IF NOT EXISTS stored_images (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      entity_type TEXT NOT NULL CHECK (entity_type IN ('character', 'location', 'item', 'scene')),

      -- File information
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      width INTEGER,
      height INTEGER,

      -- Metadata
      label TEXT,
      description TEXT,
      source TEXT NOT NULL CHECK (source IN ('generated', 'uploaded', 'url')),
      source_url TEXT,
      generation_tool TEXT,
      generation_prompt TEXT,

      -- Flags
      is_primary INTEGER DEFAULT 0,

      -- Timestamps
      created_at TEXT NOT NULL,

      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  // Display configuration table (global, one row)
  db.exec(`
    CREATE TABLE IF NOT EXISTS display_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      config TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL
    )
  `);

  // Per-game theme configuration
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_themes (
      game_id TEXT PRIMARY KEY,
      config TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for common queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_characters_game ON characters(game_id);
    CREATE INDEX IF NOT EXISTS idx_characters_location ON characters(location_id);
    CREATE INDEX IF NOT EXISTS idx_locations_game ON locations(game_id);
    CREATE INDEX IF NOT EXISTS idx_items_game ON items(game_id);
    CREATE INDEX IF NOT EXISTS idx_items_owner ON items(owner_id, owner_type);
    CREATE INDEX IF NOT EXISTS idx_quests_game ON quests(game_id);
    CREATE INDEX IF NOT EXISTS idx_quests_status ON quests(status);
    CREATE INDEX IF NOT EXISTS idx_narrative_game ON narrative_events(game_id);
    CREATE INDEX IF NOT EXISTS idx_narrative_timestamp ON narrative_events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_combats_game ON combats(game_id);
    CREATE INDEX IF NOT EXISTS idx_combats_status ON combats(status);
    CREATE INDEX IF NOT EXISTS idx_resources_game ON resources(game_id);
    CREATE INDEX IF NOT EXISTS idx_resources_owner ON resources(owner_id, owner_type);
    CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
    CREATE INDEX IF NOT EXISTS idx_resource_history_resource ON resource_history(resource_id);
    CREATE INDEX IF NOT EXISTS idx_scheduled_events_game ON scheduled_events(game_id);
    CREATE INDEX IF NOT EXISTS idx_scheduled_events_trigger ON scheduled_events(trigger_time);
    CREATE INDEX IF NOT EXISTS idx_timers_game ON timers(game_id);
    CREATE INDEX IF NOT EXISTS idx_random_tables_game ON random_tables(game_id);
    CREATE INDEX IF NOT EXISTS idx_random_tables_category ON random_tables(category);
    CREATE INDEX IF NOT EXISTS idx_secrets_game ON secrets(game_id);
    CREATE INDEX IF NOT EXISTS idx_secrets_category ON secrets(category);
    CREATE INDEX IF NOT EXISTS idx_relationships_game ON relationships(game_id);
    CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(source_id, source_type);
    CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(target_id, target_type);
    CREATE INDEX IF NOT EXISTS idx_relationship_history_rel ON relationship_history(relationship_id);
    CREATE INDEX IF NOT EXISTS idx_factions_game ON factions(game_id);
    CREATE INDEX IF NOT EXISTS idx_factions_status ON factions(status);
    CREATE INDEX IF NOT EXISTS idx_abilities_game ON abilities(game_id);
    CREATE INDEX IF NOT EXISTS idx_abilities_owner ON abilities(owner_id, owner_type);
    CREATE INDEX IF NOT EXISTS idx_abilities_category ON abilities(category);
    CREATE INDEX IF NOT EXISTS idx_status_effects_game ON status_effects(game_id);
    CREATE INDEX IF NOT EXISTS idx_status_effects_target ON status_effects(target_id);
    CREATE INDEX IF NOT EXISTS idx_tags_game ON tags(game_id);
    CREATE INDEX IF NOT EXISTS idx_tags_entity ON tags(entity_id, entity_type);
    CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);
    CREATE INDEX IF NOT EXISTS idx_notes_game ON notes(game_id);
    CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
    CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(pinned);
    CREATE INDEX IF NOT EXISTS idx_pause_states_game ON pause_states(game_id);
    CREATE INDEX IF NOT EXISTS idx_external_updates_game ON external_updates(game_id);
    CREATE INDEX IF NOT EXISTS idx_external_updates_status ON external_updates(status);
    CREATE INDEX IF NOT EXISTS idx_external_updates_priority ON external_updates(priority);
    CREATE INDEX IF NOT EXISTS idx_stored_images_game ON stored_images(game_id);
    CREATE INDEX IF NOT EXISTS idx_stored_images_entity ON stored_images(entity_id, entity_type);
    CREATE INDEX IF NOT EXISTS idx_stored_images_primary ON stored_images(entity_id, entity_type, is_primary);
  `);
}
