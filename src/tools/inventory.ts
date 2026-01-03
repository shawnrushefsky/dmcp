import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import { safeJsonParse } from "../utils/json.js";
import { gameEvents } from "../events/emitter.js";
import type { Item, ItemProperties, ImageGeneration } from "../types/index.js";

export function createItem(params: {
  gameId: string;
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
    INSERT INTO items (id, game_id, owner_id, owner_type, name, properties, image_gen)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    params.gameId,
    params.ownerId,
    params.ownerType,
    params.name,
    JSON.stringify(properties),
    params.imageGen ? JSON.stringify(params.imageGen) : null
  );

  return {
    id,
    gameId: params.gameId,
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
    gameId: row.game_id as string,
    ownerId: row.owner_id as string,
    ownerType: row.owner_type as "character" | "location",
    name: row.name as string,
    properties: safeJsonParse<ItemProperties>(row.properties as string, { description: "", type: "misc" }),
    imageGen: row.image_gen ? safeJsonParse<ImageGeneration>(row.image_gen as string, null as unknown as ImageGeneration) : null,
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

  // Emit realtime event
  gameEvents.emit({
    type: "inventory:updated",
    gameId: item.gameId,
    entityId: itemId,
    entityType: "item",
    timestamp: new Date().toISOString(),
    data: { name: item.name, newOwnerId, newOwnerType },
  });

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
    gameId: row.game_id as string,
    ownerId: row.owner_id as string,
    ownerType: row.owner_type as "character" | "location",
    name: row.name as string,
    properties: safeJsonParse<ItemProperties>(row.properties as string, { description: "", type: "misc" }),
    imageGen: row.image_gen ? safeJsonParse<ImageGeneration>(row.image_gen as string, null as unknown as ImageGeneration) : null,
  }));
}

export function findItemByName(
  gameId: string,
  name: string
): Item | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM items WHERE game_id = ? AND name = ? LIMIT 1
  `);
  const row = stmt.get(gameId, name) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    gameId: row.game_id as string,
    ownerId: row.owner_id as string,
    ownerType: row.owner_type as "character" | "location",
    name: row.name as string,
    properties: safeJsonParse<ItemProperties>(row.properties as string, { description: "", type: "misc" }),
    imageGen: row.image_gen ? safeJsonParse<ImageGeneration>(row.image_gen as string, null as unknown as ImageGeneration) : null,
  };
}

export function listGameItems(gameId: string): Item[] {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM items WHERE game_id = ?`);
  const rows = stmt.all(gameId) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as string,
    gameId: row.game_id as string,
    ownerId: row.owner_id as string,
    ownerType: row.owner_type as "character" | "location",
    name: row.name as string,
    properties: safeJsonParse<ItemProperties>(row.properties as string, { description: "", type: "misc" }),
    imageGen: row.image_gen ? safeJsonParse<ImageGeneration>(row.image_gen as string, null as unknown as ImageGeneration) : null,
  }));
}
