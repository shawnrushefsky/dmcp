import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import type { Timer } from "../types/index.js";

export function createTimer(params: {
  sessionId: string;
  name: string;
  description?: string;
  timerType: "countdown" | "stopwatch" | "clock";
  currentValue?: number;
  maxValue?: number;
  direction?: "up" | "down";
  triggerAt?: number;
  unit?: string;
  visibleToPlayers?: boolean;
}): Timer {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  const timerType = params.timerType;
  const direction = params.direction || (timerType === "stopwatch" ? "up" : "down");
  const maxValue = params.maxValue ?? (timerType === "clock" ? 6 : null);
  const currentValue = params.currentValue ?? (direction === "down" && maxValue ? maxValue : 0);
  const triggerAt = params.triggerAt ?? (direction === "down" ? 0 : maxValue);

  db.prepare(`
    INSERT INTO timers (id, session_id, name, description, timer_type, current_value, max_value, direction, trigger_at, unit, visible_to_players, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.sessionId,
    params.name,
    params.description || "",
    timerType,
    currentValue,
    maxValue,
    direction,
    triggerAt,
    params.unit || "tick",
    params.visibleToPlayers !== false ? 1 : 0,
    now
  );

  return {
    id,
    sessionId: params.sessionId,
    name: params.name,
    description: params.description || "",
    timerType,
    currentValue,
    maxValue,
    direction,
    triggerAt,
    triggered: false,
    unit: params.unit || "tick",
    visibleToPlayers: params.visibleToPlayers !== false,
    createdAt: now,
  };
}

export function getTimer(id: string): Timer | null {
  const db = getDatabase();
  const row = db.prepare(`SELECT * FROM timers WHERE id = ?`).get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    name: row.name as string,
    description: row.description as string || "",
    timerType: row.timer_type as "countdown" | "stopwatch" | "clock",
    currentValue: row.current_value as number,
    maxValue: row.max_value as number | null,
    direction: row.direction as "up" | "down",
    triggerAt: row.trigger_at as number | null,
    triggered: (row.triggered as number) === 1,
    unit: row.unit as string,
    visibleToPlayers: (row.visible_to_players as number) === 1,
    createdAt: row.created_at as string,
  };
}

export function updateTimer(
  id: string,
  updates: {
    name?: string;
    description?: string;
    maxValue?: number | null;
    triggerAt?: number | null;
    unit?: string;
    visibleToPlayers?: boolean;
  }
): Timer | null {
  const db = getDatabase();
  const current = getTimer(id);
  if (!current) return null;

  const newName = updates.name ?? current.name;
  const newDescription = updates.description ?? current.description;
  const newMaxValue = updates.maxValue !== undefined ? updates.maxValue : current.maxValue;
  const newTriggerAt = updates.triggerAt !== undefined ? updates.triggerAt : current.triggerAt;
  const newUnit = updates.unit ?? current.unit;
  const newVisible = updates.visibleToPlayers !== undefined ? updates.visibleToPlayers : current.visibleToPlayers;

  db.prepare(`
    UPDATE timers
    SET name = ?, description = ?, max_value = ?, trigger_at = ?, unit = ?, visible_to_players = ?
    WHERE id = ?
  `).run(newName, newDescription, newMaxValue, newTriggerAt, newUnit, newVisible ? 1 : 0, id);

  return {
    ...current,
    name: newName,
    description: newDescription,
    maxValue: newMaxValue,
    triggerAt: newTriggerAt,
    unit: newUnit,
    visibleToPlayers: newVisible,
  };
}

export function deleteTimer(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare(`DELETE FROM timers WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function listTimers(sessionId: string, includeTriggered = false): Timer[] {
  const db = getDatabase();

  let query = `SELECT * FROM timers WHERE session_id = ?`;
  if (!includeTriggered) {
    query += ` AND triggered = 0`;
  }
  query += ` ORDER BY name`;

  const rows = db.prepare(query).all(sessionId) as Record<string, unknown>[];

  return rows.map(row => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    name: row.name as string,
    description: row.description as string || "",
    timerType: row.timer_type as "countdown" | "stopwatch" | "clock",
    currentValue: row.current_value as number,
    maxValue: row.max_value as number | null,
    direction: row.direction as "up" | "down",
    triggerAt: row.trigger_at as number | null,
    triggered: (row.triggered as number) === 1,
    unit: row.unit as string,
    visibleToPlayers: (row.visible_to_players as number) === 1,
    createdAt: row.created_at as string,
  }));
}

