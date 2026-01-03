import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as timeTools from "../tools/time.js";
import * as timerTools from "../tools/timers.js";
import { LIMITS } from "../utils/validation.js";
import { ANNOTATIONS } from "../utils/tool-annotations.js";

const gameDateTimeSchema = z.object({
  year: z.number(),
  month: z.number(),
  day: z.number(),
  hour: z.number(),
  minute: z.number(),
});

export function registerTimeTools(server: McpServer) {
  // ============================================================================
  // TIME/CALENDAR TOOLS
  // ============================================================================

  server.registerTool(
    "set_calendar",
    {
      description: "Configure the calendar system for a game (months, days per month, hours per day, etc.)",
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
        config: z.object({
          monthNames: z.array(z.string().max(100)).max(24).optional().describe("Names of months"),
          daysPerMonth: z.array(z.number()).max(24).optional().describe("Days in each month"),
          hoursPerDay: z.number().optional().describe("Hours per day (default: 24)"),
          minutesPerHour: z.number().optional().describe("Minutes per hour (default: 60)"),
          startYear: z.number().optional().describe("Starting year number"),
          eraName: z.string().max(LIMITS.NAME_MAX).optional().describe("Name of the era/age"),
        }).optional().describe("Calendar configuration (defaults to fantasy calendar)"),
        currentTime: gameDateTimeSchema.optional().describe("Starting time"),
      },
      annotations: ANNOTATIONS.SET,
    },
    async ({ gameId, config, currentTime }) => {
      const gameTime = timeTools.setCalendar(gameId, config || {}, currentTime);
      return {
        content: [{ type: "text", text: JSON.stringify(gameTime, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_time",
    {
      description: "Get the current in-game time",
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ gameId }) => {
      const gameTime = timeTools.getTime(gameId);
      if (!gameTime) {
        return {
          content: [{ type: "text", text: "No calendar set for this game. Use set_calendar first." }],
          isError: true,
        };
      }
      const formatted = timeTools.formatDateTime(gameTime.currentTime, gameTime.calendarConfig);
      return {
        content: [{ type: "text", text: JSON.stringify({ ...gameTime, formatted }, null, 2) }],
      };
    }
  );

  server.registerTool(
    "set_time",
    {
      description: "Set the current in-game time to a specific value",
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
        time: gameDateTimeSchema.describe("The time to set"),
      },
      annotations: ANNOTATIONS.SET,
    },
    async ({ gameId, time }) => {
      const gameTime = timeTools.setTime(gameId, time);
      if (!gameTime) {
        return {
          content: [{ type: "text", text: "No calendar set for this session" }],
          isError: true,
        };
      }
      const formatted = timeTools.formatDateTime(gameTime.currentTime, gameTime.calendarConfig);
      return {
        content: [{ type: "text", text: JSON.stringify({ ...gameTime, formatted }, null, 2) }],
      };
    }
  );

  server.registerTool(
    "advance_time",
    {
      description: "Advance time by a duration, returning any triggered scheduled events",
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
        days: z.number().optional().describe("Days to advance"),
        hours: z.number().optional().describe("Hours to advance"),
        minutes: z.number().optional().describe("Minutes to advance"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ gameId, days, hours, minutes }) => {
      const result = timeTools.advanceTime(gameId, { days, hours, minutes });
      if (!result) {
        return {
          content: [{ type: "text", text: "No calendar set for this session" }],
          isError: true,
        };
      }
      const gameTime = timeTools.getTime(gameId)!;
      const formatted = timeTools.formatDateTime(result.newTime, gameTime.calendarConfig);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ...result,
            formatted,
            triggeredCount: result.triggeredEvents.length,
          }, null, 2),
        }],
      };
    }
  );

  server.registerTool(
    "schedule_event",
    {
      description: "Schedule an event to trigger at a specific in-game time",
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
        name: z.string().min(1).max(LIMITS.NAME_MAX).describe("Event name"),
        description: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("Event description"),
        triggerTime: gameDateTimeSchema.describe("When the event should trigger"),
        recurring: z.enum(["daily", "weekly", "monthly", "yearly"]).optional().describe("Recurrence pattern"),
        metadata: z.record(z.string(), z.unknown()).optional().describe("Additional event data"),
      },
      annotations: ANNOTATIONS.CREATE,
    },
    async (params) => {
      const event = timeTools.scheduleEvent(params);
      return {
        content: [{ type: "text", text: JSON.stringify(event, null, 2) }],
      };
    }
  );

  server.registerTool(
    "list_scheduled_events",
    {
      description: "List upcoming scheduled events",
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
        includeTriggered: z.boolean().optional().describe("Include already-triggered events"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ gameId, includeTriggered }) => {
      const events = timeTools.listScheduledEvents(gameId, includeTriggered);
      return {
        content: [{ type: "text", text: JSON.stringify(events, null, 2) }],
      };
    }
  );

  server.registerTool(
    "cancel_event",
    {
      description: "Cancel a scheduled event",
      inputSchema: {
        eventId: z.string().max(100).describe("The event ID to cancel"),
      },
      annotations: ANNOTATIONS.DESTRUCTIVE,
    },
    async ({ eventId }) => {
      const success = timeTools.cancelEvent(eventId);
      return {
        content: [{ type: "text", text: success ? "Event cancelled" : "Event not found" }],
        isError: !success,
      };
    }
  );

  // ============================================================================
  // TIMER TOOLS
  // ============================================================================

  server.registerTool(
    "create_timer",
    {
      description: "Create a countdown, stopwatch, or segmented clock",
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
        name: z.string().min(1).max(LIMITS.NAME_MAX).describe("Timer name (e.g., 'Doom Clock', 'Ritual Progress')"),
        description: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("Timer description"),
        timerType: z.enum(["countdown", "stopwatch", "clock"]).describe("Type: countdown (decreases), stopwatch (increases), clock (segmented like Blades in the Dark)"),
        currentValue: z.number().optional().describe("Starting value"),
        maxValue: z.number().optional().describe("Maximum value (for clocks: number of segments, default 6)"),
        direction: z.enum(["up", "down"]).optional().describe("Direction of change"),
        triggerAt: z.number().optional().describe("Value that triggers an event. If not provided, defaults to 0 for countdowns (direction 'down') or maxValue for stopwatches (direction 'up')"),
        unit: z.string().max(100).optional().describe("Unit label (e.g., 'rounds', 'hours', 'segments')"),
        visibleToPlayers: z.boolean().optional().describe("Whether players can see this timer"),
      },
      annotations: ANNOTATIONS.CREATE,
    },
    async (params) => {
      const timer = timerTools.createTimer(params);
      return {
        content: [{ type: "text", text: JSON.stringify(timer, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_timer",
    {
      description: "Get timer details",
      inputSchema: {
        timerId: z.string().max(100).describe("The timer ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ timerId }) => {
      const timer = timerTools.getTimer(timerId);
      if (!timer) {
        return {
          content: [{ type: "text", text: "Timer not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(timer, null, 2) }],
      };
    }
  );

  server.registerTool(
    "update_timer",
    {
      description: "Update timer settings",
      inputSchema: {
        timerId: z.string().max(100).describe("The timer ID"),
        name: z.string().max(LIMITS.NAME_MAX).optional().describe("New name"),
        description: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("New description"),
        maxValue: z.number().nullable().optional().describe("New max value"),
        triggerAt: z.number().nullable().optional().describe("New trigger value"),
        unit: z.string().max(100).optional().describe("New unit label"),
        visibleToPlayers: z.boolean().optional().describe("Visibility to players"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ timerId, ...updates }) => {
      const timer = timerTools.updateTimer(timerId, updates);
      if (!timer) {
        return {
          content: [{ type: "text", text: "Timer not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(timer, null, 2) }],
      };
    }
  );

  server.registerTool(
    "delete_timer",
    {
      description: "Delete a timer",
      inputSchema: {
        timerId: z.string().max(100).describe("The timer ID"),
      },
      annotations: ANNOTATIONS.DESTRUCTIVE,
    },
    async ({ timerId }) => {
      const success = timerTools.deleteTimer(timerId);
      return {
        content: [{ type: "text", text: success ? "Timer deleted" : "Timer not found" }],
        isError: !success,
      };
    }
  );

  server.registerTool(
    "list_timers",
    {
      description: "List active timers in a game",
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
        includeTriggered: z.boolean().optional().describe("Include triggered timers"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ gameId, includeTriggered }) => {
      const timers = timerTools.listTimers(gameId, includeTriggered);
      return {
        content: [{ type: "text", text: JSON.stringify(timers, null, 2) }],
      };
    }
  );

  // ============================================================================
  // MODIFY TIMER - CONSOLIDATED (replaces tick_timer + reset_timer)
  // ============================================================================
  server.registerTool(
    "modify_timer",
    {
      description: "Modify a timer's state. Use mode 'tick' to advance by amount, or 'reset' to reset to initial state.",
      inputSchema: {
        timerId: z.string().max(100).describe("The timer ID"),
        mode: z.enum(["tick", "reset"]).describe("'tick' to advance/reduce, 'reset' to reset to initial state"),
        amount: z.number().optional().describe("Amount to tick (only for mode 'tick', default: 1)"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ timerId, mode, amount }) => {
      const result = timerTools.modifyTimerState(timerId, { mode, amount });
      if (!result) {
        return {
          content: [{ type: "text", text: "Timer not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

}
