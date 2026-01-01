import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as resourceTools from "../tools/resource.js";
import { LIMITS } from "../utils/validation.js";

export function registerResourceTools(server: McpServer) {
  server.tool(
    "create_resource",
    "Create a new resource (currency, reputation, counter, etc.)",
    {
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
    async (params) => {
      const resource = resourceTools.createResource(params);
      return {
        content: [{ type: "text", text: JSON.stringify(resource, null, 2) }],
      };
    }
  );

  server.tool(
    "get_resource",
    "Get resource details",
    {
      resourceId: z.string().max(100).describe("The resource ID"),
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

  server.tool(
    "update_resource",
    "Update resource metadata (name, description, category, bounds)",
    {
      resourceId: z.string().max(100).describe("The resource ID"),
      name: z.string().max(LIMITS.NAME_MAX).optional().describe("New name"),
      description: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("New description"),
      category: z.string().max(100).nullable().optional().describe("New category (null to clear)"),
      minValue: z.number().nullable().optional().describe("New minimum bound (null for unbounded)"),
      maxValue: z.number().nullable().optional().describe("New maximum bound (null for unbounded)"),
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

  server.tool(
    "delete_resource",
    "Delete a resource and its history",
    {
      resourceId: z.string().max(100).describe("The resource ID"),
    },
    async ({ resourceId }) => {
      const success = resourceTools.deleteResource(resourceId);
      return {
        content: [{ type: "text", text: success ? "Resource deleted" : "Resource not found" }],
        isError: !success,
      };
    }
  );

  server.tool(
    "list_resources",
    "List resources in a session",
    {
      sessionId: z.string().max(100).describe("The session ID"),
      ownerType: z.enum(["session", "character"]).optional().describe("Filter by owner type"),
      ownerId: z.string().max(100).optional().describe("Filter by owner ID (for character resources)"),
      category: z.string().max(100).optional().describe("Filter by category"),
    },
    async ({ sessionId, ownerType, ownerId, category }) => {
      const resources = resourceTools.listResources(sessionId, { ownerType, ownerId, category });
      return {
        content: [{ type: "text", text: JSON.stringify(resources, null, 2) }],
      };
    }
  );

  server.tool(
    "modify_resource",
    "Add or subtract from a resource value (with clamping and history logging)",
    {
      resourceId: z.string().max(100).describe("The resource ID"),
      delta: z.number().describe("Amount to add (positive) or subtract (negative)"),
      reason: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("Reason for the change (logged to history)"),
    },
    async (params) => {
      const result = resourceTools.modifyResource(params);
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

  server.tool(
    "set_resource",
    "Set a resource to a specific value (with clamping and history logging)",
    {
      resourceId: z.string().max(100).describe("The resource ID"),
      value: z.number().describe("New value to set"),
      reason: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("Reason for the change (logged to history)"),
    },
    async (params) => {
      const result = resourceTools.setResource(params);
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

  server.tool(
    "get_resource_history",
    "Get change history for a resource",
    {
      resourceId: z.string().max(100).describe("The resource ID"),
      limit: z.number().optional().describe("Maximum number of entries to return"),
    },
    async ({ resourceId, limit }) => {
      const history = resourceTools.getResourceHistory(resourceId, limit);
      return {
        content: [{ type: "text", text: JSON.stringify(history, null, 2) }],
      };
    }
  );
}
