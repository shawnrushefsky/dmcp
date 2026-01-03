import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as gameTools from "../tools/game.js";
import * as characterTools from "../tools/character.js";
import * as worldTools from "../tools/world.js";
import * as questTools from "../tools/quest.js";
import * as narrativeTools from "../tools/narrative.js";
import * as rulesTools from "../tools/rules.js";

export function registerMcpResources(server: McpServer) {
  // ============================================================================
  // STATIC RESOURCES
  // ============================================================================

  // List all games
  server.registerResource(
    "games",
    "dmcp://sessions",
    {
      description: "List all games",
      mimeType: "application/json",
    },
    async (uri) => {
      const sessions = gameTools.listGames();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(sessions, null, 2),
          },
        ],
      };
    }
  );

  // ============================================================================
  // SESSION-SCOPED RESOURCES (templated)
  // ============================================================================

  // Helper to create list callback for session-scoped resources
  const createGameListCallback = (suffix: string, nameFormatter: (s: { id: string; name: string }) => string) => {
    return async () => {
      const sessions = gameTools.listGames();
      return {
        resources: sessions.map((s) => ({
          uri: `dmcp://session/${s.id}${suffix}`,
          name: nameFormatter(s),
        })),
      };
    };
  };

  // Session details
  server.registerResource(
    "session",
    new ResourceTemplate("dmcp://session/{gameId}", {
      list: createGameListCallback("", (s) => s.name),
    }),
    {
      description: "Session metadata and preferences",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const gameId = variables.gameId as string;
      const session = gameTools.loadGame(gameId);
      if (!session) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify({ error: "Session not found" }),
            },
          ],
        };
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(session, null, 2),
          },
        ],
      };
    }
  );

  // Session state (overview)
  server.registerResource(
    "session-state",
    new ResourceTemplate("dmcp://session/{gameId}/state", {
      list: createGameListCallback("/state", (s) => `${s.name} - State`),
    }),
    {
      description: "Current game state snapshot with counts",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const gameId = variables.gameId as string;
      const state = gameTools.getGameState(gameId);
      if (!state) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify({ error: "Session not found" }),
            },
          ],
        };
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(state, null, 2),
          },
        ],
      };
    }
  );

  // Session characters
  server.registerResource(
    "session-characters",
    new ResourceTemplate("dmcp://session/{gameId}/characters", {
      list: createGameListCallback("/characters", (s) => `${s.name} - Characters`),
    }),
    {
      description: "All characters in the game",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const gameId = variables.gameId as string;
      const characters = characterTools.listCharacters(gameId);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(characters, null, 2),
          },
        ],
      };
    }
  );

  // Session locations
  server.registerResource(
    "session-locations",
    new ResourceTemplate("dmcp://session/{gameId}/locations", {
      list: createGameListCallback("/locations", (s) => `${s.name} - Locations`),
    }),
    {
      description: "All locations in the game",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const gameId = variables.gameId as string;
      const locations = worldTools.listLocations(gameId);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(locations, null, 2),
          },
        ],
      };
    }
  );

  // Session map (JSON data)
  server.registerResource(
    "session-map",
    new ResourceTemplate("dmcp://session/{gameId}/map", {
      list: createGameListCallback("/map", (s) => `${s.name} - Map`),
    }),
    {
      description: "World map data with location nodes and connections",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const gameId = variables.gameId as string;
      const session = gameTools.loadGame(gameId);
      const mapResult = worldTools.renderMap(gameId, {
        playerLocationId: session?.currentLocationId || undefined,
      });
      if (!mapResult) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify({ error: "No locations in this session" }),
            },
          ],
        };
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(mapResult, null, 2),
          },
        ],
      };
    }
  );

  // Session quests
  server.registerResource(
    "session-quests",
    new ResourceTemplate("dmcp://session/{gameId}/quests", {
      list: createGameListCallback("/quests", (s) => `${s.name} - Quests`),
    }),
    {
      description: "All quests in the game",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const gameId = variables.gameId as string;
      const quests = questTools.listQuests(gameId);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(quests, null, 2),
          },
        ],
      };
    }
  );

  // Session history (recent narrative events)
  server.registerResource(
    "session-history",
    new ResourceTemplate("dmcp://session/{gameId}/history", {
      list: createGameListCallback("/history", (s) => `${s.name} - History`),
    }),
    {
      description: "Recent narrative events (last 50)",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const gameId = variables.gameId as string;
      const history = narrativeTools.getHistory(gameId, { limit: 50 });
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(history, null, 2),
          },
        ],
      };
    }
  );

  // Session rules
  server.registerResource(
    "session-rules",
    new ResourceTemplate("dmcp://session/{gameId}/rules", {
      list: createGameListCallback("/rules", (s) => `${s.name} - Rules`),
    }),
    {
      description: "Rule system for the game",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const gameId = variables.gameId as string;
      const rules = rulesTools.getRules(gameId);
      if (!rules) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify({ error: "No rules configured for this session" }),
            },
          ],
        };
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(rules, null, 2),
          },
        ],
      };
    }
  );

  // ============================================================================
  // ENTITY RESOURCES (direct access by ID)
  // ============================================================================

  // Character by ID (rendered sheet)
  server.registerResource(
    "character",
    new ResourceTemplate("dmcp://character/{characterId}", {
      list: undefined, // No enumeration - access by ID only
    }),
    {
      description: "Character sheet data",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const characterId = variables.characterId as string;
      const sheet = characterTools.renderCharacterSheet(characterId);
      if (!sheet) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify({ error: "Character not found" }),
            },
          ],
        };
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(sheet, null, 2),
          },
        ],
      };
    }
  );

  // Location by ID
  server.registerResource(
    "location",
    new ResourceTemplate("dmcp://location/{locationId}", {
      list: undefined, // No enumeration - access by ID only
    }),
    {
      description: "Location details with exits",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const locationId = variables.locationId as string;
      const location = worldTools.getLocation(locationId);
      if (!location) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify({ error: "Location not found" }),
            },
          ],
        };
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(location, null, 2),
          },
        ],
      };
    }
  );

  // Quest by ID
  server.registerResource(
    "quest",
    new ResourceTemplate("dmcp://quest/{questId}", {
      list: undefined, // No enumeration - access by ID only
    }),
    {
      description: "Quest details with objectives",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const questId = variables.questId as string;
      const quest = questTools.getQuest(questId);
      if (!quest) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify({ error: "Quest not found" }),
            },
          ],
        };
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(quest, null, 2),
          },
        ],
      };
    }
  );
}
