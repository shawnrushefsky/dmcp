import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import { safeJsonParse } from "../utils/json.js";
import type { Character, CharacterStatus, VoiceDescription, ImageGeneration } from "../types/index.js";

export function createCharacter(params: {
  sessionId: string;
  name: string;
  isPlayer: boolean;
  attributes?: Record<string, number>;
  skills?: Record<string, number>;
  status?: Partial<CharacterStatus>;
  locationId?: string;
  notes?: string;
  voice?: VoiceDescription;
  imageGen?: ImageGeneration;
}): Character {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  const status: CharacterStatus = {
    health: 100,
    maxHealth: 100,
    conditions: [],
    experience: 0,
    level: 1,
    ...params.status,
  };

  const stmt = db.prepare(`
    INSERT INTO characters (id, session_id, name, is_player, attributes, skills, status, location_id, notes, voice, image_gen, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    params.sessionId,
    params.name,
    params.isPlayer ? 1 : 0,
    JSON.stringify(params.attributes || {}),
    JSON.stringify(params.skills || {}),
    JSON.stringify(status),
    params.locationId || null,
    params.notes || "",
    params.voice ? JSON.stringify(params.voice) : null,
    params.imageGen ? JSON.stringify(params.imageGen) : null,
    now
  );

  return {
    id,
    sessionId: params.sessionId,
    name: params.name,
    isPlayer: params.isPlayer,
    attributes: params.attributes || {},
    skills: params.skills || {},
    status,
    locationId: params.locationId || null,
    notes: params.notes || "",
    voice: params.voice || null,
    imageGen: params.imageGen || null,
    createdAt: now,
  };
}

export function getCharacter(id: string): Character | null {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM characters WHERE id = ?`);
  const row = stmt.get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    name: row.name as string,
    isPlayer: (row.is_player as number) === 1,
    attributes: safeJsonParse<Record<string, number>>(row.attributes as string, {}),
    skills: safeJsonParse<Record<string, number>>(row.skills as string, {}),
    status: safeJsonParse<CharacterStatus>(row.status as string, { health: 0, maxHealth: 0, conditions: [], experience: 0, level: 1 }),
    locationId: row.location_id as string | null,
    notes: row.notes as string,
    voice: row.voice ? safeJsonParse<VoiceDescription>(row.voice as string, null as unknown as VoiceDescription) : null,
    imageGen: row.image_gen ? safeJsonParse<ImageGeneration>(row.image_gen as string, null as unknown as ImageGeneration) : null,
    createdAt: row.created_at as string,
  };
}

export function updateCharacter(
  id: string,
  updates: {
    name?: string;
    attributes?: Record<string, number>;
    skills?: Record<string, number>;
    status?: Partial<CharacterStatus>;
    locationId?: string | null;
    notes?: string;
    voice?: VoiceDescription | null;
    imageGen?: ImageGeneration | null;
  }
): Character | null {
  const db = getDatabase();
  const current = getCharacter(id);
  if (!current) return null;

  const newName = updates.name ?? current.name;
  const newAttributes = updates.attributes
    ? { ...current.attributes, ...updates.attributes }
    : current.attributes;
  const newSkills = updates.skills
    ? { ...current.skills, ...updates.skills }
    : current.skills;
  const newStatus = updates.status
    ? { ...current.status, ...updates.status }
    : current.status;
  const newLocationId =
    updates.locationId !== undefined ? updates.locationId : current.locationId;
  const newNotes = updates.notes ?? current.notes;
  const newVoice =
    updates.voice !== undefined ? updates.voice : current.voice;
  const newImageGen =
    updates.imageGen !== undefined ? updates.imageGen : current.imageGen;

  const stmt = db.prepare(`
    UPDATE characters
    SET name = ?, attributes = ?, skills = ?, status = ?, location_id = ?, notes = ?, voice = ?, image_gen = ?
    WHERE id = ?
  `);

  stmt.run(
    newName,
    JSON.stringify(newAttributes),
    JSON.stringify(newSkills),
    JSON.stringify(newStatus),
    newLocationId,
    newNotes,
    newVoice ? JSON.stringify(newVoice) : null,
    newImageGen ? JSON.stringify(newImageGen) : null,
    id
  );

  return {
    ...current,
    name: newName,
    attributes: newAttributes,
    skills: newSkills,
    status: newStatus,
    locationId: newLocationId,
    notes: newNotes,
    voice: newVoice,
    imageGen: newImageGen,
  };
}

