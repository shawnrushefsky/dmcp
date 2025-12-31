import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import type { Tag } from "../types/index.js";

export function addTag(params: {
  sessionId: string;
  entityId: string;
  entityType: string;
  tag: string;
  color?: string;
  notes?: string;
}): Tag {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  // Check if tag already exists (unique constraint)
  const existing = db.prepare(`
    SELECT id FROM tags
    WHERE session_id = ? AND entity_id = ? AND entity_type = ? AND tag = ?
  `).get(params.sessionId, params.entityId, params.entityType, params.tag);

  if (existing) {
    // Update existing tag
    db.prepare(`
      UPDATE tags SET color = ?, notes = ? WHERE id = ?
    `).run(params.color || null, params.notes || "", (existing as { id: string }).id);

    return getTag((existing as { id: string }).id)!;
  }

  db.prepare(`
    INSERT INTO tags (id, session_id, entity_id, entity_type, tag, color, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.sessionId,
    params.entityId,
    params.entityType,
    params.tag,
    params.color || null,
    params.notes || "",
    now
  );

  return {
    id,
    sessionId: params.sessionId,
    entityId: params.entityId,
    entityType: params.entityType,
    tag: params.tag,
    color: params.color || null,
    notes: params.notes || "",
    createdAt: now,
  };
}

export function getTag(id: string): Tag | null {
  const db = getDatabase();
  const row = db.prepare(`SELECT * FROM tags WHERE id = ?`).get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    entityId: row.entity_id as string,
    entityType: row.entity_type as string,
    tag: row.tag as string,
    color: row.color as string | null,
    notes: row.notes as string,
    createdAt: row.created_at as string,
  };
}

export function removeTag(params: {
  sessionId: string;
  entityId: string;
  entityType: string;
  tag: string;
}): boolean {
  const db = getDatabase();
  const result = db.prepare(`
    DELETE FROM tags
    WHERE session_id = ? AND entity_id = ? AND entity_type = ? AND tag = ?
  `).run(params.sessionId, params.entityId, params.entityType, params.tag);

  return result.changes > 0;
}

export interface TagCount {
  tag: string;
  count: number;
  color: string | null;
}

export function listTags(sessionId: string): TagCount[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT tag, color, COUNT(*) as count
    FROM tags
    WHERE session_id = ?
    GROUP BY tag
    ORDER BY count DESC, tag ASC
  `).all(sessionId) as Array<{ tag: string; color: string | null; count: number }>;

  return rows.map(row => ({
    tag: row.tag,
    count: row.count,
    color: row.color,
  }));
}

export function getEntityTags(entityId: string, entityType: string): Tag[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT * FROM tags WHERE entity_id = ? AND entity_type = ?
    ORDER BY tag
  `).all(entityId, entityType) as Record<string, unknown>[];

  return rows.map(row => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    entityId: row.entity_id as string,
    entityType: row.entity_type as string,
    tag: row.tag as string,
    color: row.color as string | null,
    notes: row.notes as string,
    createdAt: row.created_at as string,
  }));
}

export interface TaggedEntity {
  entityId: string;
  entityType: string;
  tag: Tag;
}

export function findByTag(sessionId: string, tag: string, entityType?: string): TaggedEntity[] {
  const db = getDatabase();

  let query = `SELECT * FROM tags WHERE session_id = ? AND tag = ?`;
  const params: string[] = [sessionId, tag];

  if (entityType) {
    query += ` AND entity_type = ?`;
    params.push(entityType);
  }

  query += ` ORDER BY entity_type, created_at`;

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  return rows.map(row => ({
    entityId: row.entity_id as string,
    entityType: row.entity_type as string,
    tag: {
      id: row.id as string,
      sessionId: row.session_id as string,
      entityId: row.entity_id as string,
      entityType: row.entity_type as string,
      tag: row.tag as string,
      color: row.color as string | null,
      notes: row.notes as string,
      createdAt: row.created_at as string,
    },
  }));
}

export function renameTag(sessionId: string, oldTag: string, newTag: string): number {
  const db = getDatabase();
  const result = db.prepare(`
    UPDATE tags SET tag = ? WHERE session_id = ? AND tag = ?
  `).run(newTag, sessionId, oldTag);

  return result.changes;
}

export function deleteTagById(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare(`DELETE FROM tags WHERE id = ?`).run(id);
  return result.changes > 0;
}
