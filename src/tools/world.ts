import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import { safeJsonParse } from "../utils/json.js";
import { gameEvents } from "../events/emitter.js";
import { validateGameExists } from "./game.js";
import type { Location, LocationProperties, Exit, ImageGeneration } from "../types/index.js";

export function createLocation(params: {
  gameId: string;
  name: string;
  description: string;
  properties?: Partial<LocationProperties>;
  imageGen?: ImageGeneration;
}): Location {
  // Validate game exists to prevent orphaned records
  validateGameExists(params.gameId);

  const db = getDatabase();
  const id = uuidv4();

  const properties: LocationProperties = {
    exits: [],
    features: [],
    atmosphere: "",
    ...params.properties,
  };

  const stmt = db.prepare(`
    INSERT INTO locations (id, game_id, name, description, properties, image_gen)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    params.gameId,
    params.name,
    params.description,
    JSON.stringify(properties),
    params.imageGen ? JSON.stringify(params.imageGen) : null
  );

  return {
    id,
    gameId: params.gameId,
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
    gameId: row.game_id as string,
    name: row.name as string,
    description: row.description as string,
    properties: safeJsonParse<LocationProperties>(row.properties as string, { exits: [], features: [], atmosphere: "" }),
    imageGen: row.image_gen ? safeJsonParse<ImageGeneration>(row.image_gen as string, null as unknown as ImageGeneration) : null,
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

  const updated: Location = {
    ...current,
    name: newName,
    description: newDescription,
    properties: newProperties,
    imageGen: newImageGen,
  };

  // Emit realtime event
  gameEvents.emit({
    type: "location:updated",
    gameId: current.gameId,
    entityId: id,
    entityType: "location",
    timestamp: new Date().toISOString(),
    data: { name: newName },
  });

  return updated;
}

export function listLocations(gameId: string): Location[] {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM locations WHERE game_id = ?`);
  const rows = stmt.all(gameId) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as string,
    gameId: row.game_id as string,
    name: row.name as string,
    description: row.description as string,
    properties: safeJsonParse<LocationProperties>(row.properties as string, { exits: [], features: [], atmosphere: "" }),
    imageGen: row.image_gen ? safeJsonParse<ImageGeneration>(row.image_gen as string, null as unknown as ImageGeneration) : null,
  }));
}

export function deleteLocation(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`DELETE FROM locations WHERE id = ?`);
  const result = stmt.run(id);
  return result.changes > 0;
}

export interface ConnectLocationsResult {
  success: boolean;
  fromLocation: { id: string; name: string };
  toLocation: { id: string; name: string };
  exitCreated: Exit;
  reverseExitCreated: Exit | null;
  bidirectional: boolean;
}

export function connectLocations(params: {
  fromLocationId: string;
  toLocationId: string;
  fromDirection: string;
  toDirection: string;
  description?: string;
  bidirectional?: boolean;
}): ConnectLocationsResult | null {
  const fromLocation = getLocation(params.fromLocationId);
  const toLocation = getLocation(params.toLocationId);

  if (!fromLocation || !toLocation) return null;

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

  let reverseExitCreated: Exit | null = null;

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

    reverseExitCreated = exitToFrom;
  }

  return {
    success: true,
    fromLocation: { id: fromLocation.id, name: fromLocation.name },
    toLocation: { id: toLocation.id, name: toLocation.name },
    exitCreated: exitFromTo,
    reverseExitCreated,
    bidirectional: params.bidirectional !== false,
  };
}

export function getExits(locationId: string): Exit[] {
  const location = getLocation(locationId);
  if (!location) return [];
  return location.properties.exits;
}

/**
 * Find a location by name (case-insensitive, fuzzy match).
 * Returns the best match or null if no reasonable match found.
 */
export function getLocationByName(
  gameId: string,
  name: string
): Location | null {
  const db = getDatabase();
  const searchName = name.toLowerCase().trim();

  // First try exact match (case-insensitive)
  const exactMatch = db.prepare(
    `SELECT * FROM locations WHERE game_id = ? AND LOWER(name) = ?`
  ).get(gameId, searchName) as Record<string, unknown> | undefined;

  if (exactMatch) {
    return mapRowToLocation(exactMatch);
  }

  // Try contains match
  const containsMatch = db.prepare(
    `SELECT * FROM locations WHERE game_id = ? AND LOWER(name) LIKE ?`
  ).get(gameId, `%${searchName}%`) as Record<string, unknown> | undefined;

  if (containsMatch) {
    return mapRowToLocation(containsMatch);
  }

  // Try matching just the last word (e.g., "Square" matches "Village Square")
  const words = searchName.split(/\s+/);
  if (words.length > 0) {
    const lastWord = words[words.length - 1];
    const lastWordMatch = db.prepare(
      `SELECT * FROM locations WHERE game_id = ? AND LOWER(name) LIKE ?`
    ).get(gameId, `%${lastWord}%`) as Record<string, unknown> | undefined;

    if (lastWordMatch) {
      return mapRowToLocation(lastWordMatch);
    }
  }

  return null;
}

// Helper function to map database row to Location
function mapRowToLocation(row: Record<string, unknown>): Location {
  return {
    id: row.id as string,
    gameId: row.game_id as string,
    name: row.name as string,
    description: row.description as string,
    properties: safeJsonParse<LocationProperties>(row.properties as string, { exits: [], features: [], atmosphere: "" }),
    imageGen: row.image_gen ? safeJsonParse<ImageGeneration>(row.image_gen as string, null as unknown as ImageGeneration) : null,
  };
}