export function deleteCharacter(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`DELETE FROM characters WHERE id = ?`);
  const result = stmt.run(id);
  return result.changes > 0;
}

export function listCharacters(
  sessionId: string,
  filter?: {
    isPlayer?: boolean;
    locationId?: string;
  }
): Character[] {
  const db = getDatabase();
  let query = `SELECT * FROM characters WHERE session_id = ?`;
  const params: (string | number)[] = [sessionId];

  if (filter?.isPlayer !== undefined) {
    query += ` AND is_player = ?`;
    params.push(filter.isPlayer ? 1 : 0);
  }

  if (filter?.locationId !== undefined) {
    query += ` AND location_id = ?`;
    params.push(filter.locationId);
  }

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    name: row.name as string,
    isPlayer: (row.is_player as number) === 1,
    attributes: safeJsonParse<Record<string, number>>(row.attributes as string, {}),
    skills: safeJsonParse<Record<string, number>>(row.skills as string, {}),
    status: safeJsonParse<CharacterStatus>(row.status as string, { health: 0, maxHealth: 0, conditions: [], experience: 0, level: 1 }),
    locationId: row.location_id as string | null,
    notes: row.notes as string,
    voice: row.voice ? safeJsonParse<VoiceDescription>(row.voice as string, null as unknown as VoiceDescription) : null,
    imageGen: row.image_gen ? safeJsonParse<ImageGeneration>(row.image_gen as string, null as unknown as ImageGeneration) : null,
    createdAt: row.created_at as string,
  }));
}

/**
 * Find a character by name (case-insensitive, fuzzy match).
 * Returns the best match or null if no reasonable match found.
 */
export function getCharacterByName(
  sessionId: string,
  name: string
): Character | null {
  const db = getDatabase();
  const searchName = name.toLowerCase().trim();

  // First try exact match (case-insensitive)
  const exactMatch = db.prepare(
    `SELECT * FROM characters WHERE session_id = ? AND LOWER(name) = ?`
  ).get(sessionId, searchName) as Record<string, unknown> | undefined;

  if (exactMatch) {
    return mapRowToCharacter(exactMatch);
  }

  // Try contains match
  const containsMatch = db.prepare(
    `SELECT * FROM characters WHERE session_id = ? AND LOWER(name) LIKE ?`
  ).get(sessionId, `%${searchName}%`) as Record<string, unknown> | undefined;

  if (containsMatch) {
    return mapRowToCharacter(containsMatch);
  }

  // Try matching just the last word (e.g., "Gannik" matches "Master Gannik")
  const words = searchName.split(/\s+/);
  if (words.length > 0) {
    const lastName = words[words.length - 1];
    const lastNameMatch = db.prepare(
      `SELECT * FROM characters WHERE session_id = ? AND LOWER(name) LIKE ?`
    ).get(sessionId, `%${lastName}%`) as Record<string, unknown> | undefined;

    if (lastNameMatch) {
      return mapRowToCharacter(lastNameMatch);
    }
  }

  return null;
}

// Helper function to map database row to Character
function mapRowToCharacter(row: Record<string, unknown>): Character {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    name: row.name as string,
    isPlayer: (row.is_player as number) === 1,
    attributes: safeJsonParse<Record<string, number>>(row.attributes as string, {}),
    skills: safeJsonParse<Record<string, number>>(row.skills as string, {}),
    status: safeJsonParse<CharacterStatus>(row.status as string, { health: 0, maxHealth: 0, conditions: [], experience: 0, level: 1 }),
    locationId: row.location_id as string | null,
    notes: row.notes as string,
    voice: row.voice ? safeJsonParse<VoiceDescription>(row.voice as string, null as unknown as VoiceDescription) : null,
    imageGen: row.image_gen ? safeJsonParse<ImageGeneration>(row.image_gen as string, null as unknown as ImageGeneration) : null,
    createdAt: row.created_at as string,
  };
}

