#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { initializeSchema } from "./db/schema.js";
import { closeDatabase } from "./db/connection.js";

// Import all tool modules
import * as sessionTools from "./tools/session.js";
import * as rulesTools from "./tools/rules.js";
import * as worldTools from "./tools/world.js";
import * as characterTools from "./tools/character.js";
import * as combatTools from "./tools/combat.js";
import * as inventoryTools from "./tools/inventory.js";
import * as questTools from "./tools/quest.js";
import * as diceTools from "./tools/dice.js";
import * as narrativeTools from "./tools/narrative.js";

// Initialize database
initializeSchema();

// Create MCP server
const server = new McpServer({
  name: "dmcp",
  version: "0.1.0",
});

// ============================================================================
// SESSION TOOLS
// ============================================================================

server.tool(
  "create_session",
  "Create a new game session with a setting and style",
  {
    name: z.string().describe("Name for this game session"),
    setting: z.string().describe("The game setting (e.g., 'dark fantasy', 'cyberpunk', 'cosmic horror')"),
    style: z.string().describe("The narrative style (e.g., 'gritty', 'heroic', 'survival')"),
  },
  async ({ name, setting, style }) => {
    const session = sessionTools.createSession({ name, setting, style });
    return {
      content: [{ type: "text", text: JSON.stringify(session, null, 2) }],
    };
  }
);

