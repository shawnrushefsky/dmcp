import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import type { NarrativeEvent } from "../types/index.js";

export function logEvent(params: {
  sessionId: string;
  eventType: string;
  content: string;
  metadata?: Record<string, unknown>;
}): NarrativeEvent {
  const db = getDatabase();
  const id = uuidv4();
  const timestamp = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO narrative_events (id, session_id, event_type, content, metadata, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    params.sessionId,
    params.eventType,
    params.content,
    JSON.stringify(params.metadata || {}),
    timestamp
  );

  return {
    id,
    sessionId: params.sessionId,
    eventType: params.eventType,
    content: params.content,
    metadata: params.metadata || {},
    timestamp,
  };
}

export function getEvent(id: string): NarrativeEvent | null {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM narrative_events WHERE id = ?`);
  const row = stmt.get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    eventType: row.event_type as string,
    content: row.content as string,
    metadata: JSON.parse(row.metadata as string),
    timestamp: row.timestamp as string,
  };
}

export function getHistory(
  sessionId: string,
  options?: {
    limit?: number;
    offset?: number;
    eventType?: string;
    since?: string;
  }
): NarrativeEvent[] {
  const db = getDatabase();
  let query = `SELECT * FROM narrative_events WHERE session_id = ?`;
  const params: (string | number)[] = [sessionId];

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
      sessionId: row.session_id as string,
      eventType: row.event_type as string,
      content: row.content as string,
      metadata: JSON.parse(row.metadata as string),
      timestamp: row.timestamp as string,
    }))
    .reverse();
}

export function getRecentHistory(
  sessionId: string,
  count: number = 10
): NarrativeEvent[] {
  return getHistory(sessionId, { limit: count });
}

export function getSummary(sessionId: string): {
  totalEvents: number;
  eventTypes: Record<string, number>;
  firstEvent: string | null;
  lastEvent: string | null;
  recentEvents: NarrativeEvent[];
} {
  const db = getDatabase();

  const countResult = db
    .prepare(
      `SELECT COUNT(*) as count FROM narrative_events WHERE session_id = ?`
    )
    .get(sessionId) as { count: number };

  const typeResults = db
    .prepare(
      `SELECT event_type, COUNT(*) as count FROM narrative_events WHERE session_id = ? GROUP BY event_type`
    )
    .all(sessionId) as { event_type: string; count: number }[];

  const eventTypes: Record<string, number> = {};
  for (const row of typeResults) {
    eventTypes[row.event_type] = row.count;
  }

  const firstResult = db
    .prepare(
      `SELECT timestamp FROM narrative_events WHERE session_id = ? ORDER BY timestamp ASC LIMIT 1`
    )
    .get(sessionId) as { timestamp: string } | undefined;

  const lastResult = db
    .prepare(
      `SELECT timestamp FROM narrative_events WHERE session_id = ? ORDER BY timestamp DESC LIMIT 1`
    )
    .get(sessionId) as { timestamp: string } | undefined;

  const recentEvents = getRecentHistory(sessionId, 5);

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

export function clearHistory(sessionId: string): number {
  const db = getDatabase();
  const stmt = db.prepare(`DELETE FROM narrative_events WHERE session_id = ?`);
  const result = stmt.run(sessionId);
  return result.changes;
}
