import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import type { Character, CharacterStatus, VoiceDescription } from "../types/index.js";

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
    INSERT INTO characters (id, session_id, name, is_player, attributes, skills, status, location_id, notes, voice, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    attributes: JSON.parse(row.attributes as string),
    skills: JSON.parse(row.skills as string),
    status: JSON.parse(row.status as string),
    locationId: row.location_id as string | null,
    notes: row.notes as string,
    voice: row.voice ? JSON.parse(row.voice as string) : null,
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

  const stmt = db.prepare(`
    UPDATE characters
    SET name = ?, attributes = ?, skills = ?, status = ?, location_id = ?, notes = ?, voice = ?
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
    attributes: JSON.parse(row.attributes as string),
    skills: JSON.parse(row.skills as string),
    status: JSON.parse(row.status as string),
    locationId: row.location_id as string | null,
    notes: row.notes as string,
    voice: row.voice ? JSON.parse(row.voice as string) : null,
    createdAt: row.created_at as string,
  }));
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

export function applyDamage(characterId: string, amount: number): Character | null {
  const character = getCharacter(characterId);
  if (!character) return null;

  const newHealth = Math.max(0, character.status.health - amount);
  return updateCharacter(characterId, {
    status: { health: newHealth },
  });
}

export function heal(characterId: string, amount: number): Character | null {
  const character = getCharacter(characterId);
  if (!character) return null;

  const newHealth = Math.min(
    character.status.maxHealth,
    character.status.health + amount
  );
  return updateCharacter(characterId, {
    status: { health: newHealth },
  });
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
