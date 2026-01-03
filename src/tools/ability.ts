import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import { safeJsonParse } from "../utils/json.js";
import type { Ability } from "../types/index.js";
import { getCharacter } from "./character.js";

export function createAbility(params: {
  gameId: string;
  ownerType: "template" | "character";
  ownerId?: string;
  name: string;
  description?: string;
  category?: string;
  cost?: Record<string, number>;
  cooldown?: number;
  effects?: string[];
  requirements?: Record<string, number>;
  tags?: string[];
}): Ability {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  const ownerId = params.ownerType === "template" ? null : (params.ownerId || null);

  db.prepare(`
    INSERT INTO abilities (id, game_id, owner_id, owner_type, name, description, category, cost, cooldown, effects, requirements, tags, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.gameId,
    ownerId,
    params.ownerType,
    params.name,
    params.description || "",
    params.category || null,
    JSON.stringify(params.cost || {}),
    params.cooldown ?? null,
    JSON.stringify(params.effects || []),
    JSON.stringify(params.requirements || {}),
    JSON.stringify(params.tags || []),
    now
  );

  return {
    id,
    gameId: params.gameId,
    ownerId,
    ownerType: params.ownerType,
    name: params.name,
    description: params.description || "",
    category: params.category || null,
    cost: params.cost || {},
    cooldown: params.cooldown ?? null,
    currentCooldown: 0,
    effects: params.effects || [],
    requirements: params.requirements || {},
    tags: params.tags || [],
    createdAt: now,
  };
}

export function getAbility(id: string): Ability | null {
  const db = getDatabase();
  const row = db.prepare(`SELECT * FROM abilities WHERE id = ?`).get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    gameId: row.game_id as string,
    ownerId: row.owner_id as string | null,
    ownerType: row.owner_type as "template" | "character",
    name: row.name as string,
    description: row.description as string,
    category: row.category as string | null,
    cost: safeJsonParse<Record<string, number>>(row.cost as string || "{}", {}),
    cooldown: row.cooldown as number | null,
    currentCooldown: row.current_cooldown as number,
    effects: safeJsonParse<string[]>(row.effects as string || "[]", []),
    requirements: safeJsonParse<Record<string, number>>(row.requirements as string || "{}", {}),
    tags: safeJsonParse<string[]>(row.tags as string || "[]", []),
    createdAt: row.created_at as string,
  };
}

export function updateAbility(
  id: string,
  updates: {
    name?: string;
    description?: string;
    category?: string | null;
    cost?: Record<string, number>;
    cooldown?: number | null;
    effects?: string[];
    requirements?: Record<string, number>;
    tags?: string[];
  }
): Ability | null {
  const db = getDatabase();
  const current = getAbility(id);
  if (!current) return null;

  const newName = updates.name ?? current.name;
  const newDescription = updates.description ?? current.description;
  const newCategory = updates.category !== undefined ? updates.category : current.category;
  const newCost = updates.cost ?? current.cost;
  const newCooldown = updates.cooldown !== undefined ? updates.cooldown : current.cooldown;
  const newEffects = updates.effects ?? current.effects;
  const newRequirements = updates.requirements ?? current.requirements;
  const newTags = updates.tags ?? current.tags;

  db.prepare(`
    UPDATE abilities
    SET name = ?, description = ?, category = ?, cost = ?, cooldown = ?, effects = ?, requirements = ?, tags = ?
    WHERE id = ?
  `).run(
    newName,
    newDescription,
    newCategory,
    JSON.stringify(newCost),
    newCooldown,
    JSON.stringify(newEffects),
    JSON.stringify(newRequirements),
    JSON.stringify(newTags),
    id
  );

  return {
    ...current,
    name: newName,
    description: newDescription,
    category: newCategory,
    cost: newCost,
    cooldown: newCooldown,
    effects: newEffects,
    requirements: newRequirements,
    tags: newTags,
  };
}

export function deleteAbility(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare(`DELETE FROM abilities WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function listAbilities(
  gameId: string,
  filter?: {
    ownerType?: "template" | "character";
    ownerId?: string;
    category?: string;
  }
): Ability[] {
  const db = getDatabase();

  let query = `SELECT * FROM abilities WHERE game_id = ?`;
  const params: string[] = [gameId];

  if (filter?.ownerType) {
    query += ` AND owner_type = ?`;
    params.push(filter.ownerType);
  }

  if (filter?.ownerId) {
    query += ` AND owner_id = ?`;
    params.push(filter.ownerId);
  }

  if (filter?.category) {
    query += ` AND category = ?`;
    params.push(filter.category);
  }

  query += ` ORDER BY name`;

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  return rows.map(row => ({
    id: row.id as string,
    gameId: row.game_id as string,
    ownerId: row.owner_id as string | null,
    ownerType: row.owner_type as "template" | "character",
    name: row.name as string,
    description: row.description as string,
    category: row.category as string | null,
    cost: safeJsonParse<Record<string, number>>(row.cost as string || "{}", {}),
    cooldown: row.cooldown as number | null,
    currentCooldown: row.current_cooldown as number,
    effects: safeJsonParse<string[]>(row.effects as string || "[]", []),
    requirements: safeJsonParse<Record<string, number>>(row.requirements as string || "{}", {}),
    tags: safeJsonParse<string[]>(row.tags as string || "[]", []),
    createdAt: row.created_at as string,
  }));
}

export function learnAbility(templateId: string, characterId: string): Ability | null {
  const db = getDatabase();
  const template = getAbility(templateId);
  if (!template || template.ownerType !== "template") return null;

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO abilities (id, game_id, owner_id, owner_type, name, description, category, cost, cooldown, effects, requirements, tags, created_at)
    VALUES (?, ?, ?, 'character', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    template.gameId,
    characterId,
    template.name,
    template.description,
    template.category,
    JSON.stringify(template.cost),
    template.cooldown,
    JSON.stringify(template.effects),
    JSON.stringify(template.requirements),
    JSON.stringify(template.tags),
    now
  );

  return {
    id,
    gameId: template.gameId,
    ownerId: characterId,
    ownerType: "character",
    name: template.name,
    description: template.description,
    category: template.category,
    cost: template.cost,
    cooldown: template.cooldown,
    currentCooldown: 0,
    effects: template.effects,
    requirements: template.requirements,
    tags: template.tags,
    createdAt: now,
  };
}

export interface UseAbilityResult {
  success: boolean;
  ability: Ability;
  reason?: string;
  costsPaid?: Record<string, number>;
}

export function useAbility(abilityId: string, characterId: string): UseAbilityResult {
  const db = getDatabase();
  const ability = getAbility(abilityId);

  if (!ability) {
    return { success: false, ability: null as unknown as Ability, reason: "Ability not found" };
  }

  // Check cooldown
  if (ability.currentCooldown > 0) {
    return {
      success: false,
      ability,
      reason: `Ability on cooldown (${ability.currentCooldown} rounds remaining)`,
    };
  }

  // Check costs (would need character resources to validate)
  // For now, we just set the cooldown and return success
  // In a full implementation, we'd deduct from character resources

  if (ability.cooldown && ability.cooldown > 0) {
    db.prepare(`UPDATE abilities SET current_cooldown = ? WHERE id = ?`)
      .run(ability.cooldown, abilityId);
  }

  return {
    success: true,
    ability: { ...ability, currentCooldown: ability.cooldown || 0 },
    costsPaid: ability.cost,
  };
}

export function tickCooldowns(gameId: string, amount = 1): Ability[] {
  const db = getDatabase();

  // Get all abilities on cooldown
  const rows = db.prepare(`
    SELECT * FROM abilities WHERE game_id = ? AND current_cooldown > 0
  `).all(gameId) as Record<string, unknown>[];

  const updated: Ability[] = [];

  for (const row of rows) {
    const currentCooldown = row.current_cooldown as number;
    const newCooldown = Math.max(0, currentCooldown - amount);

    db.prepare(`UPDATE abilities SET current_cooldown = ? WHERE id = ?`)
      .run(newCooldown, row.id);

    updated.push({
      id: row.id as string,
      gameId: row.game_id as string,
      ownerId: row.owner_id as string | null,
      ownerType: row.owner_type as "template" | "character",
      name: row.name as string,
      description: row.description as string,
      category: row.category as string | null,
      cost: safeJsonParse<Record<string, number>>(row.cost as string || "{}", {}),
      cooldown: row.cooldown as number | null,
      currentCooldown: newCooldown,
      effects: safeJsonParse<string[]>(row.effects as string || "[]", []),
      requirements: safeJsonParse<Record<string, number>>(row.requirements as string || "{}", {}),
      tags: safeJsonParse<string[]>(row.tags as string || "[]", []),
      createdAt: row.created_at as string,
    });
  }

  return updated;
}

export interface RequirementCheck {
  meetsRequirements: boolean;
  missing: Record<string, { required: number; actual: number }>;
}

export function checkRequirements(abilityId: string, characterId: string): RequirementCheck | null {
  const ability = getAbility(abilityId);
  if (!ability) return null;

  const character = getCharacter(characterId);
  if (!character) return null;

  const missing: Record<string, { required: number; actual: number }> = {};

  for (const [key, required] of Object.entries(ability.requirements)) {
    // Check attributes first, then status
    const actual = (character.attributes[key] as number | undefined)
      ?? (character.status[key] as number | undefined)
      ?? 0;

    if (actual < required) {
      missing[key] = { required, actual };
    }
  }

  return {
    meetsRequirements: Object.keys(missing).length === 0,
    missing,
  };
}
