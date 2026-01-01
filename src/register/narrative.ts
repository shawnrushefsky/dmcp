import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as narrativeTools from "../tools/narrative.js";
import { LIMITS } from "../utils/validation.js";

export function registerNarrativeTools(server: McpServer) {
  server.tool(
    "log_event",
    "Log a narrative event",
    {
      sessionId: z.string().max(100).describe("The session ID"),
      eventType: z.string().max(100).describe("Type of event (e.g., 'dialogue', 'action', 'discovery', 'combat')"),
      content: z.string().max(LIMITS.CONTENT_MAX).describe("Event content/description"),
      metadata: z.record(z.string(), z.unknown()).optional().describe("Additional metadata"),
    },
    async (params) => {
      const event = narrativeTools.logEvent(params);
      return {
        content: [{ type: "text", text: JSON.stringify(event, null, 2) }],
      };
    }
  );

  server.tool(
    "get_history",
    "Get narrative history",
    {
      sessionId: z.string().max(100).describe("The session ID"),
      limit: z.number().optional().describe("Maximum events to return"),
      eventType: z.string().max(100).optional().describe("Filter by event type"),
      since: z.string().max(100).optional().describe("Only events after this timestamp"),
    },
    async ({ sessionId, limit, eventType, since }) => {
      const events = narrativeTools.getHistory(sessionId, { limit, eventType, since });
      return {
        content: [{ type: "text", text: JSON.stringify(events, null, 2) }],
      };
    }
  );

  server.tool(
    "get_summary",
    "Get a summary of the narrative so far",
    {
      sessionId: z.string().max(100).describe("The session ID"),
    },
    async ({ sessionId }) => {
      const summary = narrativeTools.getSummary(sessionId);
      return {
        content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      };
    }
  );

  server.tool(
    "get_export_styles",
    "Get available narrative styles for story export",
    {},
    async () => {
      const styles = [
        { id: "literary-fiction", name: "Literary Fiction", description: "Sophisticated prose with deep character introspection" },
        { id: "pulp-adventure", name: "Pulp Adventure", description: "Fast-paced action with bold heroes and cliffhangers" },
        { id: "epic-fantasy", name: "Epic Fantasy", description: "Grand, sweeping narrative with mythic undertones" },
        { id: "noir", name: "Noir", description: "Hardboiled prose with moral ambiguity" },
        { id: "horror", name: "Horror", description: "Atmospheric dread and tension" },
        { id: "comedic", name: "Comedic", description: "Witty and humorous with clever dialogue" },
        { id: "young-adult", name: "Young Adult", description: "Accessible and engaging with relatable characters" },
        { id: "screenplay", name: "Screenplay", description: "Formatted as a film script" },
        { id: "journal", name: "Journal/Diary", description: "Personal entries from protagonist's perspective" },
        { id: "chronicle", name: "Chronicle", description: "Historical documentation with a sense of legacy" },
      ];
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            styles,
            instruction: "Present these style options to the player and let them choose how their story should be written.",
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "export_story",
    "Export the game history as structured data for reconstruction into a narrative book. Use get_chapter_for_export to fetch individual chapters for writing.",
    {
      sessionId: z.string().max(100).describe("The session ID"),
      style: z.string().max(100).describe("Narrative style (e.g., 'literary-fiction', 'pulp-adventure', 'epic-fantasy', 'noir', or custom)"),
    },
    async ({ sessionId, style }) => {
      const exportData = narrativeTools.exportStoryData(sessionId, style);
      if (!exportData) {
        return {
          content: [{ type: "text", text: "Session not found" }],
          isError: true,
        };
      }

      const chapterSummaries = exportData.chapters.map((ch, idx) => ({
        chapterNumber: idx + 1,
        title: ch.title,
        eventCount: ch.events.length,
        eventTypes: [...new Set(ch.events.map(e => e.eventType))],
        timeSpan: ch.events.length > 0 ? {
          start: ch.events[0].timestamp,
          end: ch.events[ch.events.length - 1].timestamp,
        } : null,
      }));

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            session: exportData.session,
            characters: exportData.characters,
            locations: exportData.locations,
            quests: exportData.quests,
            chapterSummaries,
            totalChapters: exportData.chapters.length,
            totalEvents: exportData.totalEvents,
            exportStyle: exportData.exportStyle,
            instruction: exportData.instruction,
            meta: {
              exportedAt: new Date().toISOString(),
              workflow: [
                "1. Review the session, characters, locations, and quests for context",
                "2. For each chapter, use get_chapter_for_export to fetch the full event data",
                "3. Spawn a subagent for each chapter with the style instruction and chapter data",
                "4. Each subagent writes its chapter as narrative prose",
                "5. Combine chapters into the final book with front matter",
              ],
            },
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "get_chapter_for_export",
    "Get a single chapter's full event data for writing. Use this to fetch chapters one at a time for subagent processing.",
    {
      sessionId: z.string().max(100).describe("The session ID"),
      chapterNumber: z.number().describe("Chapter number (1-indexed)"),
      style: z.string().max(100).describe("Narrative style for the instruction"),
    },
    async ({ sessionId, chapterNumber, style }) => {
      const exportData = narrativeTools.exportStoryData(sessionId, style);
      if (!exportData) {
        return {
          content: [{ type: "text", text: "Session not found" }],
          isError: true,
        };
      }

      const chapterIndex = chapterNumber - 1;
      if (chapterIndex < 0 || chapterIndex >= exportData.chapters.length) {
        return {
          content: [{ type: "text", text: `Chapter ${chapterNumber} not found. Total chapters: ${exportData.chapters.length}` }],
          isError: true,
        };
      }

      const chapter = exportData.chapters[chapterIndex];

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            chapterNumber,
            totalChapters: exportData.chapters.length,
            title: chapter.title,
            events: chapter.events,
            context: {
              sessionName: exportData.session.name,
              setting: exportData.session.setting,
              style: exportData.exportStyle,
            },
            instruction: exportData.instruction,
            subagentPrompt: `You are writing Chapter ${chapterNumber} of "${exportData.session.name}". ${exportData.instruction} Transform the following events into engaging narrative prose. Maintain consistency with the ${exportData.session.setting} setting.`,
          }, null, 2),
        }],
      };
    }
  );

  // PLAYER INTERACTION TOOLS

  server.tool(
    "present_choices",
    "Present choices to the player with multi-select and free-form input support. Returns structured choice data for the DM agent to display.",
    {
      sessionId: z.string().max(100).describe("The session ID"),
      prompt: z.string().max(LIMITS.DESCRIPTION_MAX).describe("The question or situation description to present"),
      choices: z.array(z.object({
        id: z.string().max(100).describe("Unique identifier for this choice"),
        label: z.string().max(LIMITS.NAME_MAX).describe("Short label for the choice (1-5 words)"),
        description: z.string().max(LIMITS.DESCRIPTION_MAX).describe("Fuller description of what this choice means"),
        consequences: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("Hint at consequences (optional, for DM reference)"),
      })).min(1).max(6).describe("Available choices (1-6 options)"),
      allowMultiple: z.boolean().optional().describe("Allow selecting multiple choices (default: false)"),
      allowFreeform: z.boolean().optional().describe("Allow player to type a custom response (default: true)"),
      freeformPlaceholder: z.string().max(LIMITS.NAME_MAX).optional().describe("Placeholder text for free-form input (default: 'Or describe what you want to do...')"),
      context: z.object({
        locationId: z.string().max(100).optional(),
        characterIds: z.array(z.string().max(100)).max(LIMITS.ARRAY_MAX).optional(),
        urgency: z.enum(["low", "medium", "high", "critical"]).optional(),
      }).optional().describe("Context for the choice"),
    },
    async ({ sessionId, prompt, choices, allowMultiple, allowFreeform, freeformPlaceholder, context }) => {
      narrativeTools.logEvent({
        sessionId,
        eventType: "choice_presented",
        content: prompt,
        metadata: { choices, allowMultiple, allowFreeform, context },
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            type: "player_choice",
            prompt,
            choices,
            allowMultiple: allowMultiple ?? false,
            allowFreeform: allowFreeform ?? true,
            freeformPlaceholder: freeformPlaceholder ?? "Or describe what you want to do...",
            context,
            instruction: "Present these choices to the player. Use AskUserQuestion - players can always select 'Other' to provide free-form input.",
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "record_choice",
    "Record the player's choice after they've selected",
    {
      sessionId: z.string().max(100).describe("The session ID"),
      choiceIds: z.array(z.string().max(100)).max(LIMITS.ARRAY_MAX).describe("The ID(s) of the choice(s) the player selected"),
      customResponse: z.string().max(LIMITS.CONTENT_MAX).optional().describe("If player chose 'Other', their custom response"),
    },
    async ({ sessionId, choiceIds, customResponse }) => {
      const event = narrativeTools.logEvent({
        sessionId,
        eventType: "choice_made",
        content: customResponse || `Player chose: ${choiceIds.join(", ")}`,
        metadata: { choiceIds, customResponse },
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            recorded: true,
            choiceIds,
            customResponse,
            event,
          }, null, 2),
        }],
      };
    }
  );
}
