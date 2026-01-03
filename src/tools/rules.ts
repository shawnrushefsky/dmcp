import { getDatabase } from "../db/connection.js";
import { safeJsonParseOrNull } from "../utils/json.js";
import type { RuleSystem } from "../types/index.js";

export function setRules(gameId: string, rules: RuleSystem): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE games SET rules = ?, updated_at = ? WHERE id = ?
  `);
  const result = stmt.run(JSON.stringify(rules), now, gameId);
  return result.changes > 0;
}

export function getRules(gameId: string): RuleSystem | null {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT rules FROM games WHERE id = ?`);
  const row = stmt.get(gameId) as { rules: string | null } | undefined;

  if (!row || !row.rules) return null;
  return safeJsonParseOrNull<RuleSystem>(row.rules);
}

export function updateRules(
  gameId: string,
  updates: Partial<RuleSystem>
): RuleSystem | null {
  const currentRules = getRules(gameId);
  if (!currentRules) return null;

  const updatedRules: RuleSystem = {
    ...currentRules,
    ...updates,
  };

  setRules(gameId, updatedRules);
  return updatedRules;
}
