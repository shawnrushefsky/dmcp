import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as relationshipTools from "../tools/relationship.js";
import { LIMITS } from "../utils/validation.js";
import { ANNOTATIONS } from "../utils/tool-annotations.js";

export function registerRelationshipTools(server: McpServer) {
  server.registerTool(
    "create_relationship",
    {
      description: "Create a relationship between two entities (characters, factions, etc.)",
      inputSchema: {
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
      annotations: ANNOTATIONS.CREATE,
    },
    async (params) => {
      const relationship = relationshipTools.createRelationship(params);
      return {
        content: [{ type: "text", text: JSON.stringify(relationship, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_relationship",
    {
      description: "Get a relationship by ID",
      inputSchema: {
        relationshipId: z.string().max(100).describe("The relationship ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
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

  server.registerTool(
    "get_relationship_between",
    {
      description: "Get the relationship between two specific entities",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
        sourceId: z.string().max(100).describe("Source entity ID"),
        targetId: z.string().max(100).describe("Target entity ID"),
        relationshipType: z.string().max(100).optional().describe("Filter by relationship type"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
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

  // ============================================================================
  // UPDATE RELATIONSHIP VALUE - CONSOLIDATED (replaces update_relationship + modify_relationship)
  // ============================================================================
  server.registerTool(
    "update_relationship_value",
    {
      description: "Update a relationship value and/or metadata. Use mode 'delta' to change by amount with history logging, or 'set' to set absolute value.",
      inputSchema: {
        relationshipId: z.string().max(100).describe("The relationship ID"),
        mode: z.enum(["delta", "set"]).describe("'delta' to change by amount, 'set' to set absolute value"),
        value: z.number().describe("Value to add (delta mode) or set (set mode)"),
        reason: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("Reason for the change (logged to history)"),
        minValue: z.number().optional().describe("Minimum bound"),
        maxValue: z.number().optional().describe("Maximum bound"),
        relationshipType: z.string().max(100).optional().describe("Update relationship type"),
        label: z.string().max(LIMITS.NAME_MAX).nullable().optional().describe("Update label"),
        notes: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("Update notes"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ relationshipId, mode, value, reason, minValue, maxValue, relationshipType, label, notes }) => {
      const result = relationshipTools.updateRelationshipValue({
        relationshipId,
        mode,
        value,
        reason,
        minValue,
        maxValue,
        relationshipType,
        label,
        notes,
      });
      if (!result) {
        return {
          content: [{ type: "text", text: "Relationship not found" }],
          isError: true,
        };
      }
      const suggestedLabel = relationshipTools.getRelationshipLabel(result.relationship.value);
      return {
        content: [{ type: "text", text: JSON.stringify({ ...result, suggestedLabel }, null, 2) }],
      };
    }
  );

  server.registerTool(
    "delete_relationship",
    {
      description: "Delete a relationship",
      inputSchema: {
        relationshipId: z.string().max(100).describe("The relationship ID"),
      },
      annotations: ANNOTATIONS.DESTRUCTIVE,
    },
    async ({ relationshipId }) => {
      const success = relationshipTools.deleteRelationship(relationshipId);
      return {
        content: [{ type: "text", text: success ? "Relationship deleted" : "Relationship not found" }],
        isError: !success,
      };
    }
  );

  server.registerTool(
    "list_relationships",
    {
      description: "List relationships with optional filters",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
        entityId: z.string().max(100).optional().describe("Filter by entity (either source or target)"),
        sourceId: z.string().max(100).optional().describe("Filter by source entity"),
        targetId: z.string().max(100).optional().describe("Filter by target entity"),
        relationshipType: z.string().max(100).optional().describe("Filter by relationship type"),
        entityType: z.string().max(100).optional().describe("Filter by entity type"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ sessionId, ...filter }) => {
      const relationships = relationshipTools.listRelationships(sessionId, filter);
      return {
        content: [{ type: "text", text: JSON.stringify(relationships, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_relationship_history",
    {
      description: "Get change history for a relationship",
      inputSchema: {
        relationshipId: z.string().max(100).describe("The relationship ID"),
        limit: z.number().optional().describe("Maximum entries to return"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ relationshipId, limit }) => {
      const history = relationshipTools.getRelationshipHistory(relationshipId, limit);
      return {
        content: [{ type: "text", text: JSON.stringify(history, null, 2) }],
      };
    }
  );
}
