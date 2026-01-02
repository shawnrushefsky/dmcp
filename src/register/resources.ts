import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as resourceTools from "../tools/resource.js";
import { LIMITS } from "../utils/validation.js";
import { ANNOTATIONS } from "../utils/tool-annotations.js";

export function registerResourceTools(server: McpServer) {
  server.registerTool(
    "create_resource",
    {
      description: "Create a new resource (currency, reputation, counter, etc.)",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
        ownerType: z.enum(["session", "character"]).describe("Owner type: 'session' for party/global resources, 'character' for personal resources"),
        ownerId: z.string().max(100).optional().describe("Character ID if ownerType is 'character' (omit for session-level resources)"),
        name: z.string().min(1).max(LIMITS.NAME_MAX).describe("Resource name (e.g., 'Gold', 'Sanity', 'Thieves Guild Reputation')"),
        description: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("Resource description"),
        category: z.string().max(100).optional().describe("Category for grouping (e.g., 'currency', 'reputation', 'pool', 'counter')"),
        value: z.number().optional().describe("Initial value (default: 0)"),
        minValue: z.number().optional().describe("Minimum bound (null for unbounded)"),
        maxValue: z.number().optional().describe("Maximum bound (null for unbounded)"),
      },
      annotations: ANNOTATIONS.CREATE,
    },
    async (params) => {
      const resource = resourceTools.createResource(params);
      return {
        content: [{ type: "text", text: JSON.stringify(resource, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_resource",
    {
      description: "Get resource details",
      inputSchema: {
        resourceId: z.string().max(100).describe("The resource ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ resourceId }) => {
      const resource = resourceTools.getResource(resourceId);
      if (!resource) {
        return {
          content: [{ type: "text", text: "Resource not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(resource, null, 2) }],
      };
    }
  );

  server.registerTool(
    "update_resource",
    {
      description: "Update resource metadata (name, description, category, bounds)",
      inputSchema: {
        resourceId: z.string().max(100).describe("The resource ID"),
        name: z.string().max(LIMITS.NAME_MAX).optional().describe("New name"),
        description: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("New description"),
        category: z.string().max(100).nullable().optional().describe("New category (null to clear)"),
        minValue: z.number().nullable().optional().describe("New minimum bound (null for unbounded)"),
        maxValue: z.number().nullable().optional().describe("New maximum bound (null for unbounded)"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ resourceId, ...updates }) => {
      const resource = resourceTools.updateResource(resourceId, updates);
      if (!resource) {
        return {
          content: [{ type: "text", text: "Resource not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(resource, null, 2) }],
      };
    }
  );

  server.registerTool(
    "delete_resource",
    {
      description: "Delete a resource and its history",
      inputSchema: {
        resourceId: z.string().max(100).describe("The resource ID"),
      },
      annotations: ANNOTATIONS.DESTRUCTIVE,
    },
    async ({ resourceId }) => {
      const success = resourceTools.deleteResource(resourceId);
      return {
        content: [{ type: "text", text: success ? "Resource deleted" : "Resource not found" }],
        isError: !success,
      };
    }
  );

  server.registerTool(
    "list_resources",
    {
      description: "List resources in a session",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
        ownerType: z.enum(["session", "character"]).optional().describe("Filter by owner type"),
        ownerId: z.string().max(100).optional().describe("Filter by owner ID (for character resources)"),
        category: z.string().max(100).optional().describe("Filter by category"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ sessionId, ownerType, ownerId, category }) => {
      const resources = resourceTools.listResources(sessionId, { ownerType, ownerId, category });
      return {
        content: [{ type: "text", text: JSON.stringify(resources, null, 2) }],
      };
    }
  );

  // ============================================================================
  // UPDATE RESOURCE VALUE - CONSOLIDATED (replaces modify_resource + set_resource)
  // ============================================================================
  server.registerTool(
    "update_resource_value",
    {
      description: "Update a resource's value. Use mode 'delta' to add/subtract, or 'set' to set an absolute value. Changes are logged to history.",
      inputSchema: {
        resourceId: z.string().max(100).describe("The resource ID"),
        mode: z.enum(["delta", "set"]).describe("'delta' to add/subtract, 'set' to set absolute value"),
        value: z.number().describe("Amount to add/subtract (for delta) or absolute value (for set)"),
        reason: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("Reason for the change (logged to history)"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ resourceId, mode, value, reason }) => {
      const result = resourceTools.updateResourceValue({ resourceId, mode, value, reason });
      if (!result) {
        return {
          content: [{ type: "text", text: "Resource not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_resource_history",
    {
      description: "Get change history for a resource",
      inputSchema: {
        resourceId: z.string().max(100).describe("The resource ID"),
        limit: z.number().optional().describe("Maximum number of entries to return"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ resourceId, limit }) => {
      const history = resourceTools.getResourceHistory(resourceId, limit);
      return {
        content: [{ type: "text", text: JSON.stringify(history, null, 2) }],
      };
    }
  );
}
