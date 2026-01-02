import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as worldTools from "../tools/world.js";
import { imageGenSchema } from "../schemas/index.js";
import { LIMITS } from "../utils/validation.js";

export function registerWorldTools(server: McpServer) {
  server.tool(
    "create_location",
    "Create a new location in the game world",
    {
      sessionId: z.string().max(100).describe("The session ID"),
      name: z.string().min(1).max(LIMITS.NAME_MAX).describe("Location name"),
      description: z.string().max(LIMITS.DESCRIPTION_MAX).describe("Location description"),
      properties: z.object({
        features: z.array(z.string().max(LIMITS.NAME_MAX)).max(LIMITS.ARRAY_MAX).optional(),
        atmosphere: z.string().max(LIMITS.DESCRIPTION_MAX).optional(),
      }).optional().describe("Additional location properties"),
      imageGen: imageGenSchema.optional().describe("Image generation metadata for location art"),
    },
    async ({ sessionId, name, description, properties, imageGen }) => {
      const location = worldTools.createLocation({ sessionId, name, description, properties, imageGen });
      return {
        content: [{ type: "text", text: JSON.stringify(location, null, 2) }],
      };
    }
  );

  server.tool(
    "get_location",
    "Get location details",
    {
      locationId: z.string().describe("The location ID"),
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

  server.tool(
    "update_location",
    "Update a location",
    {
      locationId: z.string().describe("The location ID"),
      name: z.string().optional().describe("New name"),
      description: z.string().optional().describe("New description"),
      properties: z.record(z.string(), z.unknown()).optional().describe("Property updates"),
      imageGen: imageGenSchema.nullable().optional().describe("Image generation metadata (null to remove)"),
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

  server.tool(
    "list_locations",
    "List all locations in a session",
    {
      sessionId: z.string().describe("The session ID"),
    },
    async ({ sessionId }) => {
      const locations = worldTools.listLocations(sessionId);
      return {
        content: [{ type: "text", text: JSON.stringify(locations, null, 2) }],
      };
    }
  );

  server.tool(
    "connect_locations",
    "Create exits/paths between two locations",
    {
      fromLocationId: z.string().describe("First location ID"),
      toLocationId: z.string().describe("Second location ID"),
      fromDirection: z.string().describe("Direction from first location (e.g., 'north', 'up', 'through the door')"),
      toDirection: z.string().describe("Direction from second location back (e.g., 'south', 'down')"),
      description: z.string().optional().describe("Description of the path"),
      bidirectional: z.boolean().optional().describe("Create exit in both directions (default: true)"),
    },
    async ({ fromLocationId, toLocationId, fromDirection, toDirection, description, bidirectional }) => {
      const success = worldTools.connectLocations({
        fromLocationId,
        toLocationId,
        fromDirection,
        toDirection,
        description,
        bidirectional,
      });
      return {
        content: [{ type: "text", text: success ? "Locations connected" : "Failed to connect locations" }],
        isError: !success,
      };
    }
  );

}
