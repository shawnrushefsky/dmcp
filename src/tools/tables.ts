import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import { safeJsonParse } from "../utils/json.js";
import { validateGameExists } from "./game.js";
import type { RandomTable, TableEntry, TableRollResult } from "../types/index.js";
import { roll } from "./dice.js";

export function createTable(params: {
  gameId: string;
  name: string;
  description?: string;
  category?: string;
  entries?: TableEntry[];
  rollExpression?: string;
}): RandomTable {
  // Validate game exists to prevent orphaned records
  validateGameExists(params.gameId);

  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  const entries = params.entries || [];
  const rollExpression = params.rollExpression || "1d100";

  db.prepare(`
    INSERT INTO random_tables (id, game_id, name, description, category, entries, roll_expression, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.gameId,
    params.name,
    params.description || "",
    params.category || null,
    JSON.stringify(entries),
    rollExpression,
    now
  );

  return {
    id,
    gameId: params.gameId,
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
    gameId: row.game_id as string,
    name: row.name as string,
    description: row.description as string || "",
    category: row.category as string | null,
    entries: safeJsonParse<TableEntry[]>(row.entries as string, []),
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

export function listTables(gameId: string, category?: string): RandomTable[] {
  const db = getDatabase();

  let query = `SELECT * FROM random_tables WHERE game_id = ?`;
  const params: string[] = [gameId];

  if (category) {
    query += ` AND category = ?`;
    params.push(category);
  }

  query += ` ORDER BY name`;

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  return rows.map(row => ({
    id: row.id as string,
    gameId: row.game_id as string,
    name: row.name as string,
    description: row.description as string || "",
    category: row.category as string | null,
    entries: safeJsonParse<TableEntry[]>(row.entries as string, []),
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
      // Use cumulative comparison to avoid floating-point precision issues
      const target = Math.random() * totalWeight;
      let cumulative = 0;

      for (const entry of weightedEntries) {
        cumulative += entry.weight || 0;
        if (target < cumulative) {
          matchedEntry = entry;
          break;
        }
      }
      // Handle edge case where target equals totalWeight due to floating-point
      if (!matchedEntry && weightedEntries.length > 0) {
        matchedEntry = weightedEntries[weightedEntries.length - 1];
      }
    }
  }

  // If still no match, this indicates a table configuration error
  if (!matchedEntry) {
    throw new Error(
      `Table '${table.name}' (${tableId}) has no entry matching roll ${rollTotal} and no weighted entries. Check table configuration.`
    );
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

/**
 * Modify table entries - add and/or remove entries in a single call.
 */
export function modifyTableEntries(
  tableId: string,
  params: {
    add?: TableEntry[];
    remove?: number[]; // indices to remove
  }
): { table: RandomTable; added: number; removed: number; invalidIndices?: number[] } | null {
  const table = getTable(tableId);
  if (!table) return null;

  let entries = [...table.entries];
  let removedCount = 0;
  const invalidIndices: number[] = [];

  // Remove entries first (process in reverse order to maintain indices)
  if (params.remove && params.remove.length > 0) {
    const uniqueIndices = [...new Set(params.remove)];

    // Track invalid indices
    for (const idx of uniqueIndices) {
      if (idx < 0 || idx >= entries.length) {
        invalidIndices.push(idx);
      }
    }

    const indicesToRemove = uniqueIndices
      .filter(i => i >= 0 && i < entries.length)
      .sort((a, b) => b - a); // Sort descending

    for (const idx of indicesToRemove) {
      entries.splice(idx, 1);
      removedCount++;
    }
  }

  // Add new entries
  const addedCount = params.add?.length || 0;
  if (params.add) {
    entries = [...entries, ...params.add];
  }

  const updated = updateTable(tableId, { entries });
  if (!updated) return null;

  const result: { table: RandomTable; added: number; removed: number; invalidIndices?: number[] } = {
    table: updated,
    added: addedCount,
    removed: removedCount,
  };

  if (invalidIndices.length > 0) {
    result.invalidIndices = invalidIndices;
  }

  return result;
}

// Helper to create a simple d6 table quickly
export function createSimpleTable(
  gameId: string,
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
    gameId,
    name,
    category,
    entries,
    rollExpression: `1d${dieSize}`,
  });
}
