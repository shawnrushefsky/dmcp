import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import { safeJsonParse } from "../utils/json.js";
import type { Session, RuleSystem, GamePreferences, ImageGenerationPreferences } from "../types/index.js";

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
    titleImageId: null,
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
    rules: row.rules ? safeJsonParse<RuleSystem>(row.rules as string, null as unknown as RuleSystem) : null,
    preferences: row.preferences ? safeJsonParse<GamePreferences>(row.preferences as string, null as unknown as GamePreferences) : null,
    currentLocationId: row.current_location_id as string | null,
    titleImageId: row.title_image_id as string | null,
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
    rules: row.rules ? safeJsonParse<RuleSystem>(row.rules as string, null as unknown as RuleSystem) : null,
    preferences: row.preferences ? safeJsonParse<GamePreferences>(row.preferences as string, null as unknown as GamePreferences) : null,
    currentLocationId: row.current_location_id as string | null,
    titleImageId: row.title_image_id as string | null,
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

export function updateSession(
  sessionId: string,
  updates: { name?: string; setting?: string; style?: string }
): Session | null {
  const db = getDatabase();
  const session = loadSession(sessionId);
  if (!session) return null;

  const now = new Date().toISOString();
  const newName = updates.name ?? session.name;
  const newSetting = updates.setting ?? session.setting;
  const newStyle = updates.style ?? session.style;

  const stmt = db.prepare(`
    UPDATE sessions SET name = ?, setting = ?, style = ?, updated_at = ? WHERE id = ?
  `);
  stmt.run(newName, newSetting, newStyle, now, sessionId);

  return {
    ...session,
    name: newName,
    setting: newSetting,
    style: newStyle,
    updatedAt: now,
  };
}

export function setSessionTitleImage(
  sessionId: string,
  imageId: string | null
): Session | null {
  const db = getDatabase();
  const session = loadSession(sessionId);
  if (!session) return null;

  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE sessions SET title_image_id = ?, updated_at = ? WHERE id = ?
  `);
  stmt.run(imageId, now, sessionId);

  return {
    ...session,
    titleImageId: imageId,
    updatedAt: now,
  };
}

export interface GameMenuResult {
  hasExistingGames: boolean;
  sessions: Array<{
    id: string;
    name: string;
    setting: string;
    style: string;
    lastPlayed: string;
    characterCount: number;
    locationCount: number;
  }>;
  instruction: string;
  visualizationTip: string;
}

export function getGameMenu(): GameMenuResult {
  const db = getDatabase();
  const sessions = listSessions();

  if (sessions.length === 0) {
    return {
      hasExistingGames: false,
      sessions: [],
      instruction: "No existing games found. Start the new game interview process directly using get_interview_template.",
      visualizationTip: "Enhance the experience with visuals: use render_map for world maps, and create ASCII art for character portraits, items, scene illustrations, and combat layouts when image generation isn't available.",
    };
  }

  // Get additional info for each session
  const sessionsWithInfo = sessions.map((session) => {
    const charCount = db
      .prepare(`SELECT COUNT(*) as count FROM characters WHERE session_id = ?`)
      .get(session.id) as { count: number };
    const locCount = db
      .prepare(`SELECT COUNT(*) as count FROM locations WHERE session_id = ?`)
      .get(session.id) as { count: number };

    return {
      id: session.id,
      name: session.name,
      setting: session.setting,
      style: session.style,
      lastPlayed: session.updatedAt,
      characterCount: charCount.count,
      locationCount: locCount.count,
    };
  });

  return {
    hasExistingGames: true,
    sessions: sessionsWithInfo,
    instruction: "Present these existing games as choices (most recent first), with an option to start a new game. Use present_choices or ask the player which game to continue.",
    visualizationTip: "Enhance the experience with visuals: use render_map for world maps, and create ASCII art for character portraits, items, scene illustrations, and combat layouts when image generation isn't available.",
  };
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

export function getImageGenerationPreferences(
  sessionId: string
): ImageGenerationPreferences | null {
  const preferences = getSessionPreferences(sessionId);
  return preferences?.imageGeneration || null;
}

export function setImageGenerationPreferences(
  sessionId: string,
  imagePrefs: ImageGenerationPreferences
): boolean {
  const currentPrefs = getSessionPreferences(sessionId) || {} as GamePreferences;
  const updatedPrefs: GamePreferences = {
    ...currentPrefs,
    imageGeneration: imagePrefs,
  };
  return updateSessionPreferences(sessionId, updatedPrefs);
}

export function updateImageGenerationPreferences(
  sessionId: string,
  updates: Partial<ImageGenerationPreferences>
): ImageGenerationPreferences | null {
  const currentImagePrefs = getImageGenerationPreferences(sessionId) || {};
  const updatedImagePrefs: ImageGenerationPreferences = {
    ...currentImagePrefs,
    ...updates,
    // Deep merge for nested objects
    defaultStyle: {
      ...currentImagePrefs.defaultStyle,
      ...updates.defaultStyle,
    },
    comfyui: updates.comfyui !== undefined ? {
      ...currentImagePrefs.comfyui,
      ...updates.comfyui,
      samplerSettings: {
        ...currentImagePrefs.comfyui?.samplerSettings,
        ...updates.comfyui?.samplerSettings,
      },
    } : currentImagePrefs.comfyui,
    dalle: updates.dalle !== undefined ? {
      ...currentImagePrefs.dalle,
      ...updates.dalle,
    } : currentImagePrefs.dalle,
    midjourney: updates.midjourney !== undefined ? {
      ...currentImagePrefs.midjourney,
      ...updates.midjourney,
    } : currentImagePrefs.midjourney,
    sdxl: updates.sdxl !== undefined ? {
      ...currentImagePrefs.sdxl,
      ...updates.sdxl,
    } : currentImagePrefs.sdxl,
    flux: updates.flux !== undefined ? {
      ...currentImagePrefs.flux,
      ...updates.flux,
    } : currentImagePrefs.flux,
    defaults: updates.defaults !== undefined ? {
      ...currentImagePrefs.defaults,
      ...updates.defaults,
      framing: {
        ...currentImagePrefs.defaults?.framing,
        ...updates.defaults?.framing,
      },
    } : currentImagePrefs.defaults,
    consistency: updates.consistency !== undefined ? {
      ...currentImagePrefs.consistency,
      ...updates.consistency,
    } : currentImagePrefs.consistency,
  };

  const success = setImageGenerationPreferences(sessionId, updatedImagePrefs);
  return success ? updatedImagePrefs : null;
}
