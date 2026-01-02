import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import { safeJsonParse } from "../utils/json.js";
import type { Quest, QuestObjective } from "../types/index.js";

export function createQuest(params: {
  sessionId: string;
  name: string;
  description: string;
  objectives: Omit<QuestObjective, "id">[];
  rewards?: string;
}): Quest {
  const db = getDatabase();
  const id = uuidv4();

  const objectives: QuestObjective[] = params.objectives.map((obj) => ({
    id: uuidv4(),
    description: obj.description,
    completed: obj.completed || false,
    optional: obj.optional,
  }));

  const stmt = db.prepare(`
    INSERT INTO quests (id, session_id, name, description, objectives, status, rewards)
    VALUES (?, ?, ?, ?, ?, 'active', ?)
  `);

  stmt.run(
    id,
    params.sessionId,
    params.name,
    params.description,
    JSON.stringify(objectives),
    params.rewards || null
  );

  return {
    id,
    sessionId: params.sessionId,
    name: params.name,
    description: params.description,
    objectives,
    status: "active",
    rewards: params.rewards,
  };
}

export function getQuest(id: string): Quest | null {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM quests WHERE id = ?`);
  const row = stmt.get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    name: row.name as string,
    description: row.description as string,
    objectives: safeJsonParse<QuestObjective[]>(row.objectives as string, []),
    status: row.status as Quest["status"],
    rewards: row.rewards as string | undefined,
  };
}

export function updateQuest(
  id: string,
  updates: {
    name?: string;
    description?: string;
    status?: Quest["status"];
    rewards?: string;
  }
): Quest | null {
  const db = getDatabase();
  const current = getQuest(id);
  if (!current) return null;

  const newName = updates.name ?? current.name;
  const newDescription = updates.description ?? current.description;
  const newStatus = updates.status ?? current.status;
  const newRewards = updates.rewards ?? current.rewards;

  const stmt = db.prepare(`
    UPDATE quests SET name = ?, description = ?, status = ?, rewards = ? WHERE id = ?
  `);

  stmt.run(newName, newDescription, newStatus, newRewards || null, id);

  return {
    ...current,
    name: newName,
    description: newDescription,
    status: newStatus,
    rewards: newRewards,
  };
}

/**
 * Modify quest objectives - add new objectives and/or complete existing ones in a single call.
 */
export function modifyObjectives(
  questId: string,
  params: {
    add?: Array<{ description: string; optional?: boolean }>;
    complete?: string[]; // objective IDs to mark complete
  }
): { quest: Quest; added: QuestObjective[]; completed: string[] } | null {
  const db = getDatabase();
  const quest = getQuest(questId);
  if (!quest) return null;

  let objectives = [...quest.objectives];
  const added: QuestObjective[] = [];
  const completed: string[] = [];

  // Complete objectives first
  if (params.complete) {
    for (const objectiveId of params.complete) {
      const idx = objectives.findIndex((o) => o.id === objectiveId);
      if (idx !== -1 && !objectives[idx].completed) {
        objectives[idx] = { ...objectives[idx], completed: true };
        completed.push(objectiveId);
      }
    }
  }

  // Add new objectives
  if (params.add) {
    for (const obj of params.add) {
      const newObjective: QuestObjective = {
        id: uuidv4(),
        description: obj.description,
        completed: false,
        optional: obj.optional,
      };
      objectives.push(newObjective);
      added.push(newObjective);
    }
  }

  const stmt = db.prepare(`UPDATE quests SET objectives = ? WHERE id = ?`);
  stmt.run(JSON.stringify(objectives), questId);

  // Check if all required objectives are complete
  const requiredComplete = objectives
    .filter((o) => !o.optional)
    .every((o) => o.completed);

  let finalQuest: Quest;
  if (requiredComplete && quest.status === "active") {
    updateQuest(questId, { status: "completed" });
    finalQuest = { ...quest, objectives, status: "completed" };
  } else {
    finalQuest = { ...quest, objectives };
  }

  return { quest: finalQuest, added, completed };
}

export function deleteQuest(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`DELETE FROM quests WHERE id = ?`);
  const result = stmt.run(id);
  return result.changes > 0;
}

export function listQuests(
  sessionId: string,
  filter?: {
    status?: Quest["status"];
  }
): Quest[] {
  const db = getDatabase();
  let query = `SELECT * FROM quests WHERE session_id = ?`;
  const params: string[] = [sessionId];

  if (filter?.status) {
    query += ` AND status = ?`;
    params.push(filter.status);
  }

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    name: row.name as string,
    description: row.description as string,
    objectives: safeJsonParse<QuestObjective[]>(row.objectives as string, []),
    status: row.status as Quest["status"],
    rewards: row.rewards as string | undefined,
  }));
}

export function getActiveQuests(sessionId: string): Quest[] {
  return listQuests(sessionId, { status: "active" });
}
