import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import { safeJsonParse } from "../utils/json.js";
import type { Secret } from "../types/index.js";

export function createSecret(params: {
  sessionId: string;
  name: string;
  description: string;
  category?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  clues?: string[];
}): Secret {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO secrets (id, session_id, name, description, category, related_entity_id, related_entity_type, clues, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.sessionId,
    params.name,
    params.description,
    params.category || null,
    params.relatedEntityId || null,
    params.relatedEntityType || null,
    JSON.stringify(params.clues || []),
    now
  );

  return {
    id,
    sessionId: params.sessionId,
    name: params.name,
    description: params.description,
    category: params.category || null,
    relatedEntityId: params.relatedEntityId || null,
    relatedEntityType: params.relatedEntityType || null,
    revealedTo: [],
    isPublic: false,
    clues: params.clues || [],
    createdAt: now,
  };
}

export function getSecret(id: string): Secret | null {
  const db = getDatabase();
  const row = db.prepare(`SELECT * FROM secrets WHERE id = ?`).get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    name: row.name as string,
    description: row.description as string,
    category: row.category as string | null,
    relatedEntityId: row.related_entity_id as string | null,
    relatedEntityType: row.related_entity_type as string | null,
    revealedTo: safeJsonParse<string[]>(row.revealed_to as string || "[]", []),
    isPublic: (row.is_public as number) === 1,
    clues: safeJsonParse<string[]>(row.clues as string || "[]", []),
    createdAt: row.created_at as string,
  };
}

export function updateSecret(
  id: string,
  updates: {
    name?: string;
    description?: string;
    category?: string | null;
    relatedEntityId?: string | null;
    relatedEntityType?: string | null;
  }
): Secret | null {
  const db = getDatabase();
  const current = getSecret(id);
  if (!current) return null;

  const newName = updates.name ?? current.name;
  const newDescription = updates.description ?? current.description;
  const newCategory = updates.category !== undefined ? updates.category : current.category;
  const newRelatedId = updates.relatedEntityId !== undefined ? updates.relatedEntityId : current.relatedEntityId;
  const newRelatedType = updates.relatedEntityType !== undefined ? updates.relatedEntityType : current.relatedEntityType;

  db.prepare(`
    UPDATE secrets
    SET name = ?, description = ?, category = ?, related_entity_id = ?, related_entity_type = ?
    WHERE id = ?
  `).run(newName, newDescription, newCategory, newRelatedId, newRelatedType, id);

  return {
    ...current,
    name: newName,
    description: newDescription,
    category: newCategory,
    relatedEntityId: newRelatedId,
    relatedEntityType: newRelatedType,
  };
}

export function deleteSecret(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare(`DELETE FROM secrets WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function listSecrets(
  sessionId: string,
  filter?: {
    category?: string;
    relatedEntityId?: string;
    isPublic?: boolean;
    knownBy?: string;  // Character ID
  }
): Secret[] {
  const db = getDatabase();

  let query = `SELECT * FROM secrets WHERE session_id = ?`;
  const params: (string | number)[] = [sessionId];

  if (filter?.category) {
    query += ` AND category = ?`;
    params.push(filter.category);
  }

  if (filter?.relatedEntityId) {
    query += ` AND related_entity_id = ?`;
    params.push(filter.relatedEntityId);
  }

  if (filter?.isPublic !== undefined) {
    query += ` AND is_public = ?`;
    params.push(filter.isPublic ? 1 : 0);
  }

  query += ` ORDER BY name`;

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  let secrets = rows.map(row => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    name: row.name as string,
    description: row.description as string,
    category: row.category as string | null,
    relatedEntityId: row.related_entity_id as string | null,
    relatedEntityType: row.related_entity_type as string | null,
    revealedTo: safeJsonParse<string[]>(row.revealed_to as string || "[]", []),
    isPublic: (row.is_public as number) === 1,
    clues: safeJsonParse<string[]>(row.clues as string || "[]", []),
    createdAt: row.created_at as string,
  }));

  // Filter by knownBy if specified
  if (filter?.knownBy) {
    secrets = secrets.filter(s => s.isPublic || s.revealedTo.includes(filter.knownBy!));
  }

  return secrets;
}

export function revealSecret(secretId: string, characterIds: string[]): Secret | null {
  const db = getDatabase();
  const secret = getSecret(secretId);
  if (!secret) return null;

  const newRevealedTo = [...new Set([...secret.revealedTo, ...characterIds])];

  db.prepare(`UPDATE secrets SET revealed_to = ? WHERE id = ?`)
    .run(JSON.stringify(newRevealedTo), secretId);

  return { ...secret, revealedTo: newRevealedTo };
}

export function makePublic(secretId: string): Secret | null {
  const db = getDatabase();
  const secret = getSecret(secretId);
  if (!secret) return null;

  db.prepare(`UPDATE secrets SET is_public = 1 WHERE id = ?`).run(secretId);

  return { ...secret, isPublic: true };
}

export function addClue(secretId: string, clue: string): Secret | null {
  const db = getDatabase();
  const secret = getSecret(secretId);
  if (!secret) return null;

  const newClues = [...secret.clues, clue];

  db.prepare(`UPDATE secrets SET clues = ? WHERE id = ?`)
    .run(JSON.stringify(newClues), secretId);

  return { ...secret, clues: newClues };
}

export function removeClue(secretId: string, index: number): Secret | null {
  const db = getDatabase();
  const secret = getSecret(secretId);
  if (!secret) return null;

  if (index < 0 || index >= secret.clues.length) {
    return null;
  }

  const newClues = secret.clues.filter((_, i) => i !== index);

  db.prepare(`UPDATE secrets SET clues = ? WHERE id = ?`)
    .run(JSON.stringify(newClues), secretId);

  return { ...secret, clues: newClues };
}

export interface CharacterKnowledge {
  characterId: string;
  knownSecrets: Secret[];
  cluesFound: Array<{ secret: Secret; clueIndex: number; clue: string }>;
}

export function getCharacterKnowledge(sessionId: string, characterId: string): CharacterKnowledge {
  const allSecrets = listSecrets(sessionId);

  const knownSecrets = allSecrets.filter(s => s.isPublic || s.revealedTo.includes(characterId));

  // For now, clues are available to everyone who knows the secret
  // Could be extended to track which specific clues each character has found
  const cluesFound: Array<{ secret: Secret; clueIndex: number; clue: string }> = [];
  for (const secret of knownSecrets) {
    for (let i = 0; i < secret.clues.length; i++) {
      cluesFound.push({ secret, clueIndex: i, clue: secret.clues[i] });
    }
  }

  return {
    characterId,
    knownSecrets,
    cluesFound,
  };
}

export function checkKnowsSecret(secretId: string, characterId: string): boolean {
  const secret = getSecret(secretId);
  if (!secret) return false;

  return secret.isPublic || secret.revealedTo.includes(characterId);
}
