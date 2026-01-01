import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as relationshipTools from "../tools/relationship.js";
import { LIMITS } from "../utils/validation.js";

export function registerRelationshipTools(server: McpServer) {
  server.tool(
    "create_relationship",
    "Create a relationship between two entities (characters, factions, etc.)",
    {
      sessionId: z.string().max(100).describe("The session ID"),
      sourceId: z.string().max(100).describe("Source entity ID"),
      sourceType: z.string().max(100).describe("Source entity type (e.g., 'character', 'faction')"),
      targetId: z.string().max(100).describe("Target entity ID"),
      targetType: z.string().max(100).describe("Target entity type"),
      relationshipType: z.string().max(100).describe("Type of relationship (e.g., 'attitude', 'bond', 'rivalry', 'loyalty')"),
      value: z.number().optional().describe("Initial value (-100 to 100, default: 0)"),
      label: z.string().max(LIMITS.NAME_MAX).optional().describe("Descriptive label (e.g., 'friendly', 'hostile')"),
      notes: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("Notes about the relationship"),
    },
    async (params) => {
      const relationship = relationshipTools.createRelationship(params);
      return {
        content: [{ type: "text", text: JSON.stringify(relationship, null, 2) }],
      };
    }
  );

  server.tool(
    "get_relationship",
    "Get a relationship by ID",
    {
      relationshipId: z.string().max(100).describe("The relationship ID"),
    },
    async ({ relationshipId }) => {
      const relationship = relationshipTools.getRelationship(relationshipId);
      if (!relationship) {
        return {
          content: [{ type: "text", text: "Relationship not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(relationship, null, 2) }],
      };
    }
  );

  server.tool(
    "get_relationship_between",
    "Get the relationship between two specific entities",
    {
      sessionId: z.string().max(100).describe("The session ID"),
      sourceId: z.string().max(100).describe("Source entity ID"),
      targetId: z.string().max(100).describe("Target entity ID"),
      relationshipType: z.string().max(100).optional().describe("Filter by relationship type"),
    },
    async ({ sessionId, sourceId, targetId, relationshipType }) => {
      const relationship = relationshipTools.getRelationshipBetween(sessionId, sourceId, targetId, relationshipType);
      if (!relationship) {
        return {
          content: [{ type: "text", text: "No relationship found between these entities" }],
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(relationship, null, 2) }],
      };
    }
  );

  server.tool(
    "update_relationship",
    "Update a relationship's type, value, label, or notes",
    {
      relationshipId: z.string().max(100).describe("The relationship ID"),
      relationshipType: z.string().max(100).optional().describe("New relationship type"),
      value: z.number().optional().describe("New value"),
      label: z.string().max(LIMITS.NAME_MAX).nullable().optional().describe("New label"),
      notes: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("New notes"),
    },
    async ({ relationshipId, ...updates }) => {
      const relationship = relationshipTools.updateRelationship(relationshipId, updates);
      if (!relationship) {
        return {
          content: [{ type: "text", text: "Relationship not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(relationship, null, 2) }],
      };
    }
  );

  server.tool(
    "modify_relationship",
    "Adjust a relationship value by a delta (with history logging)",
    {
      relationshipId: z.string().max(100).describe("The relationship ID"),
      delta: z.number().describe("Amount to change (+/-)"),
      reason: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("Reason for the change (logged)"),
      minValue: z.number().optional().describe("Minimum bound (default: none)"),
      maxValue: z.number().optional().describe("Maximum bound (default: none)"),
    },
    async (params) => {
      const result = relationshipTools.modifyRelationship(params);
      if (!result) {
        return {
          content: [{ type: "text", text: "Relationship not found" }],
          isError: true,
        };
      }
      const label = relationshipTools.getRelationshipLabel(result.relationship.value);
      return {
        content: [{ type: "text", text: JSON.stringify({ ...result, suggestedLabel: label }, null, 2) }],
      };
    }
  );

  server.tool(
    "delete_relationship",
    "Delete a relationship",
    {
      relationshipId: z.string().max(100).describe("The relationship ID"),
    },
    async ({ relationshipId }) => {
      const success = relationshipTools.deleteRelationship(relationshipId);
      return {
        content: [{ type: "text", text: success ? "Relationship deleted" : "Relationship not found" }],
        isError: !success,
      };
    }
  );

  server.tool(
    "list_relationships",
    "List relationships with optional filters",
    {
      sessionId: z.string().max(100).describe("The session ID"),
      entityId: z.string().max(100).optional().describe("Filter by entity (either source or target)"),
      sourceId: z.string().max(100).optional().describe("Filter by source entity"),
      targetId: z.string().max(100).optional().describe("Filter by target entity"),
      relationshipType: z.string().max(100).optional().describe("Filter by relationship type"),
      entityType: z.string().max(100).optional().describe("Filter by entity type"),
    },
    async ({ sessionId, ...filter }) => {
      const relationships = relationshipTools.listRelationships(sessionId, filter);
      return {
        content: [{ type: "text", text: JSON.stringify(relationships, null, 2) }],
      };
    }
  );

  server.tool(
    "get_relationship_history",
    "Get change history for a relationship",
    {
      relationshipId: z.string().max(100).describe("The relationship ID"),
      limit: z.number().optional().describe("Maximum entries to return"),
    },
    async ({ relationshipId, limit }) => {
      const history = relationshipTools.getRelationshipHistory(relationshipId, limit);
      return {
        content: [{ type: "text", text: JSON.stringify(history, null, 2) }],
      };
    }
  );
}