// Direction to grid offset mapping
const DIRECTION_OFFSETS: Record<string, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
  east: { dx: 1, dy: 0 },
  west: { dx: -1, dy: 0 },
  northeast: { dx: 1, dy: -1 },
  northwest: { dx: -1, dy: -1 },
  southeast: { dx: 1, dy: 1 },
  southwest: { dx: -1, dy: 1 },
  n: { dx: 0, dy: -1 },
  s: { dx: 0, dy: 1 },
  e: { dx: 1, dy: 0 },
  w: { dx: -1, dy: 0 },
  ne: { dx: 1, dy: -1 },
  nw: { dx: -1, dy: -1 },
  se: { dx: 1, dy: 1 },
  sw: { dx: -1, dy: 1 },
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
};

interface MapNode {
  id: string;
  name: string;
  x: number;
  y: number;
  exits: Array<{ direction: string; toId: string }>;
  isCenter: boolean;
  hasPlayer: boolean;
}

interface MapData {
  nodes: MapNode[];
  connections: Array<{ from: string; to: string; direction: string }>;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export function renderMap(
  gameId: string,
  options?: {
    centerId?: string;
    radius?: number;
    showPlayerLocation?: boolean;
    playerLocationId?: string;
  }
): MapData | null {
  const locations = listLocations(gameId);
  if (locations.length === 0) return null;

  // Build location lookup
  const locationMap = new Map(locations.map((l) => [l.id, l]));

  // Determine center location
  let centerId = options?.centerId;
  if (!centerId) {
    // Default to player location or first location
    centerId = options?.playerLocationId || locations[0].id;
  }

  const centerLocation = locationMap.get(centerId);
  if (!centerLocation) return null;

  // BFS to place locations on grid
  const placed = new Map<string, { x: number; y: number }>();
  const queue: Array<{ id: string; x: number; y: number; depth: number }> = [];
  const visited = new Set<string>();

  placed.set(centerId, { x: 0, y: 0 });
  queue.push({ id: centerId, x: 0, y: 0, depth: 0 });
  visited.add(centerId);

  const maxRadius = options?.radius ?? Infinity;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    const location = locationMap.get(current.id);
    if (!location) continue;

    // Don't explore beyond radius
    if (current.depth >= maxRadius) continue;

    for (const exit of location.properties.exits) {
      if (visited.has(exit.destinationId)) continue;

      const offset = getDirectionOffset(exit.direction);
      const newX = current.x + offset.dx;
      const newY = current.y + offset.dy;

      // Check if position is occupied, if so try to find nearby spot
      let finalX = newX;
      let finalY = newY;
      if (isOccupied(placed, newX, newY)) {
        const spot = findNearbySpot(placed, newX, newY);
        finalX = spot.x;
        finalY = spot.y;
      }

      placed.set(exit.destinationId, { x: finalX, y: finalY });
      visited.add(exit.destinationId);
      queue.push({ id: exit.destinationId, x: finalX, y: finalY, depth: current.depth + 1 });
    }
  }

  // Build nodes and connections
  const nodes: MapNode[] = [];
  const connections: Array<{ from: string; to: string; direction: string }> = [];
  const connectionSet = new Set<string>();

  for (const [id, pos] of placed) {
    const location = locationMap.get(id);
    if (!location) continue;
    const exits = location.properties.exits
      .filter((e) => placed.has(e.destinationId))
      .map((e) => ({ direction: e.direction, toId: e.destinationId }));

    nodes.push({
      id,
      name: location.name,
      x: pos.x,
      y: pos.y,
      exits,
      isCenter: id === centerId,
      hasPlayer: id === options?.playerLocationId,
    });

    // Add connections (deduplicated)
    for (const exit of exits) {
      const key1 = `${id}-${exit.toId}`;
      const key2 = `${exit.toId}-${id}`;
      if (!connectionSet.has(key1) && !connectionSet.has(key2)) {
        connections.push({ from: id, to: exit.toId, direction: exit.direction });
        connectionSet.add(key1);
      }
    }
  }

  // Calculate bounds
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const bounds = {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };

  return { nodes, connections, bounds };
}

function getDirectionOffset(direction: string): { dx: number; dy: number } {
  const normalized = direction.toLowerCase().trim();
  return DIRECTION_OFFSETS[normalized] || { dx: 0, dy: 0 };
}

function isOccupied(placed: Map<string, { x: number; y: number }>, x: number, y: number): boolean {
  for (const pos of placed.values()) {
    if (pos.x === x && pos.y === y) return true;
  }
  return false;
}

function findNearbySpot(
  placed: Map<string, { x: number; y: number }>,
  x: number,
  y: number
): { x: number; y: number } {
  // Spiral outward to find empty spot
  const offsets = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [2, 0], [-2, 0], [0, 2], [0, -2],
  ];

  for (const [dx, dy] of offsets) {
    const newX = x + dx;
    const newY = y + dy;
    if (!isOccupied(placed, newX, newY)) {
      return { x: newX, y: newY };
    }
  }

  // Fallback: just offset by a lot
  return { x: x + 3, y };
}

