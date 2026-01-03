import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import type { Relationship, RelationshipChange } from "../types/index.js";

export function createRelationship(params: {
  gameId: string;
  sourceId: string;
  sourceType: string;
  targetId: string;
  targetType: string;
  relationshipType: string;
  value?: number;
  label?: string;
  notes?: string;
}): Relationship {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO relationships (id, game_id, source_id, source_type, target_id, target_type, relationship_type, value, label, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.gameId,
    params.sourceId,
    params.sourceType,
    params.targetId,
    params.targetType,
    params.relationshipType,
    params.value ?? 0,
    params.label || null,
    params.notes || "",
    now,
    now
  );

  return {
    id,
    gameId: params.gameId,
    sourceId: params.sourceId,
    sourceType: params.sourceType,
    targetId: params.targetId,
    targetType: params.targetType,
    relationshipType: params.relationshipType,
    value: params.value ?? 0,
    label: params.label || null,
    notes: params.notes || "",
    createdAt: now,
    updatedAt: now,
  };
}

export function getRelationship(id: string): Relationship | null {
  const db = getDatabase();
  const row = db.prepare(`SELECT * FROM relationships WHERE id = ?`).get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    gameId: row.game_id as string,
    sourceId: row.source_id as string,
    sourceType: row.source_type as string,
    targetId: row.target_id as string,
    targetType: row.target_type as string,
    relationshipType: row.relationship_type as string,
    value: row.value as number,
    label: row.label as string | null,
    notes: row.notes as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function getRelationshipBetween(
  gameId: string,
  sourceId: string,
  targetId: string,
  relationshipType?: string
): Relationship | null {
  const db = getDatabase();

  let query = `SELECT * FROM relationships WHERE game_id = ? AND source_id = ? AND target_id = ?`;
  const params: string[] = [gameId, sourceId, targetId];

  if (relationshipType) {
    query += ` AND relationship_type = ?`;
    params.push(relationshipType);
  }

  query += ` LIMIT 1`;

  const row = db.prepare(query).get(...params) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    gameId: row.game_id as string,
    sourceId: row.source_id as string,
    sourceType: row.source_type as string,
    targetId: row.target_id as string,
    targetType: row.target_type as string,
    relationshipType: row.relationship_type as string,
    value: row.value as number,
    label: row.label as string | null,
    notes: row.notes as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function updateRelationship(
  id: string,
  updates: {
    relationshipType?: string;
    value?: number;
    label?: string | null;
    notes?: string;
  }
): Relationship | null {
  const db = getDatabase();
  const current = getRelationship(id);
  if (!current) return null;

  const now = new Date().toISOString();
  const newType = updates.relationshipType ?? current.relationshipType;
  const newValue = updates.value ?? current.value;
  const newLabel = updates.label !== undefined ? updates.label : current.label;
  const newNotes = updates.notes ?? current.notes;

  db.prepare(`
    UPDATE relationships
    SET relationship_type = ?, value = ?, label = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `).run(newType, newValue, newLabel, newNotes, now, id);

  return {
    ...current,
    relationshipType: newType,
    value: newValue,
    label: newLabel,
    notes: newNotes,
    updatedAt: now,
  };
}

function logRelationshipChange(
  relationshipId: string,
  previousValue: number,
  newValue: number,
  reason: string | null
): RelationshipChange {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO relationship_history (id, relationship_id, previous_value, new_value, reason, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, relationshipId, previousValue, newValue, reason, now);

  return {
    id,
    relationshipId,
    previousValue,
    newValue,
    reason,
    timestamp: now,
  };
}

export function modifyRelationship(params: {
  relationshipId: string;
  delta: number;
  reason?: string;
  minValue?: number;
  maxValue?: number;
}): { relationship: Relationship; change: RelationshipChange } | null {
  const db = getDatabase();
  const relationship = getRelationship(params.relationshipId);
  if (!relationship) return null;

  const previousValue = relationship.value;
  let newValue = previousValue + params.delta;

  // Apply bounds
  if (params.minValue !== undefined) {
    newValue = Math.max(newValue, params.minValue);
  }
  if (params.maxValue !== undefined) {
    newValue = Math.min(newValue, params.maxValue);
  }

  const now = new Date().toISOString();

  db.prepare(`UPDATE relationships SET value = ?, updated_at = ? WHERE id = ?`)
    .run(newValue, now, params.relationshipId);

  const change = logRelationshipChange(
    params.relationshipId,
    previousValue,
    newValue,
    params.reason || null
  );

  return {
    relationship: { ...relationship, value: newValue, updatedAt: now },
    change,
  };
}

export function deleteRelationship(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare(`DELETE FROM relationships WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function listRelationships(
  gameId: string,
  filter?: {
    entityId?: string;  // Either source or target
    sourceId?: string;
    targetId?: string;
    relationshipType?: string;
    entityType?: string;  // Filter by source_type or target_type
  }
): Relationship[] {
  const db = getDatabase();

  let query = `SELECT * FROM relationships WHERE game_id = ?`;
  const params: string[] = [gameId];

  if (filter?.entityId) {
    query += ` AND (source_id = ? OR target_id = ?)`;
    params.push(filter.entityId, filter.entityId);
  }

  if (filter?.sourceId) {
    query += ` AND source_id = ?`;
    params.push(filter.sourceId);
  }

  if (filter?.targetId) {
    query += ` AND target_id = ?`;
    params.push(filter.targetId);
  }

  if (filter?.relationshipType) {
    query += ` AND relationship_type = ?`;
    params.push(filter.relationshipType);
  }

  if (filter?.entityType) {
    query += ` AND (source_type = ? OR target_type = ?)`;
    params.push(filter.entityType, filter.entityType);
  }

  query += ` ORDER BY updated_at DESC`;

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  return rows.map(row => ({
    id: row.id as string,
    gameId: row.game_id as string,
    sourceId: row.source_id as string,
    sourceType: row.source_type as string,
    targetId: row.target_id as string,
    targetType: row.target_type as string,
    relationshipType: row.relationship_type as string,
    value: row.value as number,
    label: row.label as string | null,
    notes: row.notes as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export function getRelationshipHistory(relationshipId: string, limit?: number): RelationshipChange[] {
  const db = getDatabase();

  let query = `SELECT * FROM relationship_history WHERE relationship_id = ? ORDER BY timestamp DESC`;
  const params: (string | number)[] = [relationshipId];

  if (limit) {
    query += ` LIMIT ?`;
    params.push(limit);
  }

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  return rows.map(row => ({
    id: row.id as string,
    relationshipId: row.relationship_id as string,
    previousValue: row.previous_value as number,
    newValue: row.new_value as number,
    reason: row.reason as string | null,
    timestamp: row.timestamp as string,
  }));
}

/**
 * Update a relationship value with optional metadata changes. Supports both direct set and delta modes.
 * Logs to history when value changes.
 */
export function updateRelationshipValue(params: {
  relationshipId: string;
  mode: "delta" | "set";
  value: number;
  reason?: string;
  minValue?: number;
  maxValue?: number;
  relationshipType?: string;
  label?: string | null;
  notes?: string;
}): { relationship: Relationship; change: RelationshipChange | null; previousValue: number } | null {
  const db = getDatabase();
  const relationship = getRelationship(params.relationshipId);
  if (!relationship) return null;

  const previousValue = relationship.value;
  let newValue: number;

  if (params.mode === "delta") {
    newValue = previousValue + params.value;
  } else {
    newValue = params.value;
  }

  // Apply bounds
  if (params.minValue !== undefined) {
    newValue = Math.max(newValue, params.minValue);
  }
  if (params.maxValue !== undefined) {
    newValue = Math.min(newValue, params.maxValue);
  }

  const now = new Date().toISOString();
  const newType = params.relationshipType ?? relationship.relationshipType;
  const newLabel = params.label !== undefined ? params.label : relationship.label;
  const newNotes = params.notes ?? relationship.notes;

  db.prepare(`
    UPDATE relationships
    SET relationship_type = ?, value = ?, label = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `).run(newType, newValue, newLabel, newNotes, now, params.relationshipId);

  // Log to history if value changed
  let change: RelationshipChange | null = null;
  if (newValue !== previousValue) {
    change = logRelationshipChange(
      params.relationshipId,
      previousValue,
      newValue,
      params.reason || null
    );
  }

  return {
    relationship: {
      ...relationship,
      relationshipType: newType,
      value: newValue,
      label: newLabel,
      notes: newNotes,
      updatedAt: now,
    },
    change,
    previousValue,
  };
}

// Helper to get a value label based on thresholds
export function getRelationshipLabel(value: number): string {
  if (value >= 80) return "devoted";
  if (value >= 60) return "friendly";
  if (value >= 40) return "warm";
  if (value >= 20) return "cordial";
  if (value >= 0) return "neutral";
  if (value >= -20) return "cool";
  if (value >= -40) return "unfriendly";
  if (value >= -60) return "hostile";
  if (value >= -80) return "hateful";
  return "nemesis";
}

// Create a bidirectional relationship (both directions with same initial value)
export function createBidirectionalRelationship(params: {
  gameId: string;
  entityA: { id: string; type: string };
  entityB: { id: string; type: string };
  relationshipType: string;
  value?: number;
  label?: string;
  notes?: string;
}): [Relationship, Relationship] {
  const relA = createRelationship({
    gameId: params.gameId,
    sourceId: params.entityA.id,
    sourceType: params.entityA.type,
    targetId: params.entityB.id,
    targetType: params.entityB.type,
    relationshipType: params.relationshipType,
    value: params.value,
    label: params.label,
    notes: params.notes,
  });

  const relB = createRelationship({
    gameId: params.gameId,
    sourceId: params.entityB.id,
    sourceType: params.entityB.type,
    targetId: params.entityA.id,
    targetType: params.entityA.type,
    relationshipType: params.relationshipType,
    value: params.value,
    label: params.label,
    notes: params.notes,
  });

  return [relA, relB];
}
