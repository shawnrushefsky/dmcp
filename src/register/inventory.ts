import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as inventoryTools from "../tools/inventory.js";
import { imageGenSchema } from "../schemas/index.js";

export function registerInventoryTools(server: McpServer) {
  server.tool(
    "create_item",
    "Create a new item",
    {
      sessionId: z.string().describe("The session ID"),
      ownerId: z.string().describe("Character or location ID that owns the item"),
      ownerType: z.enum(["character", "location"]).describe("Owner type"),
      name: z.string().describe("Item name"),
      properties: z.object({
        description: z.string().optional(),
        type: z.string().optional(),
        weight: z.number().optional(),
        value: z.number().optional(),
        effects: z.array(z.string()).optional(),
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
      itemId: z.string().describe("The item ID"),
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
      itemId: z.string().describe("The item ID"),
      name: z.string().optional().describe("New name"),
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
      itemId: z.string().describe("The item ID"),
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
      itemId: z.string().describe("The item ID"),
      newOwnerId: z.string().describe("New owner ID"),
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
      ownerId: z.string().describe("Owner ID"),
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
