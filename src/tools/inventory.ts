import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import type { Item, ItemProperties, ImageGeneration } from "../types/index.js";

export function createItem(params: {
  sessionId: string;
  ownerId: string;
  ownerType: "character" | "location";
  name: string;
  properties?: Partial<ItemProperties>;
  imageGen?: ImageGeneration;
}): Item {
  const db = getDatabase();
  const id = uuidv4();

  const properties: ItemProperties = {
    description: "",
    type: "misc",
    ...params.properties,
  };

  const stmt = db.prepare(`
    INSERT INTO items (id, session_id, owner_id, owner_type, name, properties, image_gen)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    params.sessionId,
    params.ownerId,
    params.ownerType,
    params.name,
    JSON.stringify(properties),
    params.imageGen ? JSON.stringify(params.imageGen) : null
  );

  return {
    id,
    sessionId: params.sessionId,
    ownerId: params.ownerId,
    ownerType: params.ownerType,
    name: params.name,
    properties,
    imageGen: params.imageGen || null,
  };
}

export function getItem(id: string): Item | null {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM items WHERE id = ?`);
  const row = stmt.get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    ownerId: row.owner_id as string,
    ownerType: row.owner_type as "character" | "location",
    name: row.name as string,
    properties: JSON.parse(row.properties as string),
    imageGen: row.image_gen ? JSON.parse(row.image_gen as string) : null,
  };
}

export function updateItem(
  id: string,
  updates: {
    name?: string;
    properties?: Partial<ItemProperties>;
    imageGen?: ImageGeneration | null;
  }
): Item | null {
  const db = getDatabase();
  const current = getItem(id);
  if (!current) return null;

  const newName = updates.name ?? current.name;
  const newProperties = updates.properties
    ? { ...current.properties, ...updates.properties }
    : current.properties;
  const newImageGen =
    updates.imageGen !== undefined ? updates.imageGen : current.imageGen;

  const stmt = db.prepare(`
    UPDATE items SET name = ?, properties = ?, image_gen = ? WHERE id = ?
  `);

  stmt.run(
    newName,
    JSON.stringify(newProperties),
    newImageGen ? JSON.stringify(newImageGen) : null,
    id
  );

  return {
    ...current,
    name: newName,
    properties: newProperties,
    imageGen: newImageGen,
  };
}

export function deleteItem(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`DELETE FROM items WHERE id = ?`);
  const result = stmt.run(id);
  return result.changes > 0;
}

export function transferItem(
  itemId: string,
  newOwnerId: string,
  newOwnerType: "character" | "location"
): Item | null {
  const db = getDatabase();
  const item = getItem(itemId);
  if (!item) return null;

  const stmt = db.prepare(`
    UPDATE items SET owner_id = ?, owner_type = ? WHERE id = ?
  `);

  stmt.run(newOwnerId, newOwnerType, itemId);

  return {
    ...item,
    ownerId: newOwnerId,
    ownerType: newOwnerType,
  };
}

export function getInventory(
  ownerId: string,
  ownerType: "character" | "location"
): Item[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM items WHERE owner_id = ? AND owner_type = ?
  `);
  const rows = stmt.all(ownerId, ownerType) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    ownerId: row.owner_id as string,
    ownerType: row.owner_type as "character" | "location",
    name: row.name as string,
    properties: JSON.parse(row.properties as string),
    imageGen: row.image_gen ? JSON.parse(row.image_gen as string) : null,
  }));
}

export function findItemByName(
  sessionId: string,
  name: string
): Item | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM items WHERE session_id = ? AND name = ? LIMIT 1
  `);
  const row = stmt.get(sessionId, name) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    ownerId: row.owner_id as string,
    ownerType: row.owner_type as "character" | "location",
    name: row.name as string,
    properties: JSON.parse(row.properties as string),
    imageGen: row.image_gen ? JSON.parse(row.image_gen as string) : null,
  };
}

export function listSessionItems(sessionId: string): Item[] {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM items WHERE session_id = ?`);
  const rows = stmt.all(sessionId) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    ownerId: row.owner_id as string,
    ownerType: row.owner_type as "character" | "location",
    name: row.name as string,
    properties: JSON.parse(row.properties as string),
    imageGen: row.image_gen ? JSON.parse(row.image_gen as string) : null,
  }));
}
