import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as tagTools from "../tools/tags.js";
import { LIMITS } from "../utils/validation.js";
import { ANNOTATIONS } from "../utils/tool-annotations.js";
import { tagModifyOutputSchema } from "../utils/output-schemas.js";

export function registerTagTools(server: McpServer) {
  // ============================================================================
  // CONSOLIDATED: MODIFY TAGS (add and/or remove in a single call)
  // ============================================================================
  server.registerTool(
    "modify_tags",
    {
      description: "Add and/or remove tags from an entity in a single call. More efficient than separate add/remove calls.",
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
        entityId: z.string().max(100).describe("The entity ID to modify tags on"),
        entityType: z.string().max(100).describe("Type of entity (e.g., 'character', 'location', 'item', 'quest')"),
        add: z.array(z.object({
          tag: z.string().min(1).max(LIMITS.NAME_MAX),
          color: z.string().max(50).optional(),
          notes: z.string().max(LIMITS.DESCRIPTION_MAX).optional(),
        })).max(LIMITS.ARRAY_MAX).optional().describe("Tags to add with optional color/notes"),
        remove: z.array(z.string().max(LIMITS.NAME_MAX)).max(LIMITS.ARRAY_MAX).optional().describe("Tags to remove"),
      },
      outputSchema: tagModifyOutputSchema,
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ gameId, entityId, entityType, add, remove }) => {
      if (!add?.length && !remove?.length) {
        return {
          content: [{ type: "text", text: "No tags to add or remove" }],
          isError: true,
        };
      }

      const result = tagTools.modifyTags({ gameId, entityId, entityType, add, remove });
      const output = {
        entityId: result.entityId,
        entityType: result.entityType,
        tags: result.tags,
        action: result.added.length > 0 && result.removed.length > 0
          ? "modified" as const
          : result.added.length > 0
          ? "added" as const
          : "removed" as const,
        tag: result.added[0] || result.removed[0] || "",
      };

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output as unknown as Record<string, unknown>,
      };
    }
  );

  // ============================================================================
  // LIST TAGS - read-only
  // ============================================================================
  server.registerTool(
    "list_tags",
    {
      description: "List all unique tags in a game with counts",
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ gameId }) => {
      const tags = tagTools.listTags(gameId);
      return {
        content: [{ type: "text", text: JSON.stringify(tags, null, 2) }],
      };
    }
  );

  // ============================================================================
  // GET ENTITY TAGS - read-only
  // ============================================================================
  server.registerTool(
    "get_entity_tags",
    {
      description: "Get all tags for a specific entity",
      inputSchema: {
        entityId: z.string().max(100).describe("The entity ID"),
        entityType: z.string().max(100).describe("Type of entity"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ entityId, entityType }) => {
      const tags = tagTools.getEntityTags(entityId, entityType);
      return {
        content: [{ type: "text", text: JSON.stringify(tags, null, 2) }],
      };
    }
  );

  // ============================================================================
  // FIND BY TAG - read-only
  // ============================================================================
  server.registerTool(
    "find_by_tag",
    {
      description: "Find all entities with a specific tag",
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
        tag: z.string().max(LIMITS.NAME_MAX).describe("The tag to search for"),
        entityType: z.string().max(100).optional().describe("Filter by entity type"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ gameId, tag, entityType }) => {
      const entities = tagTools.findByTag(gameId, tag, entityType);
      return {
        content: [{ type: "text", text: JSON.stringify(entities, null, 2) }],
      };
    }
  );

  // ============================================================================
  // RENAME TAG - update
  // ============================================================================
  server.registerTool(
    "rename_tag",
    {
      description: "Rename a tag across all entities in a game",
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
        oldTag: z.string().max(LIMITS.NAME_MAX).describe("The current tag name"),
        newTag: z.string().min(1).max(LIMITS.NAME_MAX).describe("The new tag name"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ gameId, oldTag, newTag }) => {
      const count = tagTools.renameTag(gameId, oldTag, newTag);
      return {
        content: [{ type: "text", text: `Renamed ${count} tag(s)` }],
      };
    }
  );
}
