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
    "dmcp://games",
    {
      description: "List all games",
      mimeType: "application/json",
    },
    async (uri) => {
      const games = gameTools.listGames();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(games, null, 2),
          },
        ],
      };
    }
  );

  // ============================================================================
  // GAME-SCOPED RESOURCES (templated)
  // ============================================================================

  // Helper to create list callback for game-scoped resources
  const createGameListCallback = (suffix: string, nameFormatter: (g: { id: string; name: string }) => string) => {
    return async () => {
      const games = gameTools.listGames();
      return {
        resources: games.map((g) => ({
          uri: `dmcp://game/${g.id}${suffix}`,
          name: nameFormatter(g),
        })),
      };
    };
  };

  // Game details
  server.registerResource(
    "game",
    new ResourceTemplate("dmcp://game/{gameId}", {
      list: createGameListCallback("", (g) => g.name),
    }),
    {
      description: "Game metadata and preferences",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const gameId = variables.gameId as string;
      const game = gameTools.loadGame(gameId);
      if (!game) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify({ error: "Game not found" }),
            },
          ],
        };
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(game, null, 2),
          },
        ],
      };
    }
  );

  // Game state (overview)
  server.registerResource(
    "game-state",
    new ResourceTemplate("dmcp://game/{gameId}/state", {
      list: createGameListCallback("/state", (g) => `${g.name} - State`),
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
              text: JSON.stringify({ error: "Game not found" }),
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

  // Game characters
  server.registerResource(
    "game-characters",
    new ResourceTemplate("dmcp://game/{gameId}/characters", {
      list: createGameListCallback("/characters", (g) => `${g.name} - Characters`),
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

  // Game locations
  server.registerResource(
    "game-locations",
    new ResourceTemplate("dmcp://game/{gameId}/locations", {
      list: createGameListCallback("/locations", (g) => `${g.name} - Locations`),
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

  // Game map (JSON data)
  server.registerResource(
    "game-map",
    new ResourceTemplate("dmcp://game/{gameId}/map", {
      list: createGameListCallback("/map", (g) => `${g.name} - Map`),
    }),
    {
      description: "World map data with location nodes and connections",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const gameId = variables.gameId as string;
      const game = gameTools.loadGame(gameId);
      const mapResult = worldTools.renderMap(gameId, {
        playerLocationId: game?.currentLocationId || undefined,
      });
      if (!mapResult) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify({ error: "No locations in this game" }),
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

  // Game quests
  server.registerResource(
    "game-quests",
    new ResourceTemplate("dmcp://game/{gameId}/quests", {
      list: createGameListCallback("/quests", (g) => `${g.name} - Quests`),
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

  // Game history (recent narrative events)
  server.registerResource(
    "game-history",
    new ResourceTemplate("dmcp://game/{gameId}/history", {
      list: createGameListCallback("/history", (g) => `${g.name} - History`),
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

  // Game rules
  server.registerResource(
    "game-rules",
    new ResourceTemplate("dmcp://game/{gameId}/rules", {
      list: createGameListCallback("/rules", (g) => `${g.name} - Rules`),
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
              text: JSON.stringify({ error: "No rules configured for this game" }),
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