server.tool(
  "load_session",
  "Load an existing game session by ID",
  {
    sessionId: z.string().describe("The session ID to load"),
  },
  async ({ sessionId }) => {
    const session = sessionTools.loadSession(sessionId);
    if (!session) {
      return {
        content: [{ type: "text", text: `Session ${sessionId} not found` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(session, null, 2) }],
    };
  }
);

server.tool(
  "list_sessions",
  "List all saved game sessions",
  {},
  async () => {
    const sessions = sessionTools.listSessions();
    return {
      content: [{ type: "text", text: JSON.stringify(sessions, null, 2) }],
    };
  }
);

server.tool(
  "get_session_state",
  "Get full current state overview for a session",
  {
    sessionId: z.string().describe("The session ID"),
  },
  async ({ sessionId }) => {
    const state = sessionTools.getSessionState(sessionId);
    if (!state) {
      return {
        content: [{ type: "text", text: `Session ${sessionId} not found` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(state, null, 2) }],
    };
  }
);

server.tool(
  "delete_session",
  "Delete a game session and all its data",
  {
    sessionId: z.string().describe("The session ID to delete"),
  },
  async ({ sessionId }) => {
    const success = sessionTools.deleteSession(sessionId);
    return {
      content: [{ type: "text", text: success ? "Session deleted" : "Session not found" }],
      isError: !success,
    };
  }
);

// ============================================================================
// RULES TOOLS
// ============================================================================

server.tool(
  "set_rules",
  "Store a rule system for the session",
  {
    sessionId: z.string().describe("The session ID"),
    rules: z.object({
      name: z.string(),
      description: z.string(),
      attributes: z.array(z.object({
        name: z.string(),
        abbreviation: z.string(),
        description: z.string(),
        defaultValue: z.number(),
        minValue: z.number(),
        maxValue: z.number(),
      })),
      skills: z.array(z.object({
        name: z.string(),
        governingAttribute: z.string(),
        description: z.string(),
      })),
      derivedStats: z.array(z.object({
        name: z.string(),
        abbreviation: z.string(),
        description: z.string(),
        formula: z.string(),
      })),
      combatRules: z.object({
        initiativeFormula: z.string(),
        actionsPerTurn: z.number(),
        attackFormula: z.string(),
        defenseFormula: z.string(),
        damageFormula: z.string(),
        conditions: z.array(z.object({
          name: z.string(),
          description: z.string(),
          effects: z.string(),
        })),
      }),
      checkMechanics: z.object({
        baseDice: z.string(),
        modifierCalculation: z.string(),
        difficultyScale: z.record(z.string(), z.number()),
        criticalSuccess: z.number().optional(),
        criticalFailure: z.number().optional(),
      }),
      progression: z.object({
        experienceFormula: z.string(),
        levelUpThresholds: z.array(z.number()),
        attributePointsPerLevel: z.number(),
        skillPointsPerLevel: z.number(),
      }),
    }).describe("The complete rule system"),
  },
  async ({ sessionId, rules }) => {
    const success = rulesTools.setRules(sessionId, rules);
    return {
      content: [{ type: "text", text: success ? "Rules set successfully" : "Failed to set rules" }],
      isError: !success,
    };
  }
);

server.tool(
  "get_rules",
  "Get the current rule system for a session",
  {
    sessionId: z.string().describe("The session ID"),
  },
  async ({ sessionId }) => {
    const rules = rulesTools.getRules(sessionId);
    if (!rules) {
      return {
        content: [{ type: "text", text: "No rules set for this session" }],
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(rules, null, 2) }],
    };
  }
);

server.tool(
  "update_rules",
  "Partially update the rule system",
  {
    sessionId: z.string().describe("The session ID"),
    updates: z.record(z.string(), z.unknown()).describe("Partial rule updates"),
  },
  async ({ sessionId, updates }) => {
    const rules = rulesTools.updateRules(sessionId, updates);
    if (!rules) {
      return {
        content: [{ type: "text", text: "No rules to update" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(rules, null, 2) }],
    };
  }
);

// ============================================================================
// WORLD/LOCATION TOOLS
// ============================================================================

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
  },
  async ({ sessionId, name, description, properties }) => {
    const location = worldTools.createLocation({ sessionId, name, description, properties });
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
  },
  async ({ locationId, name, description, properties }) => {
    const location = worldTools.updateLocation(locationId, { name, description, properties });
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

// ============================================================================
// CHARACTER TOOLS
// ============================================================================

server.tool(
  "create_character",
  "Create a new character (PC or NPC)",
  {
    sessionId: z.string().describe("The session ID"),
    name: z.string().describe("Character name"),
    isPlayer: z.boolean().describe("True for player character, false for NPC"),
    attributes: z.record(z.string(), z.number()).optional().describe("Character attributes"),
    skills: z.record(z.string(), z.number()).optional().describe("Character skills"),
    status: z.object({
      health: z.number().optional(),
      maxHealth: z.number().optional(),
      conditions: z.array(z.string()).optional(),
      experience: z.number().optional(),
      level: z.number().optional(),
    }).optional().describe("Initial status"),
    locationId: z.string().optional().describe("Starting location"),
    notes: z.string().optional().describe("Character notes"),
    voice: z.object({
      pitch: z.enum(["very_low", "low", "medium", "high", "very_high"]).describe("Voice pitch"),
      speed: z.enum(["very_slow", "slow", "medium", "fast", "very_fast"]).describe("Speaking speed"),
      tone: z.string().describe("Voice tone (e.g., 'gravelly', 'melodic', 'nasal', 'breathy')"),
      accent: z.string().optional().describe("Accent (e.g., 'Scottish', 'French', 'Brooklyn')"),
      quirks: z.array(z.string()).optional().describe("Speech quirks (e.g., 'stutters when nervous')"),
      description: z.string().optional().describe("Free-form voice description for more nuance"),
    }).optional().describe("Voice characteristics for TTS/voice mode"),
  },
  async (params) => {
    const character = characterTools.createCharacter(params);
    return {
      content: [{ type: "text", text: JSON.stringify(character, null, 2) }],
    };
  }
);

server.tool(
  "get_character",
  "Get character details",
  {
    characterId: z.string().describe("The character ID"),
  },
  async ({ characterId }) => {
    const character = characterTools.getCharacter(characterId);
    if (!character) {
      return {
        content: [{ type: "text", text: "Character not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(character, null, 2) }],
    };
  }
);

server.tool(
  "update_character",
  "Update character attributes, skills, status, or voice",
  {
    characterId: z.string().describe("The character ID"),
    name: z.string().optional().describe("New name"),
    attributes: z.record(z.string(), z.number()).optional().describe("Attribute updates"),
    skills: z.record(z.string(), z.number()).optional().describe("Skill updates"),
    status: z.record(z.string(), z.unknown()).optional().describe("Status updates"),
    locationId: z.string().optional().describe("New location"),
    notes: z.string().optional().describe("Notes update"),
    voice: z.object({
      pitch: z.enum(["very_low", "low", "medium", "high", "very_high"]).describe("Voice pitch"),
      speed: z.enum(["very_slow", "slow", "medium", "fast", "very_fast"]).describe("Speaking speed"),
      tone: z.string().describe("Voice tone"),
      accent: z.string().optional().describe("Accent"),
      quirks: z.array(z.string()).optional().describe("Speech quirks"),
      description: z.string().optional().describe("Free-form voice description"),
    }).nullable().optional().describe("Voice characteristics (null to remove)"),
  },
  async ({ characterId, ...updates }) => {
    const character = characterTools.updateCharacter(characterId, updates);
    if (!character) {
      return {
        content: [{ type: "text", text: "Character not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(character, null, 2) }],
    };
  }
);

server.tool(
  "list_characters",
  "List characters in a session",
  {
    sessionId: z.string().describe("The session ID"),
    isPlayer: z.boolean().optional().describe("Filter by player/NPC"),
    locationId: z.string().optional().describe("Filter by location"),
  },
  async ({ sessionId, isPlayer, locationId }) => {
    const characters = characterTools.listCharacters(sessionId, { isPlayer, locationId });
    return {
      content: [{ type: "text", text: JSON.stringify(characters, null, 2) }],
    };
  }
);

server.tool(
  "move_character",
  "Move a character to a different location",
  {
    characterId: z.string().describe("The character ID"),
    locationId: z.string().describe("The destination location ID"),
  },
  async ({ characterId, locationId }) => {
    const success = characterTools.moveCharacter(characterId, locationId);
    return {
      content: [{ type: "text", text: success ? "Character moved" : "Failed to move character" }],
      isError: !success,
    };
  }
);

server.tool(
  "apply_damage",
  "Apply damage to a character",
  {
    characterId: z.string().describe("The character ID"),
    amount: z.number().describe("Amount of damage"),
  },
  async ({ characterId, amount }) => {
    const character = characterTools.applyDamage(characterId, amount);
    if (!character) {
      return {
        content: [{ type: "text", text: "Character not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ health: character.status.health, maxHealth: character.status.maxHealth }, null, 2) }],
    };
  }
);

server.tool(
  "heal_character",
  "Heal a character",
  {
    characterId: z.string().describe("The character ID"),
    amount: z.number().describe("Amount to heal"),
  },
  async ({ characterId, amount }) => {
    const character = characterTools.heal(characterId, amount);
    if (!character) {
      return {
        content: [{ type: "text", text: "Character not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ health: character.status.health, maxHealth: character.status.maxHealth }, null, 2) }],
    };
  }
);

server.tool(
  "add_condition",
  "Add a condition to a character",
  {
    characterId: z.string().describe("The character ID"),
    condition: z.string().describe("The condition to add"),
  },
  async ({ characterId, condition }) => {
    const character = characterTools.addCondition(characterId, condition);
    if (!character) {
      return {
        content: [{ type: "text", text: "Character not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(character.status.conditions, null, 2) }],
    };
  }
);

server.tool(
  "remove_condition",
  "Remove a condition from a character",
  {
    characterId: z.string().describe("The character ID"),
    condition: z.string().describe("The condition to remove"),
  },
  async ({ characterId, condition }) => {
    const character = characterTools.removeCondition(characterId, condition);
    if (!character) {
      return {
        content: [{ type: "text", text: "Character not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(character.status.conditions, null, 2) }],
    };
  }
);

// ============================================================================
// DICE & CHECK TOOLS
// ============================================================================

server.tool(
  "roll",
  "Roll dice using standard notation",
  {
    expression: z.string().describe("Dice expression (e.g., '2d6+3', '1d20', '4d6-2')"),
  },
  async ({ expression }) => {
    try {
      const result = diceTools.roll(expression);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: (error as Error).message }],
        isError: true,
      };
    }
  }
);

server.tool(
  "check",
  "Perform a skill or ability check",
  {
    sessionId: z.string().describe("The session ID"),
    characterId: z.string().describe("The character making the check"),
    skill: z.string().optional().describe("Skill to use"),
    attribute: z.string().optional().describe("Attribute to use"),
    difficulty: z.number().describe("Difficulty threshold"),
    bonusModifier: z.number().optional().describe("Additional modifier"),
  },
  async (params) => {
    try {
      const result = diceTools.check(params);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: (error as Error).message }],
        isError: true,
      };
    }
  }
);

server.tool(
  "contest",
  "Opposed check between two characters",
  {
    sessionId: z.string().describe("The session ID"),
    attackerId: z.string().describe("First character ID"),
    defenderId: z.string().describe("Second character ID"),
    attackerSkill: z.string().optional().describe("Skill for first character"),
    defenderSkill: z.string().optional().describe("Skill for second character"),
    attackerAttribute: z.string().optional().describe("Attribute for first character"),
    defenderAttribute: z.string().optional().describe("Attribute for second character"),
  },
  async (params) => {
    try {
      const result = diceTools.contest(params);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: (error as Error).message }],
        isError: true,
      };
    }
  }
);

// ============================================================================
// COMBAT TOOLS
// ============================================================================

server.tool(
  "start_combat",
  "Initialize a combat encounter",
  {
    sessionId: z.string().describe("The session ID"),
    locationId: z.string().describe("Location where combat occurs"),
    participantIds: z.array(z.string()).describe("Character IDs of all combatants"),
  },
  async (params) => {
    const combat = combatTools.startCombat(params);
    return {
      content: [{ type: "text", text: JSON.stringify(combat, null, 2) }],
    };
  }
);

server.tool(
  "get_combat",
  "Get current combat state",
  {
    combatId: z.string().describe("The combat ID"),
  },
  async ({ combatId }) => {
    const combat = combatTools.getCombat(combatId);
    if (!combat) {
      return {
        content: [{ type: "text", text: "Combat not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(combat, null, 2) }],
    };
  }
);

server.tool(
  "get_active_combat",
  "Get the active combat for a session",
  {
    sessionId: z.string().describe("The session ID"),
  },
  async ({ sessionId }) => {
    const combat = combatTools.getActiveCombat(sessionId);
    if (!combat) {
      return {
        content: [{ type: "text", text: "No active combat" }],
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(combat, null, 2) }],
    };
  }
);

server.tool(
  "next_turn",
  "Advance to the next combatant's turn",
  {
    combatId: z.string().describe("The combat ID"),
  },
  async ({ combatId }) => {
    const combat = combatTools.nextTurn(combatId);
    if (!combat) {
      return {
        content: [{ type: "text", text: "Combat not found or ended" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(combat, null, 2) }],
    };
  }
);

server.tool(
  "add_combat_log",
  "Add an entry to the combat log",
  {
    combatId: z.string().describe("The combat ID"),
    entry: z.string().describe("Log entry text"),
  },
  async ({ combatId, entry }) => {
    const success = combatTools.addCombatLog(combatId, entry);
    return {
      content: [{ type: "text", text: success ? "Entry added" : "Combat not found" }],
      isError: !success,
    };
  }
);

server.tool(
  "remove_combatant",
  "Remove a character from combat (defeated, fled, etc.)",
  {
    combatId: z.string().describe("The combat ID"),
    characterId: z.string().describe("The character to remove"),
  },
  async ({ combatId, characterId }) => {
    const combat = combatTools.removeParticipant(combatId, characterId);
    if (!combat) {
      return {
        content: [{ type: "text", text: "Combat not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(combat, null, 2) }],
    };
  }
);

server.tool(
  "end_combat",
  "End a combat encounter",
  {
    combatId: z.string().describe("The combat ID"),
  },
  async ({ combatId }) => {
    const combat = combatTools.endCombat(combatId);
    if (!combat) {
      return {
        content: [{ type: "text", text: "Combat not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(combat, null, 2) }],
    };
  }
);

// ============================================================================
// INVENTORY TOOLS
// ============================================================================

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
  },
  async ({ itemId, name, properties }) => {
    const item = inventoryTools.updateItem(itemId, { name, properties });
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

// ============================================================================
// QUEST TOOLS
// ============================================================================

server.tool(
  "create_quest",
  "Create a new quest",
  {
    sessionId: z.string().describe("The session ID"),
    name: z.string().describe("Quest name"),
    description: z.string().describe("Quest description"),
    objectives: z.array(z.object({
      description: z.string(),
      completed: z.boolean().optional(),
      optional: z.boolean().optional(),
    })).describe("Quest objectives"),
    rewards: z.string().optional().describe("Quest rewards"),
  },
  async (params) => {
    const quest = questTools.createQuest({
      ...params,
      objectives: params.objectives.map((obj) => ({
        description: obj.description,
        completed: obj.completed ?? false,
        optional: obj.optional,
      })),
    });
    return {
      content: [{ type: "text", text: JSON.stringify(quest, null, 2) }],
    };
  }
);

server.tool(
  "get_quest",
  "Get quest details",
  {
    questId: z.string().describe("The quest ID"),
  },
  async ({ questId }) => {
    const quest = questTools.getQuest(questId);
    if (!quest) {
      return {
        content: [{ type: "text", text: "Quest not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(quest, null, 2) }],
    };
  }
);

server.tool(
  "update_quest",
  "Update a quest",
  {
    questId: z.string().describe("The quest ID"),
    name: z.string().optional().describe("New name"),
    description: z.string().optional().describe("New description"),
    status: z.enum(["active", "completed", "failed", "abandoned"]).optional().describe("New status"),
    rewards: z.string().optional().describe("Updated rewards"),
  },
  async ({ questId, ...updates }) => {
    const quest = questTools.updateQuest(questId, updates);
    if (!quest) {
      return {
        content: [{ type: "text", text: "Quest not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(quest, null, 2) }],
    };
  }
);

server.tool(
  "complete_objective",
  "Mark a quest objective as completed",
  {
    questId: z.string().describe("The quest ID"),
    objectiveId: z.string().describe("The objective ID"),
  },
  async ({ questId, objectiveId }) => {
    const quest = questTools.completeObjective(questId, objectiveId);
    if (!quest) {
      return {
        content: [{ type: "text", text: "Quest not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(quest, null, 2) }],
    };
  }
);

server.tool(
  "add_objective",
  "Add a new objective to a quest",
  {
    questId: z.string().describe("The quest ID"),
    description: z.string().describe("Objective description"),
    optional: z.boolean().optional().describe("Is this objective optional?"),
  },
  async ({ questId, description, optional }) => {
    const quest = questTools.addObjective(questId, { description, completed: false, optional });
    if (!quest) {
      return {
        content: [{ type: "text", text: "Quest not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(quest, null, 2) }],
    };
  }
);

server.tool(
  "list_quests",
  "List quests in a session",
  {
    sessionId: z.string().describe("The session ID"),
    status: z.enum(["active", "completed", "failed", "abandoned"]).optional().describe("Filter by status"),
  },
  async ({ sessionId, status }) => {
    const quests = questTools.listQuests(sessionId, status ? { status } : undefined);
    return {
      content: [{ type: "text", text: JSON.stringify(quests, null, 2) }],
    };
  }
);

// ============================================================================
// NARRATIVE TOOLS
// ============================================================================

server.tool(
  "log_event",
  "Log a narrative event",
  {
    sessionId: z.string().describe("The session ID"),
    eventType: z.string().describe("Type of event (e.g., 'dialogue', 'action', 'discovery', 'combat')"),
    content: z.string().describe("Event content/description"),
    metadata: z.record(z.string(), z.unknown()).optional().describe("Additional metadata"),
  },
  async (params) => {
    const event = narrativeTools.logEvent(params);
    return {
      content: [{ type: "text", text: JSON.stringify(event, null, 2) }],
    };
  }
);

server.tool(
  "get_history",
  "Get narrative history",
  {
    sessionId: z.string().describe("The session ID"),
    limit: z.number().optional().describe("Maximum events to return"),
    eventType: z.string().optional().describe("Filter by event type"),
    since: z.string().optional().describe("Only events after this timestamp"),
  },
  async ({ sessionId, limit, eventType, since }) => {
    const events = narrativeTools.getHistory(sessionId, { limit, eventType, since });
    return {
      content: [{ type: "text", text: JSON.stringify(events, null, 2) }],
    };
  }
);

server.tool(
  "get_summary",
  "Get a summary of the narrative so far",
  {
    sessionId: z.string().describe("The session ID"),
  },
  async ({ sessionId }) => {
    const summary = narrativeTools.getSummary(sessionId);
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
    };
  }
);

// ============================================================================
// PLAYER INTERACTION TOOLS
// ============================================================================

server.tool(
  "present_choices",
  "Present choices to the player with multi-select and free-form input support. Returns structured choice data for the DM agent to display.",
  {
    sessionId: z.string().describe("The session ID"),
    prompt: z.string().describe("The question or situation description to present"),
    choices: z.array(z.object({
      id: z.string().describe("Unique identifier for this choice"),
      label: z.string().describe("Short label for the choice (1-5 words)"),
      description: z.string().describe("Fuller description of what this choice means"),
      consequences: z.string().optional().describe("Hint at consequences (optional, for DM reference)"),
    })).min(1).max(6).describe("Available choices (1-6 options)"),
    allowMultiple: z.boolean().optional().describe("Allow selecting multiple choices (default: false)"),
    allowFreeform: z.boolean().optional().describe("Allow player to type a custom response (default: true)"),
    freeformPlaceholder: z.string().optional().describe("Placeholder text for free-form input (default: 'Or describe what you want to do...')"),
    context: z.object({
      locationId: z.string().optional(),
      characterIds: z.array(z.string()).optional(),
      urgency: z.enum(["low", "medium", "high", "critical"]).optional(),
    }).optional().describe("Context for the choice"),
  },
  async ({ sessionId, prompt, choices, allowMultiple, allowFreeform, freeformPlaceholder, context }) => {
    // Log this as a narrative event
    narrativeTools.logEvent({
      sessionId,
      eventType: "choice_presented",
      content: prompt,
      metadata: { choices, allowMultiple, allowFreeform, context },
    });

    // Return structured choice data for the agent to present via its UI
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          type: "player_choice",
          prompt,
          choices,
          allowMultiple: allowMultiple ?? false,
          allowFreeform: allowFreeform ?? true,
          freeformPlaceholder: freeformPlaceholder ?? "Or describe what you want to do...",
          context,
          instruction: "Present these choices to the player. Use AskUserQuestion - players can always select 'Other' to provide free-form input.",
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "record_choice",
  "Record the player's choice after they've selected",
  {
    sessionId: z.string().describe("The session ID"),
    choiceIds: z.array(z.string()).describe("The ID(s) of the choice(s) the player selected"),
    customResponse: z.string().optional().describe("If player chose 'Other', their custom response"),
  },
  async ({ sessionId, choiceIds, customResponse }) => {
    const event = narrativeTools.logEvent({
      sessionId,
      eventType: "choice_made",
      content: customResponse || `Player chose: ${choiceIds.join(", ")}`,
      metadata: { choiceIds, customResponse },
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          recorded: true,
          choiceIds,
          customResponse,
          event,
        }, null, 2),
      }],
    };
  }
);

// ============================================================================
// START SERVER
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Handle cleanup
process.on("SIGINT", () => {
  closeDatabase();
  process.exit(0);
});

process.on("SIGTERM", () => {
  closeDatabase();
  process.exit(0);
});

main().catch((error) => {
  console.error("Server error:", error);
  closeDatabase();
  process.exit(1);
});