export function moveCharacter(
  characterId: string,
  locationId: string | null
): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`UPDATE characters SET location_id = ? WHERE id = ?`);
  const result = stmt.run(locationId, characterId);
  return result.changes > 0;
}

/**
 * Modify a character's health - damage or heal in a single call.
 * Use mode: "damage" to reduce health, mode: "heal" to restore health.
 */
export function modifyHealth(
  characterId: string,
  params: { mode: "damage" | "heal"; amount: number }
): { character: Character; previousHealth: number; newHealth: number } | null {
  const character = getCharacter(characterId);
  if (!character) return null;

  const previousHealth = character.status.health;
  let newHealth: number;

  if (params.mode === "damage") {
    newHealth = Math.max(0, character.status.health - params.amount);
  } else {
    newHealth = Math.min(character.status.maxHealth, character.status.health + params.amount);
  }

  const updated = updateCharacter(characterId, {
    status: { health: newHealth },
  });

  if (!updated) return null;

  return { character: updated, previousHealth, newHealth };
}

export function addCondition(
  characterId: string,
  condition: string
): Character | null {
  const character = getCharacter(characterId);
  if (!character) return null;

  if (!character.status.conditions.includes(condition)) {
    return updateCharacter(characterId, {
      status: {
        conditions: [...character.status.conditions, condition],
      },
    });
  }
  return character;
}

export function removeCondition(
  characterId: string,
  condition: string
): Character | null {
  const character = getCharacter(characterId);
  if (!character) return null;

  return updateCharacter(characterId, {
    status: {
      conditions: character.status.conditions.filter((c) => c !== condition),
    },
  });
}

/**
 * Modify conditions on a character - add or remove in a single call.
 * This consolidated function reduces the number of tool calls needed.
 */
export function modifyConditions(
  characterId: string,
  params: {
    add?: string[];
    remove?: string[];
  }
): { character: Character; added: string[]; removed: string[] } | null {
  const character = getCharacter(characterId);
  if (!character) return null;

  let conditions = [...character.status.conditions];
  const added: string[] = [];
  const removed: string[] = [];

  // Remove conditions first (so we can re-add if needed)
  if (params.remove) {
    for (const condition of params.remove) {
      if (conditions.includes(condition)) {
        conditions = conditions.filter((c) => c !== condition);
        removed.push(condition);
      }
    }
  }

  // Add new conditions
  if (params.add) {
    for (const condition of params.add) {
      if (!conditions.includes(condition)) {
        conditions.push(condition);
        added.push(condition);
      }
    }
  }

  const updated = updateCharacter(characterId, {
    status: { conditions },
  });

  if (!updated) return null;

  return { character: updated, added, removed };
}

export interface CharacterSheetData {
  character: Character;
  locationName: string | null;
  inventory: Array<{ name: string; type?: string }>;
}

export function renderCharacterSheet(characterId: string): CharacterSheetData | null {
  const db = getDatabase();
  const character = getCharacter(characterId);
  if (!character) return null;

  // Get location name
  let locationName: string | null = null;
  if (character.locationId) {
    const loc = db.prepare(`SELECT name FROM locations WHERE id = ?`).get(character.locationId) as { name: string } | undefined;
    locationName = loc?.name || null;
  }

  // Get inventory
  const items = db.prepare(`SELECT name, properties FROM items WHERE owner_id = ? AND owner_type = 'character'`)
    .all(characterId) as Array<{ name: string; properties: string }>;
  const inventory = items.map(item => {
    const props = safeJsonParse<{ type?: string }>(item.properties, {});
    return { name: item.name, type: props.type };
  });

  return {
    character,
    locationName,
    inventory,
  };
}

