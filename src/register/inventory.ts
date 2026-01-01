import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as inventoryTools from "../tools/inventory.js";
import { imageGenSchema } from "../schemas/index.js";
import { LIMITS } from "../utils/validation.js";

export function registerInventoryTools(server: McpServer) {
  server.tool(
    "create_item",
    "Create a new item",
    {
      sessionId: z.string().max(100).describe("The session ID"),
      ownerId: z.string().max(100).describe("Character or location ID that owns the item"),
      ownerType: z.enum(["character", "location"]).describe("Owner type"),
      name: z.string().min(1).max(LIMITS.NAME_MAX).describe("Item name"),
      properties: z.object({
        description: z.string().max(LIMITS.DESCRIPTION_MAX).optional(),
        type: z.string().max(100).optional(),
        weight: z.number().optional(),
        value: z.number().optional(),
        effects: z.array(z.string().max(LIMITS.NAME_MAX)).max(LIMITS.ARRAY_MAX).optional(),
      }).optional().describe("Item properties"),
      imageGen: imageGenSchema.optional().describe("Image generation metadata for item art"),
    },
    async (params) => {
      const item = inventoryTools.createItem(params);
      return {
        content: [{ type: "text", text: JSON.stringify(item, null, 2) }],
      };
    }
  );

  server.tool(
    "get_item",
    "Get item details",
    {
      itemId: z.string().max(100).describe("The item ID"),
    },
    async ({ itemId }) => {
      const item = inventoryTools.getItem(itemId);
      if (!item) {
        return {
          content: [{ type: "text", text: "Item not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(item, null, 2) }],
      };
    }
  );

  server.tool(
    "update_item",
    "Update an item",
    {
      itemId: z.string().max(100).describe("The item ID"),
      name: z.string().max(LIMITS.NAME_MAX).optional().describe("New name"),
      properties: z.record(z.string(), z.unknown()).optional().describe("Property updates"),
      imageGen: imageGenSchema.nullable().optional().describe("Image generation metadata (null to remove)"),
    },
    async ({ itemId, name, properties, imageGen }) => {
      const item = inventoryTools.updateItem(itemId, { name, properties, imageGen });
      if (!item) {
        return {
          content: [{ type: "text", text: "Item not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(item, null, 2) }],
      };
    }
  );

  server.tool(
    "delete_item",
    "Delete an item",
    {
      itemId: z.string().max(100).describe("The item ID"),
    },
    async ({ itemId }) => {
      const success = inventoryTools.deleteItem(itemId);
      return {
        content: [{ type: "text", text: success ? "Item deleted" : "Item not found" }],
        isError: !success,
      };
    }
  );

  server.tool(
    "transfer_item",
    "Transfer an item to a new owner",
    {
      itemId: z.string().max(100).describe("The item ID"),
      newOwnerId: z.string().max(100).describe("New owner ID"),
      newOwnerType: z.enum(["character", "location"]).describe("New owner type"),
    },
    async ({ itemId, newOwnerId, newOwnerType }) => {
      const item = inventoryTools.transferItem(itemId, newOwnerId, newOwnerType);
      if (!item) {
        return {
          content: [{ type: "text", text: "Item not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(item, null, 2) }],
      };
    }
  );

  server.tool(
    "get_inventory",
    "Get inventory for a character or location",
    {
      ownerId: z.string().max(100).describe("Owner ID"),
      ownerType: z.enum(["character", "location"]).describe("Owner type"),
    },
    async ({ ownerId, ownerType }) => {
      const items = inventoryTools.getInventory(ownerId, ownerType);
      return {
        content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
      };
    }
  );
}
