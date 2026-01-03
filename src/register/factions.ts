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
        gameId: z.string().max(100).describe("The game ID"),
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
      description: "List factions in a game",
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
        status: z.enum(["active", "disbanded", "hidden"]).optional().describe("Filter by status"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ gameId, status }) => {
      const factions = factionTools.listFactions(gameId, status ? { status } : undefined);
      return {
        content: [{ type: "text", text: JSON.stringify(factions, null, 2) }],
      };
    }
  );

  // ============================================================================
  // CONSOLIDATED: UPDATE FACTION RESOURCE (replaces modify_faction_resource + set_faction_resource)
  // ============================================================================
  server.registerTool(
    "update_faction_resource",
    {
      description: "Update a faction resource value. Use mode 'delta' to add/subtract, or 'set' to set an absolute value.",
      inputSchema: {
        factionId: z.string().max(100).describe("The faction ID"),
        resource: z.string().max(LIMITS.NAME_MAX).describe("Resource name (e.g., 'gold', 'soldiers')"),
        mode: z.enum(["delta", "set"]).describe("'delta' to add/subtract from current value, 'set' to set absolute value"),
        value: z.number().describe("Amount to add/subtract (for delta) or absolute value (for set). Values <= 0 remove the resource."),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async (params) => {
      const faction = factionTools.updateFactionResource(params);
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

  // ============================================================================
  // CONSOLIDATED: MODIFY FACTION GOALS (replaces add_faction_goal + complete_faction_goal)
  // ============================================================================
  server.registerTool(
    "modify_faction_goals",
    {
      description: "Add and/or complete faction goals in a single call. More efficient than separate add/complete calls.",
      inputSchema: {
        factionId: z.string().max(100).describe("The faction ID"),
        add: z.array(z.string().max(LIMITS.DESCRIPTION_MAX)).max(LIMITS.ARRAY_MAX).optional().describe("Goals to add"),
        complete: z.array(z.number()).max(LIMITS.ARRAY_MAX).optional().describe("Indices of goals to complete (0-based)"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ factionId, add, complete }) => {
      if (!add?.length && !complete?.length) {
        return {
          content: [{ type: "text", text: "No goals to add or complete" }],
          isError: true,
        };
      }

      const result = factionTools.modifyFactionGoals(factionId, { add, complete });
      if (!result) {
        return {
          content: [{ type: "text", text: "Faction not found" }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify({
          factionId: result.faction.id,
          goals: result.faction.goals,
          added: result.added,
          completed: result.completed,
        }, null, 2) }],
      };
    }
  );

  // ============================================================================
  // CONSOLIDATED: MODIFY FACTION TRAITS (replaces add_faction_trait + remove_faction_trait)
  // ============================================================================
  server.registerTool(
    "modify_faction_traits",
    {
      description: "Add and/or remove faction traits in a single call. More efficient than separate add/remove calls.",
      inputSchema: {
        factionId: z.string().max(100).describe("The faction ID"),
        add: z.array(z.string().max(LIMITS.NAME_MAX)).max(LIMITS.ARRAY_MAX).optional().describe("Traits to add"),
        remove: z.array(z.string().max(LIMITS.NAME_MAX)).max(LIMITS.ARRAY_MAX).optional().describe("Traits to remove"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ factionId, add, remove }) => {
      if (!add?.length && !remove?.length) {
        return {
          content: [{ type: "text", text: "No traits to add or remove" }],
          isError: true,
        };
      }

      const result = factionTools.modifyFactionTraits(factionId, { add, remove });
      if (!result) {
        return {
          content: [{ type: "text", text: "Faction not found" }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify({
          factionId: result.faction.id,
          traits: result.faction.traits,
          added: result.added,
          removed: result.removed,
        }, null, 2) }],
      };
    }
  );
}
