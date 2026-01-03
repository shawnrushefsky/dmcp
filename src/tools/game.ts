import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import { safeJsonParse } from "../utils/json.js";
import type { Game, RuleSystem, GamePreferences, ImageGenerationPreferences, ImageGenerationPreset, ImagePromptTemplate } from "../types/index.js";

export function createGame(params: {
  name: string;
  setting: string;
  style: string;
  preferences?: GamePreferences;
}): Game {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO games (id, name, setting, style, rules, preferences, current_location_id, created_at, updated_at)
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
    faviconImageId: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function loadGame(id: string): Game | null {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM games WHERE id = ?`);
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
    faviconImageId: row.favicon_image_id as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function listGames(): Game[] {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM games ORDER BY updated_at DESC`);
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
    faviconImageId: row.favicon_image_id as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

// Lightweight version that omits rules and preferences for listing
export function listGameSummaries(): import("../types/index.js").GameSummary[] {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT id, name, setting, style, title_image_id, favicon_image_id, created_at, updated_at FROM games ORDER BY updated_at DESC`);
  const rows = stmt.all() as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    setting: row.setting as string,
    style: row.style as string,
    titleImageId: row.title_image_id as string | null,
    faviconImageId: row.favicon_image_id as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export function updateGamePreferences(
  gameId: string,
  preferences: GamePreferences
): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE games SET preferences = ?, updated_at = ? WHERE id = ?
  `);
  const result = stmt.run(JSON.stringify(preferences), now, gameId);
  return result.changes > 0;
}

export function getGamePreferences(gameId: string): GamePreferences | null {
  const game = loadGame(gameId);
  return game?.preferences || null;
}

export function deleteGame(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`DELETE FROM games WHERE id = ?`);
  const result = stmt.run(id);
  return result.changes > 0;
}

export function updateGameLocation(
  gameId: string,
  locationId: string | null
): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE games SET current_location_id = ?, updated_at = ? WHERE id = ?
  `);
  const result = stmt.run(locationId, now, gameId);
  return result.changes > 0;
}

export function updateGame(
  gameId: string,
  updates: { name?: string; setting?: string; style?: string }
): Game | null {
  const db = getDatabase();
  const game = loadGame(gameId);
  if (!game) return null;

  const now = new Date().toISOString();
  const newName = updates.name ?? game.name;
  const newSetting = updates.setting ?? game.setting;
  const newStyle = updates.style ?? game.style;

  const stmt = db.prepare(`
    UPDATE games SET name = ?, setting = ?, style = ?, updated_at = ? WHERE id = ?
  `);
  stmt.run(newName, newSetting, newStyle, now, gameId);

  return {
    ...game,
    name: newName,
    setting: newSetting,
    style: newStyle,
    updatedAt: now,
  };
}

export function setGameTitleImage(
  gameId: string,
  imageId: string | null
): Game | null {
  const db = getDatabase();
  const game = loadGame(gameId);
  if (!game) return null;

  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE games SET title_image_id = ?, updated_at = ? WHERE id = ?
  `);
  stmt.run(imageId, now, gameId);

  return {
    ...game,
    titleImageId: imageId,
    updatedAt: now,
  };
}

