import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as factionTools from "../tools/faction.js";

export function registerFactionTools(server: McpServer) {
  server.tool(
    "create_faction",
    "Create a new faction/organization",
    {
      sessionId: z.string().describe("The session ID"),
      name: z.string().describe("Faction name"),
      description: z.string().optional().describe("Faction description"),
      leaderId: z.string().optional().describe("Character ID of the leader"),
      headquartersId: z.string().optional().describe("Location ID of headquarters"),
      resources: z.record(z.number()).optional().describe("Initial resources (e.g., {gold: 1000, soldiers: 50})"),
      goals: z.array(z.string()).optional().describe("Faction goals"),
      traits: z.array(z.string()).optional().describe("Faction traits (e.g., ['secretive', 'militant'])"),
      status: z.enum(["active", "disbanded", "hidden"]).optional().describe("Faction status"),
    },
    async (params) => {
      const faction = factionTools.createFaction(params);
      return {
        content: [{ type: "text", text: JSON.stringify(faction, null, 2) }],
      };
    }
  );

  server.tool(
    "get_faction",
    "Get a faction by ID",
    {
      factionId: z.string().describe("The faction ID"),
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

  server.tool(
    "update_faction",
    "Update a faction's details",
    {
      factionId: z.string().describe("The faction ID"),
      name: z.string().optional().describe("New name"),
      description: z.string().optional().describe("New description"),
      leaderId: z.string().nullable().optional().describe("New leader ID (null to remove)"),
      headquartersId: z.string().nullable().optional().describe("New headquarters ID (null to remove)"),
      traits: z.array(z.string()).optional().describe("Replace traits"),
      status: z.enum(["active", "disbanded", "hidden"]).optional().describe("New status"),
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

  server.tool(
    "delete_faction",
    "Delete a faction",
    {
      factionId: z.string().describe("The faction ID"),
    },
    async ({ factionId }) => {
      const success = factionTools.deleteFaction(factionId);
      return {
        content: [{ type: "text", text: success ? "Faction deleted" : "Faction not found" }],
        isError: !success,
      };
    }
  );

  server.tool(
    "list_factions",
    "List factions in a session",
    {
      sessionId: z.string().describe("The session ID"),
      status: z.enum(["active", "disbanded", "hidden"]).optional().describe("Filter by status"),
    },
    async ({ sessionId, status }) => {
      const factions = factionTools.listFactions(sessionId, status ? { status } : undefined);
      return {
        content: [{ type: "text", text: JSON.stringify(factions, null, 2) }],
      };
    }
  );

  server.tool(
    "modify_faction_resource",
    "Add or subtract from a faction resource",
    {
      factionId: z.string().describe("The faction ID"),
      resource: z.string().describe("Resource name (e.g., 'gold', 'soldiers')"),
      delta: z.number().describe("Amount to add (positive) or subtract (negative)"),
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

  server.tool(
    "set_faction_resource",
    "Set a faction resource to a specific value",
    {
      factionId: z.string().describe("The faction ID"),
      resource: z.string().describe("Resource name"),
      value: z.number().describe("New value (0 or less removes the resource)"),
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

  server.tool(
    "add_faction_goal",
    "Add a goal to a faction",
    {
      factionId: z.string().describe("The faction ID"),
      goal: z.string().describe("The goal to add"),
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

  server.tool(
    "complete_faction_goal",
    "Mark a faction goal as complete (removes it)",
    {
      factionId: z.string().describe("The faction ID"),
      goalIndex: z.number().describe("Index of the goal to complete (0-based)"),
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

  server.tool(
    "add_faction_trait",
    "Add a trait to a faction",
    {
      factionId: z.string().describe("The faction ID"),
      trait: z.string().describe("The trait to add"),
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

  server.tool(
    "remove_faction_trait",
    "Remove a trait from a faction",
    {
      factionId: z.string().describe("The faction ID"),
      trait: z.string().describe("The trait to remove"),
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
