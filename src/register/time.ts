import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as timeTools from "../tools/time.js";
import * as timerTools from "../tools/timers.js";
import { LIMITS } from "../utils/validation.js";

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

  server.tool(
    "set_calendar",
    "Configure the calendar system for a session (months, days per month, hours per day, etc.)",
    {
      sessionId: z.string().max(100).describe("The session ID"),
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
    async ({ sessionId, config, currentTime }) => {
      const gameTime = timeTools.setCalendar(sessionId, config || {}, currentTime);
      return {
        content: [{ type: "text", text: JSON.stringify(gameTime, null, 2) }],
      };
    }
  );

  server.tool(
    "get_time",
    "Get the current in-game time",
    {
      sessionId: z.string().max(100).describe("The session ID"),
    },
    async ({ sessionId }) => {
      const gameTime = timeTools.getTime(sessionId);
      if (!gameTime) {
        return {
          content: [{ type: "text", text: "No calendar set for this session. Use set_calendar first." }],
          isError: true,
        };
      }
      const formatted = timeTools.formatDateTime(gameTime.currentTime, gameTime.calendarConfig);
      return {
        content: [{ type: "text", text: JSON.stringify({ ...gameTime, formatted }, null, 2) }],
      };
    }
  );

  server.tool(
    "set_time",
    "Set the current in-game time to a specific value",
    {
      sessionId: z.string().max(100).describe("The session ID"),
      time: gameDateTimeSchema.describe("The time to set"),
    },
    async ({ sessionId, time }) => {
      const gameTime = timeTools.setTime(sessionId, time);
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

  server.tool(
    "advance_time",
    "Advance time by a duration, returning any triggered scheduled events",
    {
      sessionId: z.string().max(100).describe("The session ID"),
      days: z.number().optional().describe("Days to advance"),
      hours: z.number().optional().describe("Hours to advance"),
      minutes: z.number().optional().describe("Minutes to advance"),
    },
    async ({ sessionId, days, hours, minutes }) => {
      const result = timeTools.advanceTime(sessionId, { days, hours, minutes });
      if (!result) {
        return {
          content: [{ type: "text", text: "No calendar set for this session" }],
          isError: true,
        };
      }
      const gameTime = timeTools.getTime(sessionId)!;
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

  server.tool(
    "schedule_event",
    "Schedule an event to trigger at a specific in-game time",
    {
      sessionId: z.string().max(100).describe("The session ID"),
      name: z.string().min(1).max(LIMITS.NAME_MAX).describe("Event name"),
      description: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("Event description"),
      triggerTime: gameDateTimeSchema.describe("When the event should trigger"),
      recurring: z.enum(["daily", "weekly", "monthly", "yearly"]).optional().describe("Recurrence pattern"),
      metadata: z.record(z.string(), z.unknown()).optional().describe("Additional event data"),
    },
    async (params) => {
      const event = timeTools.scheduleEvent(params);
      return {
        content: [{ type: "text", text: JSON.stringify(event, null, 2) }],
      };
    }
  );

  server.tool(
    "list_scheduled_events",
    "List upcoming scheduled events",
    {
      sessionId: z.string().max(100).describe("The session ID"),
      includeTriggered: z.boolean().optional().describe("Include already-triggered events"),
    },
    async ({ sessionId, includeTriggered }) => {
      const events = timeTools.listScheduledEvents(sessionId, includeTriggered);
      return {
        content: [{ type: "text", text: JSON.stringify(events, null, 2) }],
      };
    }
  );

  server.tool(
    "cancel_event",
    "Cancel a scheduled event",
    {
      eventId: z.string().max(100).describe("The event ID to cancel"),
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

  server.tool(
    "create_timer",
    "Create a countdown, stopwatch, or segmented clock",
    {
      sessionId: z.string().max(100).describe("The session ID"),
      name: z.string().min(1).max(LIMITS.NAME_MAX).describe("Timer name (e.g., 'Doom Clock', 'Ritual Progress')"),
      description: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("Timer description"),
      timerType: z.enum(["countdown", "stopwatch", "clock"]).describe("Type: countdown (decreases), stopwatch (increases), clock (segmented like Blades in the Dark)"),
      currentValue: z.number().optional().describe("Starting value"),
      maxValue: z.number().optional().describe("Maximum value (for clocks: number of segments, default 6)"),
      direction: z.enum(["up", "down"]).optional().describe("Direction of change"),
      triggerAt: z.number().optional().describe("Value that triggers an event"),
      unit: z.string().max(100).optional().describe("Unit label (e.g., 'rounds', 'hours', 'segments')"),
      visibleToPlayers: z.boolean().optional().describe("Whether players can see this timer"),
    },
    async (params) => {
      const timer = timerTools.createTimer(params);
      return {
        content: [{ type: "text", text: JSON.stringify(timer, null, 2) }],
      };
    }
  );

  server.tool(
    "get_timer",
    "Get timer details",
    {
      timerId: z.string().max(100).describe("The timer ID"),
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

  server.tool(
    "update_timer",
    "Update timer settings",
    {
      timerId: z.string().max(100).describe("The timer ID"),
      name: z.string().max(LIMITS.NAME_MAX).optional().describe("New name"),
      description: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("New description"),
      maxValue: z.number().nullable().optional().describe("New max value"),
      triggerAt: z.number().nullable().optional().describe("New trigger value"),
      unit: z.string().max(100).optional().describe("New unit label"),
      visibleToPlayers: z.boolean().optional().describe("Visibility to players"),
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

  server.tool(
    "delete_timer",
    "Delete a timer",
    {
      timerId: z.string().max(100).describe("The timer ID"),
    },
    async ({ timerId }) => {
      const success = timerTools.deleteTimer(timerId);
      return {
        content: [{ type: "text", text: success ? "Timer deleted" : "Timer not found" }],
        isError: !success,
      };
    }
  );

  server.tool(
    "list_timers",
    "List active timers in a session",
    {
      sessionId: z.string().max(100).describe("The session ID"),
      includeTriggered: z.boolean().optional().describe("Include triggered timers"),
    },
    async ({ sessionId, includeTriggered }) => {
      const timers = timerTools.listTimers(sessionId, includeTriggered);
      return {
        content: [{ type: "text", text: JSON.stringify(timers, null, 2) }],
      };
    }
  );

  server.tool(
    "tick_timer",
    "Advance or reduce a timer by an amount",
    {
      timerId: z.string().max(100).describe("The timer ID"),
      amount: z.number().optional().describe("Amount to tick (default: 1)"),
    },
    async ({ timerId, amount }) => {
      const result = timerTools.tickTimer(timerId, amount);
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

  server.tool(
    "reset_timer",
    "Reset a timer to its initial state",
    {
      timerId: z.string().max(100).describe("The timer ID"),
    },
    async ({ timerId }) => {
      const timer = timerTools.resetTimer(timerId);
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

  server.tool(
    "render_timer",
    "Render an ASCII visualization of a timer",
    {
      timerId: z.string().max(100).describe("The timer ID"),
    },
    async ({ timerId }) => {
      const render = timerTools.renderTimer(timerId);
      if (!render) {
        return {
          content: [{ type: "text", text: "Timer not found" }],
          isError: true,
        };
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ascii: render.ascii,
            percentage: render.percentage,
            timer: render.timer,
            instruction: "Display this ASCII timer visualization to the player for dramatic effect.",
          }, null, 2),
        }],
      };
    }
  );
}