export function setGameFavicon(
  gameId: string,
  imageId: string | null
): Game | null {
  const db = getDatabase();
  const game = loadGame(gameId);
  if (!game) return null;

  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE games SET favicon_image_id = ?, updated_at = ? WHERE id = ?
  `);
  stmt.run(imageId, now, gameId);

  return {
    ...game,
    faviconImageId: imageId,
    updatedAt: now,
  };
}

export interface GameMenuResult {
  hasExistingGames: boolean;
  games: Array<{
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
  const games = listGames();

  if (games.length === 0) {
    return {
      hasExistingGames: false,
      games: [],
      instruction: "No existing games found. Start the new game interview process directly using get_interview_template.",
      visualizationTip: "Enhance the experience with visuals: use render_map for world maps, and use image generation for character portraits, items, and scene illustrations.",
    };
  }

  // Get additional info for each game
  const gamesWithInfo = games.map((game) => {
    const charCount = db
      .prepare(`SELECT COUNT(*) as count FROM characters WHERE game_id = ?`)
      .get(game.id) as { count: number };
    const locCount = db
      .prepare(`SELECT COUNT(*) as count FROM locations WHERE game_id = ?`)
      .get(game.id) as { count: number };

    return {
      id: game.id,
      name: game.name,
      setting: game.setting,
      style: game.style,
      lastPlayed: game.updatedAt,
      characterCount: charCount.count,
      locationCount: locCount.count,
    };
  });

  return {
    hasExistingGames: true,
    games: gamesWithInfo,
    instruction: "Present these existing games as choices (most recent first), with an option to start a new game. Use present_choices or ask the player which game to continue.",
    visualizationTip: "Enhance the experience with visuals: use render_map for world maps, and create ASCII art for character portraits, items, scene illustrations, and combat layouts when image generation isn't available.",
  };
}

export function getGameState(gameId: string): {
  game: Game;
  characterCount: number;
  locationCount: number;
  activeQuests: number;
  activeCombat: boolean;
} | null {
  const db = getDatabase();

  const game = loadGame(gameId);
  if (!game) return null;

  const charCount = db
    .prepare(`SELECT COUNT(*) as count FROM characters WHERE game_id = ?`)
    .get(gameId) as { count: number };
  const locCount = db
    .prepare(`SELECT COUNT(*) as count FROM locations WHERE game_id = ?`)
    .get(gameId) as { count: number };
  const questCount = db
    .prepare(
      `SELECT COUNT(*) as count FROM quests WHERE game_id = ? AND status = 'active'`
    )
    .get(gameId) as { count: number };
  const combat = db
    .prepare(
      `SELECT COUNT(*) as count FROM combats WHERE game_id = ? AND status = 'active'`
    )
    .get(gameId) as { count: number };

  return {
    game,
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
  gameId: string
): ImageGenerationPreset[] {
  const preferences = getGamePreferences(gameId);
  return preferences?.imageGenerationPresets || [];
}

export function getImageGenerationPreset(
  gameId: string,
  presetId: string
): ImageGenerationPreset | null {
  const presets = listImageGenerationPresets(gameId);
  return presets.find(p => p.id === presetId) || null;
}

export function getDefaultImagePreset(
  gameId: string
): ImageGenerationPreset | null {
  const preferences = getGamePreferences(gameId);
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
  gameId: string,
  params: {
    name: string;
    description?: string;
    entityTypes?: ("character" | "location" | "item" | "scene" | "faction")[];
    isDefault?: boolean;
    config: ImageGenerationPreferences;
  }
): ImageGenerationPreset {
  const currentPrefs = getGamePreferences(gameId) || {} as GamePreferences;
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

  updateGamePreferences(gameId, updatedPrefs);
  return newPreset;
}

export function updateImageGenerationPreset(
  gameId: string,
  presetId: string,
  updates: {
    name?: string;
    description?: string;
    entityTypes?: ("character" | "location" | "item" | "scene" | "faction")[];
    isDefault?: boolean;
    config?: Partial<ImageGenerationPreferences>;
  }
): ImageGenerationPreset | null {
  const currentPrefs = getGamePreferences(gameId) || {} as GamePreferences;
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

  updateGamePreferences(gameId, updatedPrefs);
  return updatedPreset;
}

export function deleteImageGenerationPreset(
  gameId: string,
  presetId: string
): boolean {
  const currentPrefs = getGamePreferences(gameId) || {} as GamePreferences;
  const presets = currentPrefs.imageGenerationPresets || [];

  const filteredPresets = presets.filter(p => p.id !== presetId);
  if (filteredPresets.length === presets.length) return false; // Not found

  const updatedPrefs: GamePreferences = {
    ...currentPrefs,
    imageGenerationPresets: filteredPresets,
    // Clear default if we deleted the default preset
    ...(currentPrefs.defaultImagePresetId === presetId ? { defaultImagePresetId: undefined } : {}),
  };

  updateGamePreferences(gameId, updatedPrefs);
  return true;
}

export function setDefaultImagePreset(
  gameId: string,
  presetId: string
): boolean {
  const currentPrefs = getGamePreferences(gameId) || {} as GamePreferences;
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

  updateGamePreferences(gameId, updatedPrefs);
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

// ============================================================================
// Image Prompt Templates - Template-based prompt building
// ============================================================================

export function listImagePromptTemplates(
  gameId: string
): ImagePromptTemplate[] {
  const preferences = getGamePreferences(gameId);
  return preferences?.imagePromptTemplates || [];
}

export function getImagePromptTemplate(
  gameId: string,
  templateId: string
): ImagePromptTemplate | null {
  const templates = listImagePromptTemplates(gameId);
  return templates.find(t => t.id === templateId) || null;
}

export function getDefaultImagePromptTemplate(
  gameId: string,
  entityType: "character" | "location" | "item" | "faction"
): ImagePromptTemplate | null {
  const templates = listImagePromptTemplates(gameId);
  const entityTemplates = templates.filter(t => t.entityType === entityType);

  if (entityTemplates.length === 0) return null;

  // First try to find one marked as default
  const defaultTemplate = entityTemplates.find(t => t.isDefault);
  if (defaultTemplate) return defaultTemplate;

  // Otherwise return highest priority
  return entityTemplates.sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];
}

export function createImagePromptTemplate(
  gameId: string,
  params: {
    name: string;
    description?: string;
    entityType: "character" | "location" | "item" | "faction";
    promptTemplate: string;
    negativePromptTemplate?: string;
    promptPrefix?: string;
    promptSuffix?: string;
    fieldAliases?: Record<string, string>;
    defaults?: Record<string, string>;
    priority?: number;
    isDefault?: boolean;
  }
): ImagePromptTemplate {
  const currentPrefs = getGamePreferences(gameId) || {} as GamePreferences;
  const templates = currentPrefs.imagePromptTemplates || [];

  const now = new Date().toISOString();
  const newTemplate: ImagePromptTemplate = {
    id: uuidv4(),
    name: params.name,
    description: params.description,
    entityType: params.entityType,
    promptTemplate: params.promptTemplate,
    negativePromptTemplate: params.negativePromptTemplate,
    promptPrefix: params.promptPrefix,
    promptSuffix: params.promptSuffix,
    fieldAliases: params.fieldAliases,
    defaults: params.defaults,
    priority: params.priority,
    isDefault: params.isDefault,
    createdAt: now,
    updatedAt: now,
  };

  // If this is marked as default, unmark others of same entity type
  let updatedTemplates = templates;
  if (params.isDefault) {
    updatedTemplates = templates.map(t =>
      t.entityType === params.entityType ? { ...t, isDefault: false } : t
    );
  }

  const updatedPrefs: GamePreferences = {
    ...currentPrefs,
    imagePromptTemplates: [...updatedTemplates, newTemplate],
  };

  updateGamePreferences(gameId, updatedPrefs);
  return newTemplate;
}

export function updateImagePromptTemplate(
  gameId: string,
  templateId: string,
  updates: {
    name?: string;
    description?: string;
    promptTemplate?: string;
    negativePromptTemplate?: string;
    promptPrefix?: string;
    promptSuffix?: string;
    fieldAliases?: Record<string, string>;
    defaults?: Record<string, string>;
    priority?: number;
    isDefault?: boolean;
  }
): ImagePromptTemplate | null {
  const currentPrefs = getGamePreferences(gameId) || {} as GamePreferences;
  const templates = currentPrefs.imagePromptTemplates || [];

  const templateIndex = templates.findIndex(t => t.id === templateId);
  if (templateIndex === -1) return null;

  const currentTemplate = templates[templateIndex];
  const now = new Date().toISOString();

  const updatedTemplate: ImagePromptTemplate = {
    ...currentTemplate,
    ...(updates.name !== undefined ? { name: updates.name } : {}),
    ...(updates.description !== undefined ? { description: updates.description } : {}),
    ...(updates.promptTemplate !== undefined ? { promptTemplate: updates.promptTemplate } : {}),
    ...(updates.negativePromptTemplate !== undefined ? { negativePromptTemplate: updates.negativePromptTemplate } : {}),
    ...(updates.promptPrefix !== undefined ? { promptPrefix: updates.promptPrefix } : {}),
    ...(updates.promptSuffix !== undefined ? { promptSuffix: updates.promptSuffix } : {}),
    ...(updates.fieldAliases !== undefined ? { fieldAliases: updates.fieldAliases } : {}),
    ...(updates.defaults !== undefined ? { defaults: updates.defaults } : {}),
    ...(updates.priority !== undefined ? { priority: updates.priority } : {}),
    ...(updates.isDefault !== undefined ? { isDefault: updates.isDefault } : {}),
    updatedAt: now,
  };

  // If this is marked as default, unmark others of same entity type
  let updatedTemplates = [...templates];
  if (updates.isDefault) {
    updatedTemplates = templates.map(t =>
      t.entityType === currentTemplate.entityType ? { ...t, isDefault: false } : t
    );
  }
  updatedTemplates[templateIndex] = updatedTemplate;

  const updatedPrefs: GamePreferences = {
    ...currentPrefs,
    imagePromptTemplates: updatedTemplates,
  };

  updateGamePreferences(gameId, updatedPrefs);
  return updatedTemplate;
}

export function deleteImagePromptTemplate(
  gameId: string,
  templateId: string
): boolean {
  const currentPrefs = getGamePreferences(gameId) || {} as GamePreferences;
  const templates = currentPrefs.imagePromptTemplates || [];

  const filteredTemplates = templates.filter(t => t.id !== templateId);
  if (filteredTemplates.length === templates.length) return false; // Not found

  const updatedPrefs: GamePreferences = {
    ...currentPrefs,
    imagePromptTemplates: filteredTemplates,
  };

  updateGamePreferences(gameId, updatedPrefs);
  return true;
}
