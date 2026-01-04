import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import { safeJsonParse } from "../utils/json.js";
import type { Faction } from "../types/index.js";

export function createFaction(params: {
  gameId: string;
  name: string;
  description?: string;
  leaderId?: string;
  headquartersId?: string;
  resources?: Record<string, number>;
  goals?: string[];
  traits?: string[];
  status?: "active" | "disbanded" | "hidden";
}): Faction {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO factions (id, game_id, name, description, leader_id, headquarters_id, resources, goals, traits, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.gameId,
    params.name,
    params.description || "",
    params.leaderId || null,
    params.headquartersId || null,
    JSON.stringify(params.resources || {}),
    JSON.stringify(params.goals || []),
    JSON.stringify(params.traits || []),
    params.status || "active",
    now
  );

  return {
    id,
    gameId: params.gameId,
    name: params.name,
    description: params.description || "",
    leaderId: params.leaderId || null,
    headquartersId: params.headquartersId || null,
    resources: params.resources || {},
    goals: params.goals || [],
    traits: params.traits || [],
    status: params.status || "active",
    createdAt: now,
  };
}

export function getFaction(id: string): Faction | null {
  const db = getDatabase();
  const row = db.prepare(`SELECT * FROM factions WHERE id = ?`).get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    gameId: row.game_id as string,
    name: row.name as string,
    description: row.description as string,
    leaderId: row.leader_id as string | null,
    headquartersId: row.headquarters_id as string | null,
    resources: safeJsonParse<Record<string, number>>(row.resources as string || "{}", {}),
    goals: safeJsonParse<string[]>(row.goals as string || "[]", []),
    traits: safeJsonParse<string[]>(row.traits as string || "[]", []),
    status: row.status as "active" | "disbanded" | "hidden",
    createdAt: row.created_at as string,
  };
}

export function updateFaction(
  id: string,
  updates: {
    name?: string;
    description?: string;
    leaderId?: string | null;
    headquartersId?: string | null;
    traits?: string[];
    status?: "active" | "disbanded" | "hidden";
  }
): Faction | null {
  const db = getDatabase();
  const current = getFaction(id);
  if (!current) return null;

  const newName = updates.name ?? current.name;
  const newDescription = updates.description ?? current.description;
  const newLeaderId = updates.leaderId !== undefined ? updates.leaderId : current.leaderId;
  const newHeadquartersId = updates.headquartersId !== undefined ? updates.headquartersId : current.headquartersId;
  const newTraits = updates.traits ?? current.traits;
  const newStatus = updates.status ?? current.status;

  db.prepare(`
    UPDATE factions
    SET name = ?, description = ?, leader_id = ?, headquarters_id = ?, traits = ?, status = ?
    WHERE id = ?
  `).run(newName, newDescription, newLeaderId, newHeadquartersId, JSON.stringify(newTraits), newStatus, id);

  return {
    ...current,
    name: newName,
    description: newDescription,
    leaderId: newLeaderId,
    headquartersId: newHeadquartersId,
    traits: newTraits,
    status: newStatus,
  };
}

