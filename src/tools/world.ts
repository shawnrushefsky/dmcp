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
  ascii: string;
}

export function renderMap(
  sessionId: string,
  options?: {
    centerId?: string;
    radius?: number;
    showPlayerLocation?: boolean;
    playerLocationId?: string;
  }
): MapData | null {
  const locations = listLocations(sessionId);
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
    const current = queue.shift()!;
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
    const location = locationMap.get(id)!;
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

  // Render ASCII map
  const ascii = renderAsciiMap(nodes, connections, bounds, options?.playerLocationId);

  return { nodes, connections, bounds, ascii };
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

function renderAsciiMap(
  nodes: MapNode[],
  connections: Array<{ from: string; to: string; direction: string }>,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  playerLocationId?: string
): string {
  // Each cell is 12 chars wide, 3 chars tall
  const cellWidth = 14;
  const cellHeight = 3;

  const width = (bounds.maxX - bounds.minX + 1) * cellWidth + 1;
  const height = (bounds.maxY - bounds.minY + 1) * cellHeight + 1;

  // Initialize grid
  const grid: string[][] = [];
  for (let y = 0; y < height; y++) {
    grid.push(new Array(width).fill(" "));
  }

  // Create position lookup
  const nodesByPos = new Map<string, MapNode>();
  for (const node of nodes) {
    nodesByPos.set(`${node.x},${node.y}`, node);
  }

  // Draw nodes
  for (const node of nodes) {
    const gridX = (node.x - bounds.minX) * cellWidth;
    const gridY = (node.y - bounds.minY) * cellHeight;

    // Truncate name to fit
    let displayName = node.name.slice(0, cellWidth - 4);
    if (node.hasPlayer) {
      displayName = `@${displayName}`;
    }

    // Draw box
    const boxWidth = Math.max(displayName.length + 2, 8);
    const startX = gridX + Math.floor((cellWidth - boxWidth) / 2);

    // Top border
    for (let i = 0; i < boxWidth; i++) {
      grid[gridY][startX + i] = i === 0 ? "+" : i === boxWidth - 1 ? "+" : "-";
    }

    // Middle with name
    grid[gridY + 1][startX] = "|";
    for (let i = 1; i < boxWidth - 1; i++) {
      const charIndex = i - 1;
      grid[gridY + 1][startX + i] = charIndex < displayName.length ? displayName[charIndex] : " ";
    }
    grid[gridY + 1][startX + boxWidth - 1] = "|";

    // Bottom border
    for (let i = 0; i < boxWidth; i++) {
      grid[gridY + 2][startX + i] = i === 0 ? "+" : i === boxWidth - 1 ? "+" : "-";
    }
  }

  // Draw connections
  for (const conn of connections) {
    const fromNode = nodes.find((n) => n.id === conn.from);
    const toNode = nodes.find((n) => n.id === conn.to);
    if (!fromNode || !toNode) continue;

    const fromGridX = (fromNode.x - bounds.minX) * cellWidth + Math.floor(cellWidth / 2);
    const fromGridY = (fromNode.y - bounds.minY) * cellHeight + 1;
    const toGridX = (toNode.x - bounds.minX) * cellWidth + Math.floor(cellWidth / 2);
    const toGridY = (toNode.y - bounds.minY) * cellHeight + 1;

    // Draw simple line between nodes
    if (fromGridY === toGridY) {
      // Horizontal connection
      const startX = Math.min(fromGridX, toGridX) + 4;
      const endX = Math.max(fromGridX, toGridX) - 4;
      for (let x = startX; x <= endX; x++) {
        if (grid[fromGridY][x] === " ") grid[fromGridY][x] = "-";
      }
    } else if (fromGridX === toGridX) {
      // Vertical connection
      const startY = Math.min(fromGridY, toGridY) + 2;
      const endY = Math.max(fromGridY, toGridY) - 1;
      for (let y = startY; y <= endY; y++) {
        if (grid[y] && grid[y][fromGridX] === " ") grid[y][fromGridX] = "|";
      }
    } else {
      // Diagonal - draw L-shaped path
      const midX = fromGridX;
      const midY = toGridY;

      // Vertical segment
      const startY = Math.min(fromGridY, midY);
      const endY = Math.max(fromGridY, midY);
      for (let y = startY + 2; y < endY; y++) {
        if (grid[y] && grid[y][midX] === " ") grid[y][midX] = "|";
      }

      // Horizontal segment
      const startX = Math.min(midX, toGridX);
      const endX = Math.max(midX, toGridX);
      for (let x = startX + 1; x < endX - 3; x++) {
        if (grid[midY] && grid[midY][x] === " ") grid[midY][x] = "-";
      }
    }
  }

  // Convert grid to string
  return grid.map((row) => row.join("").trimEnd()).join("\n");
}
