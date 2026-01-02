import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import { safeJsonParse } from "../utils/json.js";
import type { Session, RuleSystem, GamePreferences, ImageGenerationPreferences, ImageGenerationPreset } from "../types/index.js";

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

// ============================================================================
// Image Generation Presets - Collection Management
// ============================================================================

export function listImageGenerationPresets(
  sessionId: string
): ImageGenerationPreset[] {
  const preferences = getSessionPreferences(sessionId);
  return preferences?.imageGenerationPresets || [];
}

export function getImageGenerationPreset(
  sessionId: string,
  presetId: string
): ImageGenerationPreset | null {
  const presets = listImageGenerationPresets(sessionId);
  return presets.find(p => p.id === presetId) || null;
}

export function getDefaultImagePreset(
  sessionId: string
): ImageGenerationPreset | null {
  const preferences = getSessionPreferences(sessionId);
  const presets = preferences?.imageGenerationPresets || [];

  // First try to find by defaultImagePresetId
  if (preferences?.defaultImagePresetId) {
    const preset = presets.find(p => p.id === preferences.defaultImagePresetId);
    if (preset) return preset;
  }

  // Then try to find one marked as default
  const defaultPreset = presets.find(p => p.isDefault);
  if (defaultPreset) return defaultPreset;

  // Fall back to first preset
  return presets[0] || null;
}

export function createImageGenerationPreset(
  sessionId: string,
  params: {
    name: string;
    description?: string;
    entityTypes?: ("character" | "location" | "item" | "scene")[];
    isDefault?: boolean;
    config: ImageGenerationPreferences;
  }
): ImageGenerationPreset {
  const currentPrefs = getSessionPreferences(sessionId) || {} as GamePreferences;
  const presets = currentPrefs.imageGenerationPresets || [];

  const now = new Date().toISOString();
  const newPreset: ImageGenerationPreset = {
    id: uuidv4(),
    name: params.name,
    description: params.description,
    entityTypes: params.entityTypes,
    isDefault: params.isDefault,
    config: params.config,
    createdAt: now,
    updatedAt: now,
  };

  // If this is marked as default, unmark others
  let updatedPresets = presets;
  if (params.isDefault) {
    updatedPresets = presets.map(p => ({ ...p, isDefault: false }));
  }

  const updatedPrefs: GamePreferences = {
    ...currentPrefs,
    imageGenerationPresets: [...updatedPresets, newPreset],
    ...(params.isDefault ? { defaultImagePresetId: newPreset.id } : {}),
  };

  updateSessionPreferences(sessionId, updatedPrefs);
  return newPreset;
}

export function updateImageGenerationPreset(
  sessionId: string,
  presetId: string,
  updates: {
    name?: string;
    description?: string;
    entityTypes?: ("character" | "location" | "item" | "scene")[];
    isDefault?: boolean;
    config?: Partial<ImageGenerationPreferences>;
  }
): ImageGenerationPreset | null {
  const currentPrefs = getSessionPreferences(sessionId) || {} as GamePreferences;
  const presets = currentPrefs.imageGenerationPresets || [];

  const presetIndex = presets.findIndex(p => p.id === presetId);
  if (presetIndex === -1) return null;

  const currentPreset = presets[presetIndex];
  const now = new Date().toISOString();

  // Deep merge config if provided
  let updatedConfig = currentPreset.config;
  if (updates.config) {
    updatedConfig = deepMergePreferences(currentPreset.config, updates.config);
  }

  const updatedPreset: ImageGenerationPreset = {
    ...currentPreset,
    ...(updates.name !== undefined ? { name: updates.name } : {}),
    ...(updates.description !== undefined ? { description: updates.description } : {}),
    ...(updates.entityTypes !== undefined ? { entityTypes: updates.entityTypes } : {}),
    ...(updates.isDefault !== undefined ? { isDefault: updates.isDefault } : {}),
    config: updatedConfig,
    updatedAt: now,
  };

  // If this is marked as default, unmark others
  let updatedPresets = [...presets];
  if (updates.isDefault) {
    updatedPresets = presets.map(p => ({ ...p, isDefault: false }));
  }
  updatedPresets[presetIndex] = updatedPreset;

  const updatedPrefs: GamePreferences = {
    ...currentPrefs,
    imageGenerationPresets: updatedPresets,
    ...(updates.isDefault ? { defaultImagePresetId: presetId } : {}),
  };

  updateSessionPreferences(sessionId, updatedPrefs);
  return updatedPreset;
}

export function deleteImageGenerationPreset(
  sessionId: string,
  presetId: string
): boolean {
  const currentPrefs = getSessionPreferences(sessionId) || {} as GamePreferences;
  const presets = currentPrefs.imageGenerationPresets || [];

  const filteredPresets = presets.filter(p => p.id !== presetId);
  if (filteredPresets.length === presets.length) return false; // Not found

  const updatedPrefs: GamePreferences = {
    ...currentPrefs,
    imageGenerationPresets: filteredPresets,
    // Clear default if we deleted the default preset
    ...(currentPrefs.defaultImagePresetId === presetId ? { defaultImagePresetId: undefined } : {}),
  };

  updateSessionPreferences(sessionId, updatedPrefs);
  return true;
}

export function setDefaultImagePreset(
  sessionId: string,
  presetId: string
): boolean {
  const currentPrefs = getSessionPreferences(sessionId) || {} as GamePreferences;
  const presets = currentPrefs.imageGenerationPresets || [];

  // Verify preset exists
  const preset = presets.find(p => p.id === presetId);
  if (!preset) return false;

  // Update all presets to unmark default, then mark the selected one
  const updatedPresets = presets.map(p => ({
    ...p,
    isDefault: p.id === presetId,
  }));

  const updatedPrefs: GamePreferences = {
    ...currentPrefs,
    imageGenerationPresets: updatedPresets,
    defaultImagePresetId: presetId,
  };

  updateSessionPreferences(sessionId, updatedPrefs);
  return true;
}

// Helper function to deep merge preferences
function deepMergePreferences(
  current: ImageGenerationPreferences,
  updates: Partial<ImageGenerationPreferences>
): ImageGenerationPreferences {
  return {
    ...current,
    ...updates,
    // Deep merge for nested objects
    defaultStyle: updates.defaultStyle !== undefined ? {
      ...current.defaultStyle,
      ...updates.defaultStyle,
    } : current.defaultStyle,
    comfyui: updates.comfyui !== undefined ? {
      ...current.comfyui,
      ...updates.comfyui,
      samplerSettings: {
        ...current.comfyui?.samplerSettings,
        ...updates.comfyui?.samplerSettings,
      },
      workflows: {
        ...current.comfyui?.workflows,
        ...updates.comfyui?.workflows,
      },
    } : current.comfyui,
    dalle: updates.dalle !== undefined ? {
      ...current.dalle,
      ...updates.dalle,
    } : current.dalle,
    midjourney: updates.midjourney !== undefined ? {
      ...current.midjourney,
      ...updates.midjourney,
    } : current.midjourney,
    sdxl: updates.sdxl !== undefined ? {
      ...current.sdxl,
      ...updates.sdxl,
    } : current.sdxl,
    flux: updates.flux !== undefined ? {
      ...current.flux,
      ...updates.flux,
    } : current.flux,
    defaults: updates.defaults !== undefined ? {
      ...current.defaults,
      ...updates.defaults,
      framing: {
        ...current.defaults?.framing,
        ...updates.defaults?.framing,
      },
    } : current.defaults,
    consistency: updates.consistency !== undefined ? {
      ...current.consistency,
      ...updates.consistency,
    } : current.consistency,
  };
}
