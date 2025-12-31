import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import type { RandomTable, TableEntry, TableRollResult, DiceRoll } from "../types/index.js";
import { roll } from "./dice.js";

export function createTable(params: {
  sessionId: string;
  name: string;
  description?: string;
  category?: string;
  entries?: TableEntry[];
  rollExpression?: string;
}): RandomTable {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  const entries = params.entries || [];
  const rollExpression = params.rollExpression || "1d100";

  db.prepare(`
    INSERT INTO random_tables (id, session_id, name, description, category, entries, roll_expression, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.sessionId,
    params.name,
    params.description || "",
    params.category || null,
    JSON.stringify(entries),
    rollExpression,
    now
  );

  return {
    id,
    sessionId: params.sessionId,
    name: params.name,
    description: params.description || "",
    category: params.category || null,
    entries,
    rollExpression,
    createdAt: now,
  };
}

export function getTable(id: string): RandomTable | null {
  const db = getDatabase();
  const row = db.prepare(`SELECT * FROM random_tables WHERE id = ?`).get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    name: row.name as string,
    description: row.description as string || "",
    category: row.category as string | null,
    entries: JSON.parse(row.entries as string),
    rollExpression: row.roll_expression as string,
    createdAt: row.created_at as string,
  };
}

export function updateTable(
  id: string,
  updates: {
    name?: string;
    description?: string;
    category?: string | null;
    entries?: TableEntry[];
    rollExpression?: string;
  }
): RandomTable | null {
  const db = getDatabase();
  const current = getTable(id);
  if (!current) return null;

  const newName = updates.name ?? current.name;
  const newDescription = updates.description ?? current.description;
  const newCategory = updates.category !== undefined ? updates.category : current.category;
  const newEntries = updates.entries ?? current.entries;
  const newRollExpression = updates.rollExpression ?? current.rollExpression;

  db.prepare(`
    UPDATE random_tables
    SET name = ?, description = ?, category = ?, entries = ?, roll_expression = ?
    WHERE id = ?
  `).run(newName, newDescription, newCategory, JSON.stringify(newEntries), newRollExpression, id);

  return {
    ...current,
    name: newName,
    description: newDescription,
    category: newCategory,
    entries: newEntries,
    rollExpression: newRollExpression,
  };
}

export function deleteTable(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare(`DELETE FROM random_tables WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function listTables(sessionId: string, category?: string): RandomTable[] {
  const db = getDatabase();

  let query = `SELECT * FROM random_tables WHERE session_id = ?`;
  const params: string[] = [sessionId];

  if (category) {
    query += ` AND category = ?`;
    params.push(category);
  }

  query += ` ORDER BY name`;

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  return rows.map(row => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    name: row.name as string,
    description: row.description as string || "",
    category: row.category as string | null,
    entries: JSON.parse(row.entries as string),
    rollExpression: row.roll_expression as string,
    createdAt: row.created_at as string,
  }));
}

export function rollTable(tableId: string, modifier = 0): TableRollResult | null {
  const table = getTable(tableId);
  if (!table || table.entries.length === 0) return null;

  const diceRoll = roll(table.rollExpression);
  const rollTotal = diceRoll.total + modifier;

  // Find matching entry
  let matchedEntry: TableEntry | null = null;

  for (const entry of table.entries) {
    if (rollTotal >= entry.minRoll && rollTotal <= entry.maxRoll) {
      matchedEntry = entry;
      break;
    }
  }

  // If no range match, try weighted random
  if (!matchedEntry) {
    const weightedEntries = table.entries.filter(e => e.weight !== undefined && e.weight > 0);
    if (weightedEntries.length > 0) {
      const totalWeight = weightedEntries.reduce((sum, e) => sum + (e.weight || 0), 0);
      let random = Math.random() * totalWeight;

      for (const entry of weightedEntries) {
        random -= entry.weight || 0;
        if (random <= 0) {
          matchedEntry = entry;
          break;
        }
      }
    }
  }

  // Fallback to first entry if still no match
  if (!matchedEntry) {
    matchedEntry = table.entries[0];
  }

  const result: TableRollResult = {
    table,
    roll: diceRoll,
    entry: matchedEntry,
    result: matchedEntry.result,
  };

  // Handle subtable
  if (matchedEntry.subtable) {
    const subtableResult = rollTable(matchedEntry.subtable, 0);
    if (subtableResult) {
      result.subtableResults = [subtableResult];
    }
  }

  return result;
}

export function addTableEntry(tableId: string, entry: TableEntry): RandomTable | null {
  const table = getTable(tableId);
  if (!table) return null;

  const newEntries = [...table.entries, entry];

  return updateTable(tableId, { entries: newEntries });
}

export function removeTableEntry(tableId: string, index: number): RandomTable | null {
  const table = getTable(tableId);
  if (!table) return null;

  if (index < 0 || index >= table.entries.length) {
    return null;
  }

  const newEntries = table.entries.filter((_, i) => i !== index);

  return updateTable(tableId, { entries: newEntries });
}

// Helper to create a simple d6 table quickly
export function createSimpleTable(
  sessionId: string,
  name: string,
  results: string[],
  category?: string
): RandomTable {
  const dieSize = results.length;
  const entries: TableEntry[] = results.map((result, i) => ({
    minRoll: i + 1,
    maxRoll: i + 1,
    result,
  }));

  return createTable({
    sessionId,
    name,
    category,
    entries,
    rollExpression: `1d${dieSize}`,
  });
}
