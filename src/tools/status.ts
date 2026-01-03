import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import { safeJsonParse } from "../utils/json.js";
import type { StatusEffect } from "../types/index.js";

export function applyStatusEffect(params: {
  gameId: string;
  targetId: string;
  name: string;
  description?: string;
  effectType?: "buff" | "debuff" | "neutral";
  duration?: number;
  stacks?: number;
  maxStacks?: number;
  effects?: Record<string, number>;
  sourceId?: string;
  sourceType?: string;
  expiresAt?: string;
}): StatusEffect {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Check if effect already exists on target
  const existing = db.prepare(`
    SELECT * FROM status_effects WHERE game_id = ? AND target_id = ? AND name = ?
  `).get(params.gameId, params.targetId, params.name) as Record<string, unknown> | undefined;

  if (existing) {
    // Stack the effect
    const currentStacks = existing.stacks as number;
    const maxStacks = params.maxStacks ?? existing.max_stacks as number | null;
    const newStacks = maxStacks !== null
      ? Math.min(currentStacks + (params.stacks ?? 1), maxStacks)
      : currentStacks + (params.stacks ?? 1);

    // Refresh duration if provided
    const newDuration = params.duration ?? existing.duration as number | null;

    db.prepare(`
      UPDATE status_effects SET stacks = ?, duration = ? WHERE id = ?
    `).run(newStacks, newDuration, existing.id);

    return getStatusEffect(existing.id as string)!;
  }

  // Create new effect
  const id = uuidv4();

  db.prepare(`
    INSERT INTO status_effects (id, game_id, target_id, name, description, effect_type, duration, stacks, max_stacks, effects, source_id, source_type, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.gameId,
    params.targetId,
    params.name,
    params.description || "",
    params.effectType || null,
    params.duration ?? null,
    params.stacks ?? 1,
    params.maxStacks ?? null,
    JSON.stringify(params.effects || {}),
    params.sourceId || null,
    params.sourceType || null,
    params.expiresAt || null,
    now
  );

  return {
    id,
    gameId: params.gameId,
    targetId: params.targetId,
    name: params.name,
    description: params.description || "",
    effectType: params.effectType || null,
    duration: params.duration ?? null,
    stacks: params.stacks ?? 1,
    maxStacks: params.maxStacks ?? null,
    effects: params.effects || {},
    sourceId: params.sourceId || null,
    sourceType: params.sourceType || null,
    expiresAt: params.expiresAt || null,
    createdAt: now,
  };
}

export function getStatusEffect(id: string): StatusEffect | null {
  const db = getDatabase();
  const row = db.prepare(`SELECT * FROM status_effects WHERE id = ?`).get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    gameId: row.game_id as string,
    targetId: row.target_id as string,
    name: row.name as string,
    description: row.description as string,
    effectType: row.effect_type as "buff" | "debuff" | "neutral" | null,
    duration: row.duration as number | null,
    stacks: row.stacks as number,
    maxStacks: row.max_stacks as number | null,
    effects: safeJsonParse<Record<string, number>>(row.effects as string || "{}", {}),
    sourceId: row.source_id as string | null,
    sourceType: row.source_type as string | null,
    expiresAt: row.expires_at as string | null,
    createdAt: row.created_at as string,
  };
}

export function removeStatusEffect(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare(`DELETE FROM status_effects WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function listStatusEffects(
  targetId: string,
  filter?: { effectType?: "buff" | "debuff" | "neutral" }
): StatusEffect[] {
  const db = getDatabase();

  let query = `SELECT * FROM status_effects WHERE target_id = ?`;
  const params: (string | number)[] = [targetId];

  if (filter?.effectType) {
    query += ` AND effect_type = ?`;
    params.push(filter.effectType);
  }

  query += ` ORDER BY created_at`;

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  return rows.map(row => ({
    id: row.id as string,
    gameId: row.game_id as string,
    targetId: row.target_id as string,
    name: row.name as string,
    description: row.description as string,
    effectType: row.effect_type as "buff" | "debuff" | "neutral" | null,
    duration: row.duration as number | null,
    stacks: row.stacks as number,
    maxStacks: row.max_stacks as number | null,
    effects: safeJsonParse<Record<string, number>>(row.effects as string || "{}", {}),
    sourceId: row.source_id as string | null,
    sourceType: row.source_type as string | null,
    expiresAt: row.expires_at as string | null,
    createdAt: row.created_at as string,
  }));
}

export interface TickResult {
  expired: StatusEffect[];
  remaining: StatusEffect[];
}

export function tickDurations(gameId: string, amount = 1): TickResult {
  const db = getDatabase();

  // Get all effects with duration
  const effects = db.prepare(`
    SELECT * FROM status_effects WHERE game_id = ? AND duration IS NOT NULL
  `).all(gameId) as Record<string, unknown>[];

  const expired: StatusEffect[] = [];
  const remaining: StatusEffect[] = [];

  for (const row of effects) {
    const currentDuration = row.duration as number;
    const newDuration = currentDuration - amount;

    if (newDuration <= 0) {
      // Effect expired
      db.prepare(`DELETE FROM status_effects WHERE id = ?`).run(row.id);
      expired.push({
        id: row.id as string,
        gameId: row.game_id as string,
        targetId: row.target_id as string,
        name: row.name as string,
        description: row.description as string,
        effectType: row.effect_type as "buff" | "debuff" | "neutral" | null,
        duration: 0,
        stacks: row.stacks as number,
        maxStacks: row.max_stacks as number | null,
        effects: safeJsonParse<Record<string, number>>(row.effects as string || "{}", {}),
        sourceId: row.source_id as string | null,
        sourceType: row.source_type as string | null,
        expiresAt: row.expires_at as string | null,
        createdAt: row.created_at as string,
      });
    } else {
      // Update duration
      db.prepare(`UPDATE status_effects SET duration = ? WHERE id = ?`).run(newDuration, row.id);
      remaining.push({
        id: row.id as string,
        gameId: row.game_id as string,
        targetId: row.target_id as string,
        name: row.name as string,
        description: row.description as string,
        effectType: row.effect_type as "buff" | "debuff" | "neutral" | null,
        duration: newDuration,
        stacks: row.stacks as number,
        maxStacks: row.max_stacks as number | null,
        effects: safeJsonParse<Record<string, number>>(row.effects as string || "{}", {}),
        sourceId: row.source_id as string | null,
        sourceType: row.source_type as string | null,
        expiresAt: row.expires_at as string | null,
        createdAt: row.created_at as string,
      });
    }
  }

  return { expired, remaining };
}

export function modifyStacks(id: string, delta: number): StatusEffect | null {
  const db = getDatabase();
  const effect = getStatusEffect(id);
  if (!effect) return null;

  const newStacks = effect.stacks + delta;

  if (newStacks <= 0) {
    // Remove effect
    db.prepare(`DELETE FROM status_effects WHERE id = ?`).run(id);
    return { ...effect, stacks: 0 };
  }

  const finalStacks = effect.maxStacks !== null
    ? Math.min(newStacks, effect.maxStacks)
    : newStacks;

  db.prepare(`UPDATE status_effects SET stacks = ? WHERE id = ?`).run(finalStacks, id);

  return { ...effect, stacks: finalStacks };
}

export function clearEffects(
  targetId: string,
  filter?: { effectType?: "buff" | "debuff" | "neutral"; name?: string }
): number {
  const db = getDatabase();

  let query = `DELETE FROM status_effects WHERE target_id = ?`;
  const params: string[] = [targetId];

  if (filter?.effectType) {
    query += ` AND effect_type = ?`;
    params.push(filter.effectType);
  }

  if (filter?.name) {
    query += ` AND name = ?`;
    params.push(filter.name);
  }

  const result = db.prepare(query).run(...params);
  return result.changes;
}

export interface EffectiveModifiers {
  targetId: string;
  modifiers: Record<string, number>;
  effects: StatusEffect[];
}

export function getEffectiveModifiers(targetId: string): EffectiveModifiers {
  const effects = listStatusEffects(targetId);
  const modifiers: Record<string, number> = {};

  for (const effect of effects) {
    for (const [key, value] of Object.entries(effect.effects)) {
      // Multiply by stacks
      const totalValue = value * effect.stacks;
      modifiers[key] = (modifiers[key] || 0) + totalValue;
    }
  }

  return {
    targetId,
    modifiers,
    effects,
  };
}
