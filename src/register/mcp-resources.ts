import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as sessionTools from "../tools/session.js";
import * as characterTools from "../tools/character.js";
import * as worldTools from "../tools/world.js";
import * as questTools from "../tools/quest.js";
import * as narrativeTools from "../tools/narrative.js";
import * as rulesTools from "../tools/rules.js";

export function registerMcpResources(server: McpServer) {
  // ============================================================================
  // STATIC RESOURCES
  // ============================================================================

  // List all sessions
  server.registerResource(
    "sessions",
    "dmcp://sessions",
    {
      description: "List all game sessions",
      mimeType: "application/json",
    },
    async (uri) => {
      const sessions = sessionTools.listSessions();
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
  const createSessionListCallback = (suffix: string, nameFormatter: (s: { id: string; name: string }) => string) => {
    return async () => {
      const sessions = sessionTools.listSessions();
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
    new ResourceTemplate("dmcp://session/{sessionId}", {
      list: createSessionListCallback("", (s) => s.name),
    }),
    {
      description: "Session metadata and preferences",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const sessionId = variables.sessionId as string;
      const session = sessionTools.loadSession(sessionId);
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
    new ResourceTemplate("dmcp://session/{sessionId}/state", {
      list: createSessionListCallback("/state", (s) => `${s.name} - State`),
    }),
    {
      description: "Current game state snapshot with counts",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const sessionId = variables.sessionId as string;
      const state = sessionTools.getSessionState(sessionId);
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
    new ResourceTemplate("dmcp://session/{sessionId}/characters", {
      list: createSessionListCallback("/characters", (s) => `${s.name} - Characters`),
    }),
    {
      description: "All characters in the session",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const sessionId = variables.sessionId as string;
      const characters = characterTools.listCharacters(sessionId);
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
    new ResourceTemplate("dmcp://session/{sessionId}/locations", {
      list: createSessionListCallback("/locations", (s) => `${s.name} - Locations`),
    }),
    {
      description: "All locations in the session",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const sessionId = variables.sessionId as string;
      const locations = worldTools.listLocations(sessionId);
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
    new ResourceTemplate("dmcp://session/{sessionId}/map", {
      list: createSessionListCallback("/map", (s) => `${s.name} - Map`),
    }),
    {
      description: "World map data with location nodes and connections",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const sessionId = variables.sessionId as string;
      const session = sessionTools.loadSession(sessionId);
      const mapResult = worldTools.renderMap(sessionId, {
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
    new ResourceTemplate("dmcp://session/{sessionId}/quests", {
      list: createSessionListCallback("/quests", (s) => `${s.name} - Quests`),
    }),
    {
      description: "All quests in the session",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const sessionId = variables.sessionId as string;
      const quests = questTools.listQuests(sessionId);
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
    new ResourceTemplate("dmcp://session/{sessionId}/history", {
      list: createSessionListCallback("/history", (s) => `${s.name} - History`),
    }),
    {
      description: "Recent narrative events (last 50)",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const sessionId = variables.sessionId as string;
      const history = narrativeTools.getHistory(sessionId, { limit: 50 });
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
    new ResourceTemplate("dmcp://session/{sessionId}/rules", {
      list: createSessionListCallback("/rules", (s) => `${s.name} - Rules`),
    }),
    {
      description: "Rule system for the session",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const sessionId = variables.sessionId as string;
      const rules = rulesTools.getRules(sessionId);
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
