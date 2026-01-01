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

export interface CharacterSheetData {
  character: Character;
  locationName: string | null;
  inventory: Array<{ name: string; type?: string }>;
  ascii: string;
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

  // Build ASCII sheet
  const ascii = buildAsciiSheet(character, locationName, inventory);

  return {
    character,
    locationName,
    inventory,
    ascii,
  };
}

function buildAsciiSheet(
  char: Character,
  locationName: string | null,
  inventory: Array<{ name: string; type?: string }>
): string {
  const lines: string[] = [];
  const width = 50;
  const border = "═".repeat(width - 2);

  // Helper functions
  const centerText = (text: string, w: number): string => {
    const pad = Math.max(0, w - text.length);
    const left = Math.floor(pad / 2);
    const right = pad - left;
    return " ".repeat(left) + text + " ".repeat(right);
  };

  const padRight = (text: string, w: number): string => {
    return text.slice(0, w).padEnd(w);
  };

  // Header
  lines.push(`╔${border}╗`);
  lines.push(`║${centerText(char.name.toUpperCase(), width - 2)}║`);
  lines.push(`║${centerText(char.isPlayer ? "[ PLAYER CHARACTER ]" : "[ NPC ]", width - 2)}║`);
  lines.push(`╠${border}╣`);

  // Health bar
  const healthPercent = char.status.maxHealth > 0
    ? char.status.health / char.status.maxHealth
    : 0;
  const healthBarWidth = 30;
  const filledBars = Math.round(healthPercent * healthBarWidth);
  const emptyBars = healthBarWidth - filledBars;
  const healthBar = "█".repeat(filledBars) + "░".repeat(emptyBars);
  const healthText = `HP: ${char.status.health}/${char.status.maxHealth}`;
  lines.push(`║ ${padRight(healthText, 15)} [${healthBar}] ║`);

  // Level & XP
  const levelXp = `Level: ${char.status.level}  XP: ${char.status.experience}`;
  lines.push(`║ ${padRight(levelXp, width - 4)} ║`);

  // Location
  if (locationName) {
    lines.push(`║ Location: ${padRight(locationName, width - 14)} ║`);
  }

  // Conditions
  if (char.status.conditions.length > 0) {
    lines.push(`╟${"─".repeat(width - 2)}╢`);
    lines.push(`║ ${padRight("CONDITIONS:", width - 4)} ║`);
    const condStr = char.status.conditions.join(", ");
    // Word wrap conditions if needed
    const condLines = wordWrap(condStr, width - 6);
    for (const line of condLines) {
      lines.push(`║   ${padRight(line, width - 6)} ║`);
    }
  }

  // Attributes
  const attrs = Object.entries(char.attributes);
  if (attrs.length > 0) {
    lines.push(`╟${"─".repeat(width - 2)}╢`);
    lines.push(`║ ${padRight("ATTRIBUTES", width - 4)} ║`);

    // Display in two columns
    for (let i = 0; i < attrs.length; i += 2) {
      const col1 = `${attrs[i][0]}: ${attrs[i][1]}`;
      const col2 = attrs[i + 1] ? `${attrs[i + 1][0]}: ${attrs[i + 1][1]}` : "";
      lines.push(`║   ${padRight(col1, 20)} ${padRight(col2, width - 27)} ║`);
    }
  }

  // Skills
  const skills = Object.entries(char.skills);
  if (skills.length > 0) {
    lines.push(`╟${"─".repeat(width - 2)}╢`);
    lines.push(`║ ${padRight("SKILLS", width - 4)} ║`);

    for (let i = 0; i < skills.length; i += 2) {
      const col1 = `${skills[i][0]}: ${skills[i][1]}`;
      const col2 = skills[i + 1] ? `${skills[i + 1][0]}: ${skills[i + 1][1]}` : "";
      lines.push(`║   ${padRight(col1, 20)} ${padRight(col2, width - 27)} ║`);
    }
  }

  // Inventory
  if (inventory.length > 0) {
    lines.push(`╟${"─".repeat(width - 2)}╢`);
    lines.push(`║ ${padRight("INVENTORY", width - 4)} ║`);

    for (const item of inventory.slice(0, 8)) { // Limit to 8 items for display
      const itemText = item.type ? `• ${item.name} (${item.type})` : `• ${item.name}`;
      lines.push(`║   ${padRight(itemText, width - 6)} ║`);
    }
    if (inventory.length > 8) {
      lines.push(`║   ${padRight(`... and ${inventory.length - 8} more items`, width - 6)} ║`);
    }
  }

  // Notes (truncated)
  if (char.notes && char.notes.trim()) {
    lines.push(`╟${"─".repeat(width - 2)}╢`);
    lines.push(`║ ${padRight("NOTES", width - 4)} ║`);
    const noteLines = wordWrap(char.notes, width - 6).slice(0, 3);
    for (const line of noteLines) {
      lines.push(`║   ${padRight(line, width - 6)} ║`);
    }
    if (wordWrap(char.notes, width - 6).length > 3) {
      lines.push(`║   ${padRight("...", width - 6)} ║`);
    }
  }

  // Footer
  lines.push(`╚${border}╝`);

  return lines.join("\n");
}

function wordWrap(text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxWidth) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word.slice(0, maxWidth);
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}
