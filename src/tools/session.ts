import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import type { Session, RuleSystem, GamePreferences } from "../types/index.js";

export function createSession(params: {
  name: string;
  setting: string;
  style: string;
  preferences?: GamePreferences;
}): Session {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO sessions (id, name, setting, style, rules, preferences, current_location_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, NULL, ?, NULL, ?, ?)
  `);

  stmt.run(
    id,
    params.name,
    params.setting,
    params.style,
    params.preferences ? JSON.stringify(params.preferences) : null,
    now,
    now
  );

  return {
    id,
    name: params.name,
    setting: params.setting,
    style: params.style,
    rules: null,
    preferences: params.preferences || null,
    currentLocationId: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function loadSession(id: string): Session | null {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM sessions WHERE id = ?`);
  const row = stmt.get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    name: row.name as string,
    setting: row.setting as string,
    style: row.style as string,
    rules: row.rules ? JSON.parse(row.rules as string) : null,
    preferences: row.preferences ? JSON.parse(row.preferences as string) : null,
    currentLocationId: row.current_location_id as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function listSessions(): Session[] {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM sessions ORDER BY updated_at DESC`);
  const rows = stmt.all() as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    setting: row.setting as string,
    style: row.style as string,
    rules: row.rules ? JSON.parse(row.rules as string) : null,
    preferences: row.preferences ? JSON.parse(row.preferences as string) : null,
    currentLocationId: row.current_location_id as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export function updateSessionPreferences(
  sessionId: string,
  preferences: GamePreferences
): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE sessions SET preferences = ?, updated_at = ? WHERE id = ?
  `);
  const result = stmt.run(JSON.stringify(preferences), now, sessionId);
  return result.changes > 0;
}

export function getSessionPreferences(sessionId: string): GamePreferences | null {
  const session = loadSession(sessionId);
  return session?.preferences || null;
}

export function deleteSession(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`DELETE FROM sessions WHERE id = ?`);
  const result = stmt.run(id);
  return result.changes > 0;
}

export function updateSessionLocation(
  sessionId: string,
  locationId: string | null
): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE sessions SET current_location_id = ?, updated_at = ? WHERE id = ?
  `);
  const result = stmt.run(locationId, now, sessionId);
  return result.changes > 0;
}

export function getSessionState(sessionId: string): {
  session: Session;
  characterCount: number;
  locationCount: number;
  activeQuests: number;
  activeCombat: boolean;
} | null {
  const db = getDatabase();

  const session = loadSession(sessionId);
  if (!session) return null;

  const charCount = db
    .prepare(`SELECT COUNT(*) as count FROM characters WHERE session_id = ?`)
    .get(sessionId) as { count: number };
  const locCount = db
    .prepare(`SELECT COUNT(*) as count FROM locations WHERE session_id = ?`)
    .get(sessionId) as { count: number };
  const questCount = db
    .prepare(
      `SELECT COUNT(*) as count FROM quests WHERE session_id = ? AND status = 'active'`
    )
    .get(sessionId) as { count: number };
  const combat = db
    .prepare(
      `SELECT COUNT(*) as count FROM combats WHERE session_id = ? AND status = 'active'`
    )
    .get(sessionId) as { count: number };

  return {
    session,
    characterCount: charCount.count,
    locationCount: locCount.count,
    activeQuests: questCount.count,
    activeCombat: combat.count > 0,
  };
}
