import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as tableTools from "../tools/tables.js";
import { LIMITS } from "../utils/validation.js";
import { ANNOTATIONS } from "../utils/tool-annotations.js";

const tableEntrySchema = z.object({
  minRoll: z.number().describe("Minimum roll to get this result"),
  maxRoll: z.number().describe("Maximum roll to get this result"),
  result: z.string().max(LIMITS.DESCRIPTION_MAX).describe("The result text"),
  weight: z.number().optional().describe("Weight for weighted random selection"),
  subtable: z.string().max(100).optional().describe("ID of subtable to roll on"),
  metadata: z.record(z.string(), z.unknown()).optional().describe("Additional data"),
});

export function registerTableTools(server: McpServer) {
  server.registerTool(
    "create_random_table",
    {
      description: "Create a new random table for encounters, loot, weather, etc.",
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
        name: z.string().min(1).max(LIMITS.NAME_MAX).describe("Table name"),
        description: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("Table description"),
        category: z.string().max(100).optional().describe("Category (e.g., 'encounter', 'loot', 'weather', 'name')"),
        entries: z.array(tableEntrySchema).max(LIMITS.ARRAY_MAX).optional().describe("Table entries"),
        rollExpression: z.string().max(100).optional().describe("Dice expression (default: '1d100')"),
      },
      annotations: ANNOTATIONS.CREATE,
    },
    async (params) => {
      const table = tableTools.createTable(params);
      return {
        content: [{ type: "text", text: JSON.stringify(table, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_random_table",
    {
      description: "Get a random table by ID",
      inputSchema: {
        tableId: z.string().max(100).describe("The table ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ tableId }) => {
      const table = tableTools.getTable(tableId);
      if (!table) {
        return {
          content: [{ type: "text", text: "Table not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(table, null, 2) }],
      };
    }
  );

  server.registerTool(
    "update_random_table",
    {
      description: "Update a random table",
      inputSchema: {
        tableId: z.string().max(100).describe("The table ID"),
        name: z.string().max(LIMITS.NAME_MAX).optional().describe("New name"),
        description: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("New description"),
        category: z.string().max(100).nullable().optional().describe("New category"),
        entries: z.array(tableEntrySchema).max(LIMITS.ARRAY_MAX).optional().describe("Replace all entries"),
        rollExpression: z.string().max(100).optional().describe("New dice expression"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ tableId, ...updates }) => {
      const table = tableTools.updateTable(tableId, updates);
      if (!table) {
        return {
          content: [{ type: "text", text: "Table not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(table, null, 2) }],
      };
    }
  );

  server.registerTool(
    "delete_random_table",
    {
      description: "Delete a random table",
      inputSchema: {
        tableId: z.string().max(100).describe("The table ID"),
      },
      annotations: ANNOTATIONS.DESTRUCTIVE,
    },
    async ({ tableId }) => {
      const success = tableTools.deleteTable(tableId);
      return {
        content: [{ type: "text", text: success ? "Table deleted" : "Table not found" }],
        isError: !success,
      };
    }
  );

  server.registerTool(
    "list_random_tables",
    {
      description: "List random tables in a game",
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
        category: z.string().max(100).optional().describe("Filter by category"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ gameId, category }) => {
      const tables = tableTools.listTables(gameId, category);
      return {
        content: [{ type: "text", text: JSON.stringify(tables, null, 2) }],
      };
    }
  );

  server.registerTool(
    "roll_on_table",
    {
      description: "Roll on a random table and get a result",
      inputSchema: {
        tableId: z.string().max(100).describe("The table ID"),
        modifier: z.number().optional().describe("Modifier to add to the roll"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ tableId, modifier }) => {
      const result = tableTools.rollTable(tableId, modifier);
      if (!result) {
        return {
          content: [{ type: "text", text: "Table not found or has no entries" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // ============================================================================
  // MODIFY TABLE ENTRIES - CONSOLIDATED (replaces add_table_entry + remove_table_entry)
  // ============================================================================
  server.registerTool(
    "modify_table_entries",
    {
      description: "Add and/or remove table entries in a single call. More efficient than separate add/remove calls.",
      inputSchema: {
        tableId: z.string().max(100).describe("The table ID"),
        add: z.array(tableEntrySchema).max(LIMITS.ARRAY_MAX).optional().describe("Entries to add"),
        remove: z.array(z.number()).max(LIMITS.ARRAY_MAX).optional().describe("Indices of entries to remove (0-based)"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ tableId, add, remove }) => {
      if (!add?.length && !remove?.length) {
        return {
          content: [{ type: "text", text: "No entries to add or remove" }],
          isError: true,
        };
      }

      const result = tableTools.modifyTableEntries(tableId, { add, remove });
      if (!result) {
        return {
          content: [{ type: "text", text: "Table not found" }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
