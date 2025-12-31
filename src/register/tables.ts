import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as tableTools from "../tools/tables.js";

const tableEntrySchema = z.object({
  minRoll: z.number().describe("Minimum roll to get this result"),
  maxRoll: z.number().describe("Maximum roll to get this result"),
  result: z.string().describe("The result text"),
  weight: z.number().optional().describe("Weight for weighted random selection"),
  subtable: z.string().optional().describe("ID of subtable to roll on"),
  metadata: z.record(z.string(), z.unknown()).optional().describe("Additional data"),
});

export function registerTableTools(server: McpServer) {
  server.tool(
    "create_random_table",
    "Create a new random table for encounters, loot, weather, etc.",
    {
      sessionId: z.string().describe("The session ID"),
      name: z.string().describe("Table name"),
      description: z.string().optional().describe("Table description"),
      category: z.string().optional().describe("Category (e.g., 'encounter', 'loot', 'weather', 'name')"),
      entries: z.array(tableEntrySchema).optional().describe("Table entries"),
      rollExpression: z.string().optional().describe("Dice expression (default: '1d100')"),
    },
    async (params) => {
      const table = tableTools.createTable(params);
      return {
        content: [{ type: "text", text: JSON.stringify(table, null, 2) }],
      };
    }
  );

  server.tool(
    "get_random_table",
    "Get a random table by ID",
    {
      tableId: z.string().describe("The table ID"),
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

  server.tool(
    "update_random_table",
    "Update a random table",
    {
      tableId: z.string().describe("The table ID"),
      name: z.string().optional().describe("New name"),
      description: z.string().optional().describe("New description"),
      category: z.string().nullable().optional().describe("New category"),
      entries: z.array(tableEntrySchema).optional().describe("Replace all entries"),
      rollExpression: z.string().optional().describe("New dice expression"),
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

  server.tool(
    "delete_random_table",
    "Delete a random table",
    {
      tableId: z.string().describe("The table ID"),
    },
    async ({ tableId }) => {
      const success = tableTools.deleteTable(tableId);
      return {
        content: [{ type: "text", text: success ? "Table deleted" : "Table not found" }],
        isError: !success,
      };
    }
  );

  server.tool(
    "list_random_tables",
    "List random tables in a session",
    {
      sessionId: z.string().describe("The session ID"),
      category: z.string().optional().describe("Filter by category"),
    },
    async ({ sessionId, category }) => {
      const tables = tableTools.listTables(sessionId, category);
      return {
        content: [{ type: "text", text: JSON.stringify(tables, null, 2) }],
      };
    }
  );

  server.tool(
    "roll_on_table",
    "Roll on a random table and get a result",
    {
      tableId: z.string().describe("The table ID"),
      modifier: z.number().optional().describe("Modifier to add to the roll"),
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

  server.tool(
    "add_table_entry",
    "Add an entry to an existing random table",
    {
      tableId: z.string().describe("The table ID"),
      entry: tableEntrySchema.describe("The entry to add"),
    },
    async ({ tableId, entry }) => {
      const table = tableTools.addTableEntry(tableId, entry);
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

  server.tool(
    "remove_table_entry",
    "Remove an entry from a random table by index",
    {
      tableId: z.string().describe("The table ID"),
      index: z.number().describe("Index of the entry to remove (0-based)"),
    },
    async ({ tableId, index }) => {
      const table = tableTools.removeTableEntry(tableId, index);
      if (!table) {
        return {
          content: [{ type: "text", text: "Table not found or invalid index" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(table, null, 2) }],
      };
    }
  );
}
