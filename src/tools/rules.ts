import { getDatabase } from "../db/connection.js";
import type { RuleSystem } from "../types/index.js";

export function setRules(sessionId: string, rules: RuleSystem): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE sessions SET rules = ?, updated_at = ? WHERE id = ?
  `);
  const result = stmt.run(JSON.stringify(rules), now, sessionId);
  return result.changes > 0;
}

export function getRules(sessionId: string): RuleSystem | null {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT rules FROM sessions WHERE id = ?`);
  const row = stmt.get(sessionId) as { rules: string | null } | undefined;

  if (!row || !row.rules) return null;
  return JSON.parse(row.rules);
}

export function updateRules(
  sessionId: string,
  updates: Partial<RuleSystem>
): RuleSystem | null {
  const currentRules = getRules(sessionId);
  if (!currentRules) return null;

  const updatedRules: RuleSystem = {
    ...currentRules,
    ...updates,
  };

  setRules(sessionId, updatedRules);
  return updatedRules;
}
