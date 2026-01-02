import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as factionTools from "../tools/faction.js";
import { LIMITS } from "../utils/validation.js";
import { ANNOTATIONS } from "../utils/tool-annotations.js";

export function registerFactionTools(server: McpServer) {
  server.registerTool(
    "create_faction",
    {
      description: "Create a new faction/organization",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
        name: z.string().min(1).max(LIMITS.NAME_MAX).describe("Faction name"),
        description: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("Faction description"),
        leaderId: z.string().max(100).optional().describe("Character ID of the leader"),
        headquartersId: z.string().max(100).optional().describe("Location ID of headquarters"),
        resources: z.record(z.number()).optional().describe("Initial resources (e.g., {gold: 1000, soldiers: 50})"),
        goals: z.array(z.string().max(LIMITS.DESCRIPTION_MAX)).max(LIMITS.ARRAY_MAX).optional().describe("Faction goals"),
        traits: z.array(z.string().max(LIMITS.NAME_MAX)).max(LIMITS.ARRAY_MAX).optional().describe("Faction traits (e.g., ['secretive', 'militant'])"),
        status: z.enum(["active", "disbanded", "hidden"]).optional().describe("Faction status"),
      },
      annotations: ANNOTATIONS.CREATE,
    },
    async (params) => {
      const faction = factionTools.createFaction(params);
      return {
        content: [{ type: "text", text: JSON.stringify(faction, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_faction",
    {
      description: "Get a faction by ID",
      inputSchema: {
        factionId: z.string().max(100).describe("The faction ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ factionId }) => {
      const faction = factionTools.getFaction(factionId);
      if (!faction) {
        return {
          content: [{ type: "text", text: "Faction not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(faction, null, 2) }],
      };
    }
  );

  server.registerTool(
    "update_faction",
    {
      description: "Update a faction's details",
      inputSchema: {
        factionId: z.string().max(100).describe("The faction ID"),
        name: z.string().max(LIMITS.NAME_MAX).optional().describe("New name"),
        description: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("New description"),
        leaderId: z.string().max(100).nullable().optional().describe("New leader ID (null to remove)"),
        headquartersId: z.string().max(100).nullable().optional().describe("New headquarters ID (null to remove)"),
        traits: z.array(z.string().max(LIMITS.NAME_MAX)).max(LIMITS.ARRAY_MAX).optional().describe("Replace traits"),
        status: z.enum(["active", "disbanded", "hidden"]).optional().describe("New status"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ factionId, ...updates }) => {
      const faction = factionTools.updateFaction(factionId, updates);
      if (!faction) {
        return {
          content: [{ type: "text", text: "Faction not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(faction, null, 2) }],
      };
    }
  );

  server.registerTool(
    "delete_faction",
    {
      description: "Delete a faction",
      inputSchema: {
        factionId: z.string().max(100).describe("The faction ID"),
      },
      annotations: ANNOTATIONS.DESTRUCTIVE,
    },
    async ({ factionId }) => {
      const success = factionTools.deleteFaction(factionId);
      return {
        content: [{ type: "text", text: success ? "Faction deleted" : "Faction not found" }],
        isError: !success,
      };
    }
  );

  server.registerTool(
    "list_factions",
    {
      description: "List factions in a session",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
        status: z.enum(["active", "disbanded", "hidden"]).optional().describe("Filter by status"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ sessionId, status }) => {
      const factions = factionTools.listFactions(sessionId, status ? { status } : undefined);
      return {
        content: [{ type: "text", text: JSON.stringify(factions, null, 2) }],
      };
    }
  );

  server.registerTool(
    "modify_faction_resource",
    {
      description: "Add or subtract from a faction resource",
      inputSchema: {
        factionId: z.string().max(100).describe("The faction ID"),
        resource: z.string().max(LIMITS.NAME_MAX).describe("Resource name (e.g., 'gold', 'soldiers')"),
        delta: z.number().describe("Amount to add (positive) or subtract (negative)"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async (params) => {
      const faction = factionTools.modifyFactionResource(params);
      if (!faction) {
        return {
          content: [{ type: "text", text: "Faction not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(faction, null, 2) }],
      };
    }
  );

  server.registerTool(
    "set_faction_resource",
    {
      description: "Set a faction resource to a specific value",
      inputSchema: {
        factionId: z.string().max(100).describe("The faction ID"),
        resource: z.string().max(LIMITS.NAME_MAX).describe("Resource name"),
        value: z.number().describe("New value (0 or less removes the resource)"),
      },
      annotations: ANNOTATIONS.SET,
    },
    async (params) => {
      const faction = factionTools.setFactionResource(params);
      if (!faction) {
        return {
          content: [{ type: "text", text: "Faction not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(faction, null, 2) }],
      };
    }
  );

  server.registerTool(
    "add_faction_goal",
    {
      description: "Add a goal to a faction",
      inputSchema: {
        factionId: z.string().max(100).describe("The faction ID"),
        goal: z.string().max(LIMITS.DESCRIPTION_MAX).describe("The goal to add"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ factionId, goal }) => {
      const faction = factionTools.addFactionGoal(factionId, goal);
      if (!faction) {
        return {
          content: [{ type: "text", text: "Faction not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(faction, null, 2) }],
      };
    }
  );

  server.registerTool(
    "complete_faction_goal",
    {
      description: "Mark a faction goal as complete (removes it)",
      inputSchema: {
        factionId: z.string().max(100).describe("The faction ID"),
        goalIndex: z.number().describe("Index of the goal to complete (0-based)"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ factionId, goalIndex }) => {
      const faction = factionTools.completeFactionGoal(factionId, goalIndex);
      if (!faction) {
        return {
          content: [{ type: "text", text: "Faction not found or invalid goal index" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(faction, null, 2) }],
      };
    }
  );

  server.registerTool(
    "add_faction_trait",
    {
      description: "Add a trait to a faction",
      inputSchema: {
        factionId: z.string().max(100).describe("The faction ID"),
        trait: z.string().max(LIMITS.NAME_MAX).describe("The trait to add"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ factionId, trait }) => {
      const faction = factionTools.addFactionTrait(factionId, trait);
      if (!faction) {
        return {
          content: [{ type: "text", text: "Faction not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(faction, null, 2) }],
      };
    }
  );

  server.registerTool(
    "remove_faction_trait",
    {
      description: "Remove a trait from a faction",
      inputSchema: {
        factionId: z.string().max(100).describe("The faction ID"),
        trait: z.string().max(LIMITS.NAME_MAX).describe("The trait to remove"),
      },
      annotations: ANNOTATIONS.DESTRUCTIVE,
    },
    async ({ factionId, trait }) => {
      const faction = factionTools.removeFactionTrait(factionId, trait);
      if (!faction) {
        return {
          content: [{ type: "text", text: "Faction not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(faction, null, 2) }],
      };
    }
  );
}