export function deleteFaction(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare(`DELETE FROM factions WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function listFactions(
  gameId: string,
  filter?: { status?: "active" | "disbanded" | "hidden" }
): Faction[] {
  const db = getDatabase();

  let query = `SELECT * FROM factions WHERE game_id = ?`;
  const params: string[] = [gameId];

  if (filter?.status) {
    query += ` AND status = ?`;
    params.push(filter.status);
  }

  query += ` ORDER BY name`;

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  return rows.map(row => ({
    id: row.id as string,
    gameId: row.game_id as string,
    name: row.name as string,
    description: row.description as string,
    leaderId: row.leader_id as string | null,
    headquartersId: row.headquarters_id as string | null,
    resources: safeJsonParse<Record<string, number>>(row.resources as string || "{}", {}),
    goals: safeJsonParse<string[]>(row.goals as string || "[]", []),
    traits: safeJsonParse<string[]>(row.traits as string || "[]", []),
    status: row.status as "active" | "disbanded" | "hidden",
    createdAt: row.created_at as string,
  }));
}

export function modifyFactionResource(params: {
  factionId: string;
  resource: string;
  delta: number;
}): Faction | null {
  const db = getDatabase();
  const faction = getFaction(params.factionId);
  if (!faction) return null;

  const newResources = { ...faction.resources };
  newResources[params.resource] = (newResources[params.resource] || 0) + params.delta;

  // Remove resource if zero or negative
  if (newResources[params.resource] <= 0) {
    delete newResources[params.resource];
  }

  db.prepare(`UPDATE factions SET resources = ? WHERE id = ?`)
    .run(JSON.stringify(newResources), params.factionId);

  return { ...faction, resources: newResources };
}

export function setFactionResource(params: {
  factionId: string;
  resource: string;
  value: number;
}): Faction | null {
  const db = getDatabase();
  const faction = getFaction(params.factionId);
  if (!faction) return null;

  const newResources = { ...faction.resources };

  if (params.value <= 0) {
    delete newResources[params.resource];
  } else {
    newResources[params.resource] = params.value;
  }

  db.prepare(`UPDATE factions SET resources = ? WHERE id = ?`)
    .run(JSON.stringify(newResources), params.factionId);

  return { ...faction, resources: newResources };
}

export function addFactionGoal(factionId: string, goal: string): Faction | null {
  const db = getDatabase();
  const faction = getFaction(factionId);
  if (!faction) return null;

  const newGoals = [...faction.goals, goal];

  db.prepare(`UPDATE factions SET goals = ? WHERE id = ?`)
    .run(JSON.stringify(newGoals), factionId);

  return { ...faction, goals: newGoals };
}

export function completeFactionGoal(factionId: string, goalIndex: number): Faction | null {
  const db = getDatabase();
  const faction = getFaction(factionId);
  if (!faction) return null;

  if (goalIndex < 0 || goalIndex >= faction.goals.length) {
    return null;
  }

  const newGoals = faction.goals.filter((_, i) => i !== goalIndex);

  db.prepare(`UPDATE factions SET goals = ? WHERE id = ?`)
    .run(JSON.stringify(newGoals), factionId);

  return { ...faction, goals: newGoals };
}

export function addFactionTrait(factionId: string, trait: string): Faction | null {
  const db = getDatabase();
  const faction = getFaction(factionId);
  if (!faction) return null;

  if (faction.traits.includes(trait)) {
    return faction;
  }

  const newTraits = [...faction.traits, trait];

  db.prepare(`UPDATE factions SET traits = ? WHERE id = ?`)
    .run(JSON.stringify(newTraits), factionId);

  return { ...faction, traits: newTraits };
}

export function removeFactionTrait(factionId: string, trait: string): Faction | null {
  const db = getDatabase();
  const faction = getFaction(factionId);
  if (!faction) return null;

  const newTraits = faction.traits.filter(t => t !== trait);

  db.prepare(`UPDATE factions SET traits = ? WHERE id = ?`)
    .run(JSON.stringify(newTraits), factionId);

  return { ...faction, traits: newTraits };
}

// ============================================================================
// CONSOLIDATED OPERATIONS
// ============================================================================

export function modifyFactionTraits(
  factionId: string,
  params: { add?: string[]; remove?: string[] }
): { faction: Faction; added: string[]; removed: string[] } | null {
  const db = getDatabase();
  const faction = getFaction(factionId);
  if (!faction) return null;

  let newTraits = [...faction.traits];
  const added: string[] = [];
  const removed: string[] = [];

  // Remove traits first
  if (params.remove?.length) {
    for (const trait of params.remove) {
      if (newTraits.includes(trait)) {
        newTraits = newTraits.filter(t => t !== trait);
        removed.push(trait);
      }
    }
  }

  // Then add new traits
  if (params.add?.length) {
    for (const trait of params.add) {
      if (!newTraits.includes(trait)) {
        newTraits.push(trait);
        added.push(trait);
      }
    }
  }

  db.prepare(`UPDATE factions SET traits = ? WHERE id = ?`)
    .run(JSON.stringify(newTraits), factionId);

  return {
    faction: { ...faction, traits: newTraits },
    added,
    removed,
  };
}

export function modifyFactionGoals(
  factionId: string,
  params: { add?: string[]; complete?: number[] }
): { faction: Faction; added: string[]; completed: string[] } | null {
  const db = getDatabase();
  const faction = getFaction(factionId);
  if (!faction) return null;

  const newGoals = [...faction.goals];
  const added: string[] = [];
  const completed: string[] = [];

  // Complete goals first (by index, descending to preserve indices)
  if (params.complete?.length) {
    const sortedIndices = [...params.complete].sort((a, b) => b - a);
    for (const index of sortedIndices) {
      if (index >= 0 && index < newGoals.length) {
        completed.push(newGoals[index]);
        newGoals.splice(index, 1);
      }
    }
  }

  // Then add new goals
  if (params.add?.length) {
    for (const goal of params.add) {
      newGoals.push(goal);
      added.push(goal);
    }
  }

  db.prepare(`UPDATE factions SET goals = ? WHERE id = ?`)
    .run(JSON.stringify(newGoals), factionId);

  return {
    faction: { ...faction, goals: newGoals },
    added,
    completed,
  };
}

export function updateFactionResource(params: {
  factionId: string;
  resource: string;
  mode: "delta" | "set";
  value: number;
}): Faction | null {
  const db = getDatabase();
  const faction = getFaction(params.factionId);
  if (!faction) return null;

  const newResources = { ...faction.resources };

  if (params.mode === "delta") {
    newResources[params.resource] = (newResources[params.resource] || 0) + params.value;
  } else {
    newResources[params.resource] = params.value;
  }

  // Remove resource if zero or negative
  if (newResources[params.resource] <= 0) {
    delete newResources[params.resource];
  }

  db.prepare(`UPDATE factions SET resources = ? WHERE id = ?`)
    .run(JSON.stringify(newResources), params.factionId);

  return { ...faction, resources: newResources };
}
