import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as worldTools from "../tools/world.js";
import { imageGenSchema } from "../schemas/index.js";

export function registerWorldTools(server: McpServer) {
  server.tool(
    "create_location",
    "Create a new location in the game world",
    {
      sessionId: z.string().describe("The session ID"),
      name: z.string().describe("Location name"),
      description: z.string().describe("Location description"),
      properties: z.object({
        features: z.array(z.string()).optional(),
        atmosphere: z.string().optional(),
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

  server.tool(
    "render_map",
    "Render an ASCII map of the game world. Can show the full map or a local area around a specific location.",
    {
      sessionId: z.string().describe("The session ID"),
      centerId: z.string().optional().describe("Location ID to center the map on (defaults to player location or first location)"),
      radius: z.number().optional().describe("Maximum distance from center to show (omit for full map)"),
      playerLocationId: z.string().optional().describe("Current player location ID (marks with @ on map)"),
    },
    async ({ sessionId, centerId, radius, playerLocationId }) => {
      const mapData = worldTools.renderMap(sessionId, {
        centerId,
        radius,
        showPlayerLocation: !!playerLocationId,
        playerLocationId,
      });

      if (!mapData) {
        return {
          content: [{ type: "text", text: "No locations found in this session" }],
          isError: true,
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ascii: mapData.ascii,
            nodeCount: mapData.nodes.length,
            bounds: mapData.bounds,
            nodes: mapData.nodes.map(n => ({
              id: n.id,
              name: n.name,
              position: { x: n.x, y: n.y },
              exits: n.exits.length,
              isCenter: n.isCenter,
              hasPlayer: n.hasPlayer,
            })),
            instruction: "Display the ASCII map to the player. The @ symbol marks the player's location. Use this to help players visualize the game world.",
          }, null, 2),
        }],
      };
    }
  );
}
