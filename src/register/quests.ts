import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as questTools from "../tools/quest.js";
import { LIMITS } from "../utils/validation.js";
import { ANNOTATIONS } from "../utils/tool-annotations.js";

export function registerQuestTools(server: McpServer) {
  server.registerTool(
    "create_quest",
    {
      description: "Create a new quest. Call this whenever the player receives a mission, task, or goal - whether from an NPC, discovered through exploration, or self-initiated. Include clear objectives that can be tracked.",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
        name: z.string().min(1).max(LIMITS.NAME_MAX).describe("Quest name"),
        description: z.string().max(LIMITS.DESCRIPTION_MAX).describe("Quest description"),
        objectives: z.array(z.object({
          description: z.string().max(LIMITS.DESCRIPTION_MAX),
          completed: z.boolean().optional(),
          optional: z.boolean().optional(),
        })).max(LIMITS.ARRAY_MAX).describe("Quest objectives"),
        rewards: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("Quest rewards"),
      },
      annotations: ANNOTATIONS.CREATE,
    },
    async (params) => {
      const quest = questTools.createQuest({
        ...params,
        objectives: params.objectives.map((obj) => ({
          description: obj.description,
          completed: obj.completed ?? false,
          optional: obj.optional,
        })),
      });
      return {
        content: [{ type: "text", text: JSON.stringify(quest, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_quest",
    {
      description: "Get quest details",
      inputSchema: {
        questId: z.string().max(100).describe("The quest ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ questId }) => {
      const quest = questTools.getQuest(questId);
      if (!quest) {
        return {
          content: [{ type: "text", text: "Quest not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(quest, null, 2) }],
      };
    }
  );

  server.registerTool(
    "update_quest",
    {
      description: "Update a quest",
      inputSchema: {
        questId: z.string().max(100).describe("The quest ID"),
        name: z.string().max(LIMITS.NAME_MAX).optional().describe("New name"),
        description: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("New description"),
        status: z.enum(["active", "completed", "failed", "abandoned"]).optional().describe("New status"),
        rewards: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("Updated rewards"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ questId, ...updates }) => {
      const quest = questTools.updateQuest(questId, updates);
      if (!quest) {
        return {
          content: [{ type: "text", text: "Quest not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(quest, null, 2) }],
      };
    }
  );

  // ============================================================================
  // MODIFY OBJECTIVES - CONSOLIDATED (replaces add_objective + complete_objective)
  // ============================================================================
  server.registerTool(
    "modify_objectives",
    {
      description: "Add new objectives and/or mark existing objectives as completed in a single call. Call this immediately when: (1) player completes a quest step, (2) new sub-tasks are discovered, (3) objectives change based on player choices.",
      inputSchema: {
        questId: z.string().max(100).describe("The quest ID"),
        add: z.array(z.object({
          description: z.string().max(LIMITS.DESCRIPTION_MAX).describe("Objective description"),
          optional: z.boolean().optional().describe("Is this objective optional?"),
        })).max(LIMITS.ARRAY_MAX).optional().describe("New objectives to add"),
        complete: z.array(z.string().max(100)).max(LIMITS.ARRAY_MAX).optional().describe("Objective IDs to mark as completed"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ questId, add, complete }) => {
      if (!add?.length && !complete?.length) {
        return {
          content: [{ type: "text", text: "No objectives to add or complete" }],
          isError: true,
        };
      }

      const result = questTools.modifyObjectives(questId, { add, complete });
      if (!result) {
        return {
          content: [{ type: "text", text: "Quest not found" }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    "list_quests",
    {
      description: "List quests in a session",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
        status: z.enum(["active", "completed", "failed", "abandoned"]).optional().describe("Filter by status"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ sessionId, status }) => {
      const quests = questTools.listQuests(sessionId, status ? { status } : undefined);
      return {
        content: [{ type: "text", text: JSON.stringify(quests, null, 2) }],
      };
    }
  );
}
