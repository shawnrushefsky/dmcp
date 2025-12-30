import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import type { Location, LocationProperties, Exit, ImageGeneration } from "../types/index.js";

export function createLocation(params: {
  sessionId: string;
  name: string;
  description: string;
  properties?: Partial<LocationProperties>;
  imageGen?: ImageGeneration;
}): Location {
  const db = getDatabase();
  const id = uuidv4();

  const properties: LocationProperties = {
    exits: [],
    features: [],
    atmosphere: "",
    ...params.properties,
  };

  const stmt = db.prepare(`
    INSERT INTO locations (id, session_id, name, description, properties, image_gen)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    params.sessionId,
    params.name,
    params.description,
    JSON.stringify(properties),
    params.imageGen ? JSON.stringify(params.imageGen) : null
  );

  return {
    id,
    sessionId: params.sessionId,
    name: params.name,
    description: params.description,
    properties,
    imageGen: params.imageGen || null,
  };
}

export function getLocation(id: string): Location | null {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM locations WHERE id = ?`);
  const row = stmt.get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    name: row.name as string,
    description: row.description as string,
    properties: JSON.parse(row.properties as string),
    imageGen: row.image_gen ? JSON.parse(row.image_gen as string) : null,
  };
}

export function updateLocation(
  id: string,
  updates: {
    name?: string;
    description?: string;
    properties?: Partial<LocationProperties>;
    imageGen?: ImageGeneration | null;
  }
): Location | null {
  const db = getDatabase();
  const current = getLocation(id);
  if (!current) return null;

  const newName = updates.name ?? current.name;
  const newDescription = updates.description ?? current.description;
  const newProperties = updates.properties
    ? { ...current.properties, ...updates.properties }
    : current.properties;
  const newImageGen =
    updates.imageGen !== undefined ? updates.imageGen : current.imageGen;

  const stmt = db.prepare(`
    UPDATE locations SET name = ?, description = ?, properties = ?, image_gen = ? WHERE id = ?
  `);

  stmt.run(
    newName,
    newDescription,
    JSON.stringify(newProperties),
    newImageGen ? JSON.stringify(newImageGen) : null,
    id
  );

  return {
    ...current,
    name: newName,
    description: newDescription,
    properties: newProperties,
    imageGen: newImageGen,
  };
}

export function listLocations(sessionId: string): Location[] {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM locations WHERE session_id = ?`);
  const rows = stmt.all(sessionId) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    name: row.name as string,
    description: row.description as string,
    properties: JSON.parse(row.properties as string),
    imageGen: row.image_gen ? JSON.parse(row.image_gen as string) : null,
  }));
}

export function deleteLocation(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`DELETE FROM locations WHERE id = ?`);
  const result = stmt.run(id);
  return result.changes > 0;
}

export function connectLocations(params: {
  fromLocationId: string;
  toLocationId: string;
  fromDirection: string;
  toDirection: string;
  description?: string;
  bidirectional?: boolean;
}): boolean {
  const fromLocation = getLocation(params.fromLocationId);
  const toLocation = getLocation(params.toLocationId);

  if (!fromLocation || !toLocation) return false;

  // Add exit from first location to second
  const exitFromTo: Exit = {
    direction: params.fromDirection,
    destinationId: params.toLocationId,
    description: params.description,
  };

  fromLocation.properties.exits = fromLocation.properties.exits.filter(
    (e) => e.direction !== params.fromDirection
  );
  fromLocation.properties.exits.push(exitFromTo);

  updateLocation(params.fromLocationId, {
    properties: fromLocation.properties,
  });

  // If bidirectional, add reverse exit
  if (params.bidirectional !== false) {
    const exitToFrom: Exit = {
      direction: params.toDirection,
      destinationId: params.fromLocationId,
      description: params.description,
    };

    toLocation.properties.exits = toLocation.properties.exits.filter(
      (e) => e.direction !== params.toDirection
    );
    toLocation.properties.exits.push(exitToFrom);

    updateLocation(params.toLocationId, {
      properties: toLocation.properties,
    });
  }

  return true;
}

export function getExits(locationId: string): Exit[] {
  const location = getLocation(locationId);
  if (!location) return [];
  return location.properties.exits;
}
