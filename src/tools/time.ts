import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import { safeJsonParse } from "../utils/json.js";
import type { GameTime, GameDateTime, CalendarConfig, ScheduledEvent } from "../types/index.js";

// Default calendar (fantasy-style)
const DEFAULT_CALENDAR: CalendarConfig = {
  monthNames: [
    "Deepwinter", "Thawing", "Seedtime", "Blossoming", "Highsun", "Summertide",
    "Harvest", "Leaffall", "Dimming", "Frostfall", "Darknight", "Yearsend"
  ],
  daysPerMonth: [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  hoursPerDay: 24,
  minutesPerHour: 60,
  startYear: 1,
  eraName: "Age of Wonder",
};

function dateTimeToMinutes(dt: GameDateTime, config: CalendarConfig): number {
  let totalMinutes = dt.minute;
  totalMinutes += dt.hour * config.minutesPerHour;
  totalMinutes += dt.day * config.hoursPerDay * config.minutesPerHour;

  // Add days from previous months
  for (let m = 0; m < dt.month; m++) {
    totalMinutes += config.daysPerMonth[m] * config.hoursPerDay * config.minutesPerHour;
  }

  // Add days from previous years
  const daysPerYear = config.daysPerMonth.reduce((a, b) => a + b, 0);
  totalMinutes += (dt.year - config.startYear) * daysPerYear * config.hoursPerDay * config.minutesPerHour;

  return totalMinutes;
}

function minutesToDateTime(totalMinutes: number, config: CalendarConfig): GameDateTime {
  const minutesPerHour = config.minutesPerHour;
  const minutesPerDay = config.hoursPerDay * minutesPerHour;
  const daysPerYear = config.daysPerMonth.reduce((a, b) => a + b, 0);
  const minutesPerYear = daysPerYear * minutesPerDay;

  let remaining = totalMinutes;

  const year = config.startYear + Math.floor(remaining / minutesPerYear);
  remaining = remaining % minutesPerYear;

  let month = 0;
  let daysSoFar = 0;
  for (let m = 0; m < config.daysPerMonth.length; m++) {
    const monthMinutes = config.daysPerMonth[m] * minutesPerDay;
    if (remaining < monthMinutes) {
      month = m;
      break;
    }
    remaining -= monthMinutes;
    daysSoFar += config.daysPerMonth[m];
  }

  const day = Math.floor(remaining / minutesPerDay);
  remaining = remaining % minutesPerDay;

  const hour = Math.floor(remaining / minutesPerHour);
  const minute = remaining % minutesPerHour;

  return { year, month, day, hour, minute };
}

function compareDateTime(a: GameDateTime, b: GameDateTime, config: CalendarConfig): number {
  return dateTimeToMinutes(a, config) - dateTimeToMinutes(b, config);
}

export function setCalendar(sessionId: string, config: Partial<CalendarConfig>, currentTime?: GameDateTime): GameTime {
  const db = getDatabase();

  const calendarConfig: CalendarConfig = {
    ...DEFAULT_CALENDAR,
    ...config,
  };

  const time: GameDateTime = currentTime || {
    year: calendarConfig.startYear,
    month: 0,
    day: 0,
    hour: 8,
    minute: 0,
  };

  // Upsert
  const existing = db.prepare(`SELECT session_id FROM game_time WHERE session_id = ?`).get(sessionId);

  if (existing) {
    db.prepare(`UPDATE game_time SET current_time = ?, calendar_config = ? WHERE session_id = ?`)
      .run(JSON.stringify(time), JSON.stringify(calendarConfig), sessionId);
  } else {
    db.prepare(`INSERT INTO game_time (session_id, current_time, calendar_config) VALUES (?, ?, ?)`)
      .run(sessionId, JSON.stringify(time), JSON.stringify(calendarConfig));
  }

  return { sessionId, currentTime: time, calendarConfig };
}

export function getTime(sessionId: string): GameTime | null {
  const db = getDatabase();
  const row = db.prepare(`SELECT * FROM game_time WHERE session_id = ?`).get(sessionId) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    sessionId: row.session_id as string,
    currentTime: safeJsonParse<GameDateTime>(row.current_time as string, { year: 1, month: 1, day: 1, hour: 0, minute: 0 }),
    calendarConfig: safeJsonParse<CalendarConfig>(row.calendar_config as string, DEFAULT_CALENDAR),
  };
}

export function setTime(sessionId: string, time: GameDateTime): GameTime | null {
  const db = getDatabase();
  const gameTime = getTime(sessionId);
  if (!gameTime) return null;

  db.prepare(`UPDATE game_time SET current_time = ? WHERE session_id = ?`)
    .run(JSON.stringify(time), sessionId);

  return { ...gameTime, currentTime: time };
}

export interface AdvanceResult {
  previousTime: GameDateTime;
  newTime: GameDateTime;
  triggeredEvents: ScheduledEvent[];
}

