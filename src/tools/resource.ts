import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import type { Resource, ResourceChange } from "../types/index.js";

function clampValue(
  value: number,
  minValue: number | null,
  maxValue: number | null
): number {
  let result = value;
  if (minValue !== null) result = Math.max(result, minValue);
  if (maxValue !== null) result = Math.min(result, maxValue);
  return result;
}

export function createResource(params: {
  sessionId: string;
  ownerType: "session" | "character";
  ownerId?: string;
  name: string;
  description?: string;
  category?: string;
  value?: number;
  minValue?: number;
  maxValue?: number;
}): Resource {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  const ownerId = params.ownerType === "session" ? null : (params.ownerId || null);
  const initialValue = params.value ?? 0;
  const minValue = params.minValue ?? null;
  const maxValue = params.maxValue ?? null;
  const value = clampValue(initialValue, minValue, maxValue);

  const stmt = db.prepare(`
    INSERT INTO resources (id, session_id, owner_id, owner_type, name, description, category, value, min_value, max_value, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    params.sessionId,
    ownerId,
    params.ownerType,
    params.name,
    params.description || "",
    params.category || null,
    value,
    minValue,
    maxValue,
    now
  );

  return {
    id,
    sessionId: params.sessionId,
    ownerId,
    ownerType: params.ownerType,
    name: params.name,
    description: params.description || "",
    category: params.category || null,
    value,
    minValue,
    maxValue,
    createdAt: now,
  };
}

export function getResource(id: string): Resource | null {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM resources WHERE id = ?`);
  const row = stmt.get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    ownerId: row.owner_id as string | null,
    ownerType: row.owner_type as "session" | "character",
    name: row.name as string,
    description: row.description as string,
    category: row.category as string | null,
    value: row.value as number,
    minValue: row.min_value as number | null,
    maxValue: row.max_value as number | null,
    createdAt: row.created_at as string,
  };
}

export function updateResource(
  id: string,
  updates: {
    name?: string;
    description?: string;
    category?: string | null;
    minValue?: number | null;
    maxValue?: number | null;
  }
): Resource | null {
  const db = getDatabase();
  const current = getResource(id);
  if (!current) return null;

  const newName = updates.name ?? current.name;
  const newDescription = updates.description ?? current.description;
  const newCategory = updates.category !== undefined ? updates.category : current.category;
  const newMinValue = updates.minValue !== undefined ? updates.minValue : current.minValue;
  const newMaxValue = updates.maxValue !== undefined ? updates.maxValue : current.maxValue;

  // Re-clamp value if bounds changed
  const newValue = clampValue(current.value, newMinValue, newMaxValue);

  const stmt = db.prepare(`
    UPDATE resources
    SET name = ?, description = ?, category = ?, min_value = ?, max_value = ?, value = ?
    WHERE id = ?
  `);

  stmt.run(newName, newDescription, newCategory, newMinValue, newMaxValue, newValue, id);

  return {
    ...current,
    name: newName,
    description: newDescription,
    category: newCategory,
    minValue: newMinValue,
    maxValue: newMaxValue,
    value: newValue,
  };
}

export function deleteResource(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`DELETE FROM resources WHERE id = ?`);
  const result = stmt.run(id);
  return result.changes > 0;
}

export function listResources(
  sessionId: string,
  filter?: {
    ownerType?: "session" | "character";
    ownerId?: string;
    category?: string;
  }
): Resource[] {
  const db = getDatabase();
  let query = `SELECT * FROM resources WHERE session_id = ?`;
  const params: (string | number)[] = [sessionId];

  if (filter?.ownerType !== undefined) {
    query += ` AND owner_type = ?`;
    params.push(filter.ownerType);
  }

  if (filter?.ownerId !== undefined) {
    query += ` AND owner_id = ?`;
    params.push(filter.ownerId);
  }

  if (filter?.category !== undefined) {
    query += ` AND category = ?`;
    params.push(filter.category);
  }

  query += ` ORDER BY name`;

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    ownerId: row.owner_id as string | null,
    ownerType: row.owner_type as "session" | "character",
    name: row.name as string,
    description: row.description as string,
    category: row.category as string | null,
    value: row.value as number,
    minValue: row.min_value as number | null,
    maxValue: row.max_value as number | null,
    createdAt: row.created_at as string,
  }));
}

function logChange(
  resourceId: string,
  previousValue: number,
  newValue: number,
  reason: string | null
): ResourceChange {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();
  const delta = newValue - previousValue;

  const stmt = db.prepare(`
    INSERT INTO resource_history (id, resource_id, previous_value, new_value, delta, reason, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, resourceId, previousValue, newValue, delta, reason, now);

  return {
    id,
    resourceId,
    previousValue,
    newValue,
    delta,
    reason,
    timestamp: now,
  };
}

export function modifyResource(params: {
  resourceId: string;
  delta: number;
  reason?: string;
}): { resource: Resource; change: ResourceChange } | null {
  const resource = getResource(params.resourceId);
  if (!resource) return null;

  const previousValue = resource.value;
  const newValue = clampValue(
    previousValue + params.delta,
    resource.minValue,
    resource.maxValue
  );

  const db = getDatabase();
  const stmt = db.prepare(`UPDATE resources SET value = ? WHERE id = ?`);
  stmt.run(newValue, params.resourceId);

  const change = logChange(
    params.resourceId,
    previousValue,
    newValue,
    params.reason || null
  );

  return {
    resource: { ...resource, value: newValue },
    change,
  };
}

export function setResource(params: {
  resourceId: string;
  value: number;
  reason?: string;
}): { resource: Resource; change: ResourceChange } | null {
  const resource = getResource(params.resourceId);
  if (!resource) return null;

  const previousValue = resource.value;
  const newValue = clampValue(
    params.value,
    resource.minValue,
    resource.maxValue
  );

  const db = getDatabase();
  const stmt = db.prepare(`UPDATE resources SET value = ? WHERE id = ?`);
  stmt.run(newValue, params.resourceId);

  const change = logChange(
    params.resourceId,
    previousValue,
    newValue,
    params.reason || null
  );

  return {
    resource: { ...resource, value: newValue },
    change,
  };
}

export function getResourceHistory(
  resourceId: string,
  limit?: number
): ResourceChange[] {
  const db = getDatabase();
  let query = `SELECT * FROM resource_history WHERE resource_id = ? ORDER BY timestamp DESC`;
  const params: (string | number)[] = [resourceId];

  if (limit !== undefined) {
    query += ` LIMIT ?`;
    params.push(limit);
  }

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as string,
    resourceId: row.resource_id as string,
    previousValue: row.previous_value as number,
    newValue: row.new_value as number,
    delta: row.delta as number,
    reason: row.reason as string | null,
    timestamp: row.timestamp as string,
  }));
}
