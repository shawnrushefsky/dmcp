import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as tagTools from "../tools/tags.js";

export function registerTagTools(server: McpServer) {
  server.tool(
    "add_tag",
    "Add a tag to any entity (character, location, item, quest, etc.)",
    {
      sessionId: z.string().describe("The session ID"),
      entityId: z.string().describe("The entity ID to tag"),
      entityType: z.string().describe("Type of entity (e.g., 'character', 'location', 'item', 'quest')"),
      tag: z.string().describe("The tag to add"),
      color: z.string().optional().describe("Optional color hint for the tag"),
      notes: z.string().optional().describe("Optional notes about this tag"),
    },
    async (params) => {
      const tag = tagTools.addTag(params);
      return {
        content: [{ type: "text", text: JSON.stringify(tag, null, 2) }],
      };
    }
  );

  server.tool(
    "remove_tag",
    "Remove a tag from an entity",
    {
      sessionId: z.string().describe("The session ID"),
      entityId: z.string().describe("The entity ID"),
      entityType: z.string().describe("Type of entity"),
      tag: z.string().describe("The tag to remove"),
    },
    async (params) => {
      const success = tagTools.removeTag(params);
      return {
        content: [{ type: "text", text: success ? "Tag removed" : "Tag not found" }],
        isError: !success,
      };
    }
  );

  server.tool(
    "list_tags",
    "List all unique tags in a session with counts",
    {
      sessionId: z.string().describe("The session ID"),
    },
    async ({ sessionId }) => {
      const tags = tagTools.listTags(sessionId);
      return {
        content: [{ type: "text", text: JSON.stringify(tags, null, 2) }],
      };
    }
  );

  server.tool(
    "get_entity_tags",
    "Get all tags for a specific entity",
    {
      entityId: z.string().describe("The entity ID"),
      entityType: z.string().describe("Type of entity"),
    },
    async ({ entityId, entityType }) => {
      const tags = tagTools.getEntityTags(entityId, entityType);
      return {
        content: [{ type: "text", text: JSON.stringify(tags, null, 2) }],
      };
    }
  );

  server.tool(
    "find_by_tag",
    "Find all entities with a specific tag",
    {
      sessionId: z.string().describe("The session ID"),
      tag: z.string().describe("The tag to search for"),
      entityType: z.string().optional().describe("Filter by entity type"),
    },
    async ({ sessionId, tag, entityType }) => {
      const entities = tagTools.findByTag(sessionId, tag, entityType);
      return {
        content: [{ type: "text", text: JSON.stringify(entities, null, 2) }],
      };
    }
  );

  server.tool(
    "rename_tag",
    "Rename a tag across all entities in a session",
    {
      sessionId: z.string().describe("The session ID"),
      oldTag: z.string().describe("The current tag name"),
      newTag: z.string().describe("The new tag name"),
    },
    async ({ sessionId, oldTag, newTag }) => {
      const count = tagTools.renameTag(sessionId, oldTag, newTag);
      return {
        content: [{ type: "text", text: `Renamed ${count} tag(s)` }],
      };
    }
  );
}
