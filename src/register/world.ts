import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as worldTools from "../tools/world.js";
import { imageGenSchema } from "../schemas/index.js";
import { LIMITS } from "../utils/validation.js";
import { ANNOTATIONS } from "../utils/tool-annotations.js";

export function registerWorldTools(server: McpServer) {
  server.registerTool(
    "create_location",
    {
      description: "Create a new location in the game world. IMPORTANT: Call this IMMEDIATELY when describing any new place, BEFORE narrating what happens there. Every location the player visits or hears about should exist in the database.",
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
        name: z.string().min(1).max(LIMITS.NAME_MAX).describe("Location name"),
        description: z.string().max(LIMITS.DESCRIPTION_MAX).describe("Location description"),
        properties: z.object({
          features: z.array(z.string().max(LIMITS.NAME_MAX)).max(LIMITS.ARRAY_MAX).optional(),
          atmosphere: z.string().max(LIMITS.DESCRIPTION_MAX).optional(),
        }).optional().describe("Additional location properties"),
        imageGen: imageGenSchema.optional().describe("Image generation metadata for location art"),
      },
      annotations: ANNOTATIONS.CREATE,
    },
    async ({ gameId, name, description, properties, imageGen }) => {
      const location = worldTools.createLocation({ gameId, name, description, properties, imageGen });
      return {
        content: [{ type: "text", text: JSON.stringify(location, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_location",
    {
      description: "Get location details",
      inputSchema: {
        locationId: z.string().describe("The location ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ locationId }) => {
      const location = worldTools.getLocation(locationId);
      if (!location) {
        return {
          content: [{ type: "text", text: "Location not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(location, null, 2) }],
      };
    }
  );

  server.registerTool(
    "update_location",
    {
      description: "Update a location",
      inputSchema: {
        locationId: z.string().describe("The location ID"),
        name: z.string().optional().describe("New name"),
        description: z.string().optional().describe("New description"),
        properties: z.record(z.string(), z.unknown()).optional().describe("Property updates"),
        imageGen: imageGenSchema.nullable().optional().describe("Image generation metadata (null to remove)"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ locationId, name, description, properties, imageGen }) => {
      const location = worldTools.updateLocation(locationId, { name, description, properties, imageGen });
      if (!location) {
        return {
          content: [{ type: "text", text: "Location not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(location, null, 2) }],
      };
    }
  );

  server.registerTool(
    "list_locations",
    {
      description: "List all locations in a game",
      inputSchema: {
        gameId: z.string().describe("The game ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ gameId }) => {
      const locations = worldTools.listLocations(gameId);
      return {
        content: [{ type: "text", text: JSON.stringify(locations, null, 2) }],
      };
    }
  );

  server.registerTool(
    "connect_locations",
    {
      description: "Create exits/paths between two locations. Call this whenever you describe how locations connect to each other - the player should be able to navigate based on database connections.",
      inputSchema: {
        fromLocationId: z.string().describe("First location ID"),
        toLocationId: z.string().describe("Second location ID"),
        fromDirection: z.string().describe("Direction from first location (e.g., 'north', 'up', 'through the door')"),
        toDirection: z.string().describe("Direction from second location back (e.g., 'south', 'down')"),
        description: z.string().optional().describe("Description of the path"),
        bidirectional: z.boolean().optional().describe("Create exit in both directions (default: true)"),
      },
      annotations: ANNOTATIONS.CREATE,
    },
    async ({ fromLocationId, toLocationId, fromDirection, toDirection, description, bidirectional }) => {
      const result = worldTools.connectLocations({
        fromLocationId,
        toLocationId,
        fromDirection,
        toDirection,
        description,
        bidirectional,
      });
      if (!result) {
        return {
          content: [{ type: "text", text: "Failed to connect locations - one or both locations not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_location_by_name",
    {
      description: "Look up a location by name within a game. Supports exact, partial, and fuzzy matching. Returns the best match or an error if no reasonable match found.",
      inputSchema: {
        gameId: z.string().describe("The game ID to search within"),
        name: z.string().describe("Location name to search for (case-insensitive)"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ gameId, name }) => {
      const location = worldTools.getLocationByName(gameId, name);
      if (!location) {
        return {
          content: [{ type: "text", text: `No location found matching "${name}"` }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(location, null, 2) }],
      };
    }
  );

}
