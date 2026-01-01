import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import { safeJsonParse } from "../utils/json.js";
import type { Note } from "../types/index.js";
import { getHistory } from "./narrative.js";

export function createNote(params: {
  sessionId: string;
  title: string;
  content: string;
  category?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  tags?: string[];
  pinned?: boolean;
}): Note {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO notes (id, session_id, title, content, category, pinned, related_entity_id, related_entity_type, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.sessionId,
    params.title,
    params.content,
    params.category || null,
    params.pinned ? 1 : 0,
    params.relatedEntityId || null,
    params.relatedEntityType || null,
    JSON.stringify(params.tags || []),
    now,
    now
  );

  return {
    id,
    sessionId: params.sessionId,
    title: params.title,
    content: params.content,
    category: params.category || null,
    pinned: params.pinned || false,
    relatedEntityId: params.relatedEntityId || null,
    relatedEntityType: params.relatedEntityType || null,
    tags: params.tags || [],
    createdAt: now,
    updatedAt: now,
  };
}

export function getNote(id: string): Note | null {
  const db = getDatabase();
  const row = db.prepare(`SELECT * FROM notes WHERE id = ?`).get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    title: row.title as string,
    content: row.content as string,
    category: row.category as string | null,
    pinned: (row.pinned as number) === 1,
    relatedEntityId: row.related_entity_id as string | null,
    relatedEntityType: row.related_entity_type as string | null,
    tags: safeJsonParse<string[]>(row.tags as string || "[]", []),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function updateNote(
  id: string,
  updates: {
    title?: string;
    content?: string;
    category?: string | null;
    relatedEntityId?: string | null;
    relatedEntityType?: string | null;
    tags?: string[];
  }
): Note | null {
  const db = getDatabase();
  const current = getNote(id);
  if (!current) return null;

  const now = new Date().toISOString();
  const newTitle = updates.title ?? current.title;
  const newContent = updates.content ?? current.content;
  const newCategory = updates.category !== undefined ? updates.category : current.category;
  const newRelatedId = updates.relatedEntityId !== undefined ? updates.relatedEntityId : current.relatedEntityId;
  const newRelatedType = updates.relatedEntityType !== undefined ? updates.relatedEntityType : current.relatedEntityType;
  const newTags = updates.tags ?? current.tags;

  db.prepare(`
    UPDATE notes
    SET title = ?, content = ?, category = ?, related_entity_id = ?, related_entity_type = ?, tags = ?, updated_at = ?
    WHERE id = ?
  `).run(newTitle, newContent, newCategory, newRelatedId, newRelatedType, JSON.stringify(newTags), now, id);

  return {
    ...current,
    title: newTitle,
    content: newContent,
    category: newCategory,
    relatedEntityId: newRelatedId,
    relatedEntityType: newRelatedType,
    tags: newTags,
    updatedAt: now,
  };
}

export function deleteNote(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare(`DELETE FROM notes WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function listNotes(
  sessionId: string,
  filter?: {
    category?: string;
    pinned?: boolean;
    tag?: string;
    relatedEntityId?: string;
  }
): Note[] {
  const db = getDatabase();

  let query = `SELECT * FROM notes WHERE session_id = ?`;
  const params: (string | number)[] = [sessionId];

  if (filter?.category) {
    query += ` AND category = ?`;
    params.push(filter.category);
  }

  if (filter?.pinned !== undefined) {
    query += ` AND pinned = ?`;
    params.push(filter.pinned ? 1 : 0);
  }

  if (filter?.relatedEntityId) {
    query += ` AND related_entity_id = ?`;
    params.push(filter.relatedEntityId);
  }

  query += ` ORDER BY pinned DESC, updated_at DESC`;

  let rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  // Filter by tag in memory (since it's a JSON array)
  if (filter?.tag) {
    rows = rows.filter(row => {
      const tags = safeJsonParse<string[]>(row.tags as string || "[]", []);
      return tags.includes(filter.tag!);
    });
  }

  return rows.map(row => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    title: row.title as string,
    content: row.content as string,
    category: row.category as string | null,
    pinned: (row.pinned as number) === 1,
    relatedEntityId: row.related_entity_id as string | null,
    relatedEntityType: row.related_entity_type as string | null,
    tags: safeJsonParse<string[]>(row.tags as string || "[]", []),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export function searchNotes(sessionId: string, query: string): Note[] {
  const db = getDatabase();
  const searchPattern = `%${query}%`;

  const rows = db.prepare(`
    SELECT * FROM notes
    WHERE session_id = ? AND (title LIKE ? OR content LIKE ?)
    ORDER BY pinned DESC, updated_at DESC
  `).all(sessionId, searchPattern, searchPattern) as Record<string, unknown>[];

  return rows.map(row => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    title: row.title as string,
    content: row.content as string,
    category: row.category as string | null,
    pinned: (row.pinned as number) === 1,
    relatedEntityId: row.related_entity_id as string | null,
    relatedEntityType: row.related_entity_type as string | null,
    tags: safeJsonParse<string[]>(row.tags as string || "[]", []),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export function pinNote(id: string, pinned: boolean): Note | null {
  const db = getDatabase();
  const note = getNote(id);
  if (!note) return null;

  const now = new Date().toISOString();

  db.prepare(`UPDATE notes SET pinned = ?, updated_at = ? WHERE id = ?`)
    .run(pinned ? 1 : 0, now, id);

  return { ...note, pinned, updatedAt: now };
}

export function addNoteTag(id: string, tag: string): Note | null {
  const db = getDatabase();
  const note = getNote(id);
  if (!note) return null;

  if (note.tags.includes(tag)) {
    return note;
  }

  const now = new Date().toISOString();
  const newTags = [...note.tags, tag];

  db.prepare(`UPDATE notes SET tags = ?, updated_at = ? WHERE id = ?`)
    .run(JSON.stringify(newTags), now, id);

  return { ...note, tags: newTags, updatedAt: now };
}

export function removeNoteTag(id: string, tag: string): Note | null {
  const db = getDatabase();
  const note = getNote(id);
  if (!note) return null;

  const now = new Date().toISOString();
  const newTags = note.tags.filter(t => t !== tag);

  db.prepare(`UPDATE notes SET tags = ?, updated_at = ? WHERE id = ?`)
    .run(JSON.stringify(newTags), now, id);

  return { ...note, tags: newTags, updatedAt: now };
}

export function generateRecap(sessionId: string, eventLimit = 20): Note {
  // Get recent narrative events
  const events = getHistory(sessionId, { limit: eventLimit });

  // Group by type for summary
  const byType: Record<string, string[]> = {};
  for (const event of events) {
    if (!byType[event.eventType]) {
      byType[event.eventType] = [];
    }
    byType[event.eventType].push(event.content);
  }

  // Build recap content
  let content = "# Session Recap\n\n";
  content += `*Generated from last ${events.length} events*\n\n`;

  for (const [eventType, contents] of Object.entries(byType)) {
    content += `## ${eventType.charAt(0).toUpperCase() + eventType.slice(1)}\n\n`;
    for (const c of contents.slice(0, 5)) {
      content += `- ${c.slice(0, 200)}${c.length > 200 ? "..." : ""}\n`;
    }
    if (contents.length > 5) {
      content += `- *(and ${contents.length - 5} more...)*\n`;
    }
    content += "\n";
  }

  // Create the note
  return createNote({
    sessionId,
    title: `Session Recap - ${new Date().toLocaleDateString()}`,
    content,
    category: "recap",
    tags: ["auto-generated", "recap"],
  });
}