export interface TickResult {
  timer: Timer;
  previousValue: number;
  justTriggered: boolean;
}

export function tickTimer(id: string, amount = 1): TickResult | null {
  const db = getDatabase();
  const timer = getTimer(id);
  if (!timer) return null;

  const previousValue = timer.currentValue;
  let newValue: number;

  if (timer.direction === "up") {
    newValue = timer.currentValue + amount;
    if (timer.maxValue !== null) {
      newValue = Math.min(newValue, timer.maxValue);
    }
  } else {
    newValue = timer.currentValue - amount;
    newValue = Math.max(newValue, 0);
  }

  // Check if triggered
  let justTriggered = false;
  if (!timer.triggered && timer.triggerAt !== null) {
    if (timer.direction === "down" && newValue <= timer.triggerAt) {
      justTriggered = true;
    } else if (timer.direction === "up" && newValue >= timer.triggerAt) {
      justTriggered = true;
    }
  }

  db.prepare(`UPDATE timers SET current_value = ?, triggered = ? WHERE id = ?`)
    .run(newValue, justTriggered || timer.triggered ? 1 : 0, id);

  return {
    timer: { ...timer, currentValue: newValue, triggered: justTriggered || timer.triggered },
    previousValue,
    justTriggered,
  };
}

export function resetTimer(id: string): Timer | null {
  const db = getDatabase();
  const timer = getTimer(id);
  if (!timer) return null;

  const newValue = timer.direction === "down" && timer.maxValue !== null ? timer.maxValue : 0;

  db.prepare(`UPDATE timers SET current_value = ?, triggered = 0 WHERE id = ?`)
    .run(newValue, id);

  return { ...timer, currentValue: newValue, triggered: false };
}

export interface TimerRender {
  timer: Timer;
  ascii: string;
  percentage: number;
}

export function renderTimer(id: string): TimerRender | null {
  const timer = getTimer(id);
  if (!timer) return null;

  const { currentValue, maxValue, timerType, name, triggered } = timer;

  let ascii: string;
  let percentage = 0;

  if (timerType === "clock") {
    // Render as a segmented clock (like Blades in the Dark)
    const segments = maxValue || 6;
    const filled = Math.min(currentValue, segments);
    percentage = segments > 0 ? (filled / segments) * 100 : 0;

    const filledChar = "●";
    const emptyChar = "○";

    const clockFace = Array(segments)
      .fill(emptyChar)
      .map((_, i) => (i < filled ? filledChar : emptyChar))
      .join(" ");

    ascii = `
┌${"─".repeat(name.length + 4)}┐
│  ${name}  │
├${"─".repeat(name.length + 4)}┤
│  ${clockFace.padEnd(name.length + 2)}│
│  ${filled}/${segments} segments${" ".repeat(Math.max(0, name.length - 10))}│
└${"─".repeat(name.length + 4)}┘${triggered ? " ⚠ TRIGGERED!" : ""}`;
  } else {
    // Render as progress bar
    const max = maxValue || 100;
    const current = Math.min(currentValue, max);
    percentage = max > 0 ? (current / max) * 100 : 0;

    const barWidth = 20;
    const filledWidth = Math.round((current / max) * barWidth);
    const emptyWidth = barWidth - filledWidth;

    const bar = "█".repeat(filledWidth) + "░".repeat(emptyWidth);
    const label = timerType === "countdown" ? "remaining" : "elapsed";

    ascii = `
┌${"─".repeat(Math.max(name.length + 4, 26))}┐
│  ${name.padEnd(Math.max(name.length, 22))}  │
├${"─".repeat(Math.max(name.length + 4, 26))}┤
│  [${bar}]  │
│  ${current}/${max} ${timer.unit} ${label}${" ".repeat(Math.max(0, 10 - label.length))}│
└${"─".repeat(Math.max(name.length + 4, 26))}┘${triggered ? " ⚠ TRIGGERED!" : ""}`;
  }

  return { timer, ascii: ascii.trim(), percentage };
}
