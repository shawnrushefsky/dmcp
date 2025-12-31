import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as questTools from "../tools/quest.js";

export function registerQuestTools(server: McpServer) {
  server.tool(
    "create_quest",
    "Create a new quest",
    {
      sessionId: z.string().describe("The session ID"),
      name: z.string().describe("Quest name"),
      description: z.string().describe("Quest description"),
      objectives: z.array(z.object({
        description: z.string(),
        completed: z.boolean().optional(),
        optional: z.boolean().optional(),
      })).describe("Quest objectives"),
      rewards: z.string().optional().describe("Quest rewards"),
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

  server.tool(
    "get_quest",
    "Get quest details",
    {
      questId: z.string().describe("The quest ID"),
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

  server.tool(
    "update_quest",
    "Update a quest",
    {
      questId: z.string().describe("The quest ID"),
      name: z.string().optional().describe("New name"),
      description: z.string().optional().describe("New description"),
      status: z.enum(["active", "completed", "failed", "abandoned"]).optional().describe("New status"),
      rewards: z.string().optional().describe("Updated rewards"),
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

  server.tool(
    "complete_objective",
    "Mark a quest objective as completed",
    {
      questId: z.string().describe("The quest ID"),
      objectiveId: z.string().describe("The objective ID"),
    },
    async ({ questId, objectiveId }) => {
      const quest = questTools.completeObjective(questId, objectiveId);
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

  server.tool(
    "add_objective",
    "Add a new objective to a quest",
    {
      questId: z.string().describe("The quest ID"),
      description: z.string().describe("Objective description"),
      optional: z.boolean().optional().describe("Is this objective optional?"),
    },
    async ({ questId, description, optional }) => {
      const quest = questTools.addObjective(questId, { description, completed: false, optional });
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

  server.tool(
    "list_quests",
    "List quests in a session",
    {
      sessionId: z.string().describe("The session ID"),
      status: z.enum(["active", "completed", "failed", "abandoned"]).optional().describe("Filter by status"),
    },
    async ({ sessionId, status }) => {
      const quests = questTools.listQuests(sessionId, status ? { status } : undefined);
      return {
        content: [{ type: "text", text: JSON.stringify(quests, null, 2) }],
      };
    }
  );
}