export function advanceTime(
  sessionId: string,
  duration: { days?: number; hours?: number; minutes?: number }
): AdvanceResult | null {
  const db = getDatabase();
  const gameTime = getTime(sessionId);
  if (!gameTime) return null;

  const { currentTime, calendarConfig } = gameTime;
  const previousTime = { ...currentTime };

  // Convert to minutes, add, convert back
  let totalMinutes = dateTimeToMinutes(currentTime, calendarConfig);
  totalMinutes += (duration.minutes || 0);
  totalMinutes += (duration.hours || 0) * calendarConfig.minutesPerHour;
  totalMinutes += (duration.days || 0) * calendarConfig.hoursPerDay * calendarConfig.minutesPerHour;

  const newTime = minutesToDateTime(totalMinutes, calendarConfig);

  // Update time
  db.prepare(`UPDATE game_time SET current_time = ? WHERE session_id = ?`)
    .run(JSON.stringify(newTime), sessionId);

  // Check for triggered events
  const events = db.prepare(`
    SELECT * FROM scheduled_events
    WHERE session_id = ? AND triggered = 0
  `).all(sessionId) as Record<string, unknown>[];

  const triggeredEvents: ScheduledEvent[] = [];

  for (const row of events) {
    const triggerTime = safeJsonParse<GameDateTime>(row.trigger_time as string, { year: 1, month: 1, day: 1, hour: 0, minute: 0 });

    // Check if event should trigger (trigger time is between previous and new time)
    if (
      compareDateTime(triggerTime, previousTime, calendarConfig) >= 0 &&
      compareDateTime(triggerTime, newTime, calendarConfig) <= 0
    ) {
      const event: ScheduledEvent = {
        id: row.id as string,
        sessionId: row.session_id as string,
        name: row.name as string,
        description: row.description as string || "",
        triggerTime,
        recurring: row.recurring as string | null,
        triggered: true,
        metadata: safeJsonParse<Record<string, unknown>>(row.metadata as string || "{}", {}),
      };

      triggeredEvents.push(event);

      // Mark as triggered or reschedule if recurring
      if (event.recurring) {
        // Reschedule
        const newTrigger = rescheduleEvent(triggerTime, event.recurring, calendarConfig);
        db.prepare(`UPDATE scheduled_events SET trigger_time = ? WHERE id = ?`)
          .run(JSON.stringify(newTrigger), event.id);
      } else {
        db.prepare(`UPDATE scheduled_events SET triggered = 1 WHERE id = ?`)
          .run(event.id);
      }
    }
  }

  return { previousTime, newTime, triggeredEvents };
}

function rescheduleEvent(current: GameDateTime, recurring: string, config: CalendarConfig): GameDateTime {
  const minutesPerDay = config.hoursPerDay * config.minutesPerHour;
  const daysPerYear = config.daysPerMonth.reduce((a, b) => a + b, 0);
  let minutes = dateTimeToMinutes(current, config);

  switch (recurring) {
    case "daily":
      minutes += minutesPerDay;
      break;
    case "weekly":
      minutes += minutesPerDay * 7;
      break;
    case "monthly":
      minutes += config.daysPerMonth[current.month] * minutesPerDay;
      break;
    case "yearly":
      minutes += daysPerYear * minutesPerDay;
      break;
  }

  return minutesToDateTime(minutes, config);
}

export function scheduleEvent(params: {
  sessionId: string;
  name: string;
  description?: string;
  triggerTime: GameDateTime;
  recurring?: string;
  metadata?: Record<string, unknown>;
}): ScheduledEvent {
  const db = getDatabase();
  const id = uuidv4();

  db.prepare(`
    INSERT INTO scheduled_events (id, session_id, name, description, trigger_time, recurring, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.sessionId,
    params.name,
    params.description || "",
    JSON.stringify(params.triggerTime),
    params.recurring || null,
    JSON.stringify(params.metadata || {})
  );

  return {
    id,
    sessionId: params.sessionId,
    name: params.name,
    description: params.description || "",
    triggerTime: params.triggerTime,
    recurring: params.recurring || null,
    triggered: false,
    metadata: params.metadata || {},
  };
}

export function listScheduledEvents(sessionId: string, includeTriggered = false): ScheduledEvent[] {
  const db = getDatabase();

  let query = `SELECT * FROM scheduled_events WHERE session_id = ?`;
  if (!includeTriggered) {
    query += ` AND triggered = 0`;
  }
  query += ` ORDER BY trigger_time`;

  const rows = db.prepare(query).all(sessionId) as Record<string, unknown>[];

  return rows.map(row => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    name: row.name as string,
    description: row.description as string || "",
    triggerTime: safeJsonParse<GameDateTime>(row.trigger_time as string, { year: 1, month: 1, day: 1, hour: 0, minute: 0 }),
    recurring: row.recurring as string | null,
    triggered: (row.triggered as number) === 1,
    metadata: safeJsonParse<Record<string, unknown>>(row.metadata as string || "{}", {}),
  }));
}

export function cancelEvent(eventId: string): boolean {
  const db = getDatabase();
  const result = db.prepare(`DELETE FROM scheduled_events WHERE id = ?`).run(eventId);
  return result.changes > 0;
}

export function formatDateTime(dt: GameDateTime, config: CalendarConfig): string {
  const monthName = config.monthNames[dt.month] || `Month ${dt.month + 1}`;
  const hour = dt.hour.toString().padStart(2, "0");
  const minute = dt.minute.toString().padStart(2, "0");
  const era = config.eraName ? ` ${config.eraName}` : "";

  return `${dt.day + 1} ${monthName}, Year ${dt.year}${era} - ${hour}:${minute}`;
}
