import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import { safeJsonParse } from "../utils/json.js";
import { gameEvents } from "../events/emitter.js";
import type { NarrativeEvent, QuestObjective } from "../types/index.js";

export function logEvent(params: {
  gameId: string;
  eventType: string;
  content: string;
  metadata?: Record<string, unknown>;
}): NarrativeEvent {
  const db = getDatabase();
  const id = uuidv4();
  const timestamp = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO narrative_events (id, game_id, event_type, content, metadata, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    params.gameId,
    params.eventType,
    params.content,
    JSON.stringify(params.metadata || {}),
    timestamp
  );

  const event: NarrativeEvent = {
    id,
    gameId: params.gameId,
    eventType: params.eventType,
    content: params.content,
    metadata: params.metadata || {},
    timestamp,
  };

  // Emit realtime event
  gameEvents.emit({
    type: "narrative:created",
    gameId: params.gameId,
    entityId: id,
    entityType: "narrative",
    timestamp,
    data: event,
  });

  return event;
}

export function getEvent(id: string): NarrativeEvent | null {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM narrative_events WHERE id = ?`);
  const row = stmt.get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    gameId: row.game_id as string,
    eventType: row.event_type as string,
    content: row.content as string,
    metadata: safeJsonParse<Record<string, unknown>>(row.metadata as string, {}),
    timestamp: row.timestamp as string,
  };
}

export function getHistory(
  gameId: string,
  options?: {
    limit?: number;
    offset?: number;
    eventType?: string;
    since?: string;
  }
): NarrativeEvent[] {
  const db = getDatabase();
  let query = `SELECT * FROM narrative_events WHERE game_id = ?`;
  const params: (string | number)[] = [gameId];

  if (options?.eventType) {
    query += ` AND event_type = ?`;
    params.push(options.eventType);
  }

  if (options?.since) {
    query += ` AND timestamp >= ?`;
    params.push(options.since);
  }

  query += ` ORDER BY timestamp DESC`;

  if (options?.limit) {
    query += ` LIMIT ?`;
    params.push(options.limit);
  }

  if (options?.offset) {
    query += ` OFFSET ?`;
    params.push(options.offset);
  }

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as Record<string, unknown>[];

  // Return in chronological order
  return rows
    .map((row) => ({
      id: row.id as string,
      gameId: row.game_id as string,
      eventType: row.event_type as string,
      content: row.content as string,
      metadata: safeJsonParse<Record<string, unknown>>(row.metadata as string, {}),
      timestamp: row.timestamp as string,
    }))
    .reverse();
}

export function getRecentHistory(
  gameId: string,
  count: number = 10
): NarrativeEvent[] {
  return getHistory(gameId, { limit: count });
}

export function getSummary(gameId: string): {
  totalEvents: number;
  eventTypes: Record<string, number>;
  firstEvent: string | null;
  lastEvent: string | null;
  recentEvents: NarrativeEvent[];
} {
  const db = getDatabase();

  const countResult = db
    .prepare(
      `SELECT COUNT(*) as count FROM narrative_events WHERE game_id = ?`
    )
    .get(gameId) as { count: number };

  const typeResults = db
    .prepare(
      `SELECT event_type, COUNT(*) as count FROM narrative_events WHERE game_id = ? GROUP BY event_type`
    )
    .all(gameId) as { event_type: string; count: number }[];

  const eventTypes: Record<string, number> = {};
  for (const row of typeResults) {
    eventTypes[row.event_type] = row.count;
  }

  const firstResult = db
    .prepare(
      `SELECT timestamp FROM narrative_events WHERE game_id = ? ORDER BY timestamp ASC LIMIT 1`
    )
    .get(gameId) as { timestamp: string } | undefined;

  const lastResult = db
    .prepare(
      `SELECT timestamp FROM narrative_events WHERE game_id = ? ORDER BY timestamp DESC LIMIT 1`
    )
    .get(gameId) as { timestamp: string } | undefined;

  const recentEvents = getRecentHistory(gameId, 5);

  return {
    totalEvents: countResult.count,
    eventTypes,
    firstEvent: firstResult?.timestamp || null,
    lastEvent: lastResult?.timestamp || null,
    recentEvents,
  };
}

export function deleteEvent(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`DELETE FROM narrative_events WHERE id = ?`);
  const result = stmt.run(id);
  return result.changes > 0;
}

export function clearHistory(gameId: string): number {
  const db = getDatabase();
  const stmt = db.prepare(`DELETE FROM narrative_events WHERE game_id = ?`);
  const result = stmt.run(gameId);
  return result.changes;
}

export interface StoryExportData {
  game: {
    name: string;
    setting: string;
    style: string;
    createdAt: string;
  };
  characters: Array<{
    name: string;
    isPlayer: boolean;
    notes: string;
  }>;
  locations: Array<{
    name: string;
    description: string;
  }>;
  quests: Array<{
    name: string;
    description: string;
    status: string;
    objectives: Array<{ description: string; completed: boolean }>;
  }>;
  chapters: Array<{
    title: string;
    events: NarrativeEvent[];
  }>;
  totalEvents: number;
  exportStyle: string;
  instruction: string;
}

export function exportStoryData(
  gameId: string,
  style: string
): StoryExportData | null {
  const db = getDatabase();

  // Get game info
  const game = db
    .prepare(`SELECT name, setting, style, created_at FROM games WHERE id = ?`)
    .get(gameId) as { name: string; setting: string; style: string; created_at: string } | undefined;

  if (!game) return null;

  // Get all characters
  const characters = db
    .prepare(`SELECT name, is_player, notes FROM characters WHERE game_id = ?`)
    .all(gameId) as Array<{ name: string; is_player: number; notes: string }>;

  // Get all locations
  const locations = db
    .prepare(`SELECT name, description FROM locations WHERE game_id = ?`)
    .all(gameId) as Array<{ name: string; description: string }>;

  // Get all quests
  const quests = db
    .prepare(`SELECT name, description, status, objectives FROM quests WHERE game_id = ?`)
    .all(gameId) as Array<{ name: string; description: string; status: string; objectives: string }>;

  // Get all narrative events in chronological order
  const events = db
    .prepare(`SELECT * FROM narrative_events WHERE game_id = ? ORDER BY timestamp ASC`)
    .all(gameId) as Array<Record<string, unknown>>;

  const narrativeEvents: NarrativeEvent[] = events.map((row) => ({
    id: row.id as string,
    gameId: row.game_id as string,
    eventType: row.event_type as string,
    content: row.content as string,
    metadata: safeJsonParse<Record<string, unknown>>(row.metadata as string, {}),
    timestamp: row.timestamp as string,
  }));

  // Group events into chapters (by day or significant breaks)
  const chapters = groupEventsIntoChapters(narrativeEvents);

  return {
    game: {
      name: game.name,
      setting: game.setting,
      style: game.style,
      createdAt: game.created_at,
    },
    characters: characters.map((c) => ({
      name: c.name,
      isPlayer: c.is_player === 1,
      notes: c.notes,
    })),
    locations: locations.map((l) => ({
      name: l.name,
      description: l.description,
    })),
    quests: quests.map((q) => ({
      name: q.name,
      description: q.description,
      status: q.status,
      objectives: safeJsonParse<QuestObjective[]>(q.objectives, []),
    })),
    chapters,
    totalEvents: narrativeEvents.length,
    exportStyle: style,
    instruction: getStyleInstruction(style),
  };
}

function groupEventsIntoChapters(events: NarrativeEvent[]): Array<{ title: string; events: NarrativeEvent[] }> {
  if (events.length === 0) return [];

  const chapters: Array<{ title: string; events: NarrativeEvent[] }> = [];
  let currentChapter: NarrativeEvent[] = [];
  let currentDate: string | null = null;
  let chapterNumber = 1;

  for (const event of events) {
    const eventDate = event.timestamp.split("T")[0];

    // Start new chapter on day change or after major events
    const isMajorEvent = ["quest_completed", "combat_resolved", "location_change"].includes(event.eventType);

    if (currentDate && (eventDate !== currentDate || (isMajorEvent && currentChapter.length > 5))) {
      if (currentChapter.length > 0) {
        chapters.push({
          title: `Chapter ${chapterNumber}`,
          events: currentChapter,
        });
        chapterNumber++;
        currentChapter = [];
      }
    }

    currentChapter.push(event);
    currentDate = eventDate;
  }

  // Add final chapter
  if (currentChapter.length > 0) {
    chapters.push({
      title: `Chapter ${chapterNumber}`,
      events: currentChapter,
    });
  }

  return chapters;
}

function getStyleInstruction(style: string): string {
  const styles: Record<string, string> = {
    "literary-fiction": "Write in a sophisticated, literary style with rich prose, deep character introspection, and thematic depth. Focus on the human condition and emotional truth.",
    "pulp-adventure": "Write in an exciting, fast-paced pulp style with vivid action, bold heroes, and thrilling cliffhangers. Keep it punchy and entertaining.",
    "epic-fantasy": "Write in a grand, sweeping epic fantasy style with rich world-building, dramatic moments, and mythic undertones. Channel Tolkien and Jordan.",
    "noir": "Write in a hardboiled noir style with terse prose, moral ambiguity, and atmospheric descriptions. First person works well here.",
    "horror": "Write in an atmospheric horror style building dread and tension. Focus on the unsettling and the unknown. Use restraint for maximum effect.",
    "comedic": "Write in a witty, humorous style finding the absurdity and comedy in the events. Include clever dialogue and amusing observations.",
    "young-adult": "Write in an accessible, engaging young adult style with relatable characters and clear prose. Balance action with emotional moments.",
    "screenplay": "Format as a screenplay with scene headings, action lines, and dialogue. Focus on visual storytelling and crisp dialogue.",
    "journal": "Write as personal journal entries from the protagonist's perspective. Intimate, reflective, and immediate.",
    "chronicle": "Write as a historical chronicle, documenting events with a sense of importance and legacy. Slightly formal, sweeping in scope.",
  };

  return styles[style] || `Write the story in a ${style} style. Transform the game events into engaging narrative prose that captures the spirit of the adventure.`;
}
