import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as characterTools from "../tools/character.js";
import { imageGenSchema, voiceSchema } from "../schemas/index.js";
import { LIMITS } from "../utils/validation.js";

export function registerCharacterTools(server: McpServer) {
  server.tool(
    "create_character",
    "Create a new character (PC or NPC)",
    {
      sessionId: z.string().max(100).describe("The session ID"),
      name: z.string().min(1).max(LIMITS.NAME_MAX).describe("Character name"),
      isPlayer: z.boolean().describe("True for player character, false for NPC"),
      attributes: z.record(z.string().max(50), z.number()).optional().describe("Character attributes"),
      skills: z.record(z.string().max(50), z.number()).optional().describe("Character skills"),
      status: z.object({
        health: z.number().optional(),
        maxHealth: z.number().optional(),
        conditions: z.array(z.string().max(100)).max(LIMITS.ARRAY_MAX).optional(),
        experience: z.number().optional(),
        level: z.number().optional(),
      }).optional().describe("Initial status"),
      locationId: z.string().max(100).optional().describe("Starting location"),
      notes: z.string().max(LIMITS.CONTENT_MAX).optional().describe("Character notes"),
      voice: voiceSchema.optional().describe("Voice characteristics for TTS/voice mode"),
      imageGen: imageGenSchema.optional().describe("Image generation metadata for character portraits"),
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
      voice: voiceSchema.nullable().optional().describe("Voice characteristics (null to remove)"),
      imageGen: imageGenSchema.nullable().optional().describe("Image generation metadata (null to remove)"),
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
      if (!success) {
        return {
          content: [{ type: "text", text: "Failed to move character" }],
          isError: true,
        };
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            characterId,
            newLocationId: locationId,
            tip: "Consider using render_map to show the player their new position, or describe the new location with ASCII art for atmosphere.",
          }, null, 2),
        }],
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

  server.tool(
    "render_character_sheet",
    "Render an ASCII character sheet showing stats, health bar, attributes, skills, inventory, and conditions in a visual format",
    {
      characterId: z.string().describe("The character ID"),
    },
    async ({ characterId }) => {
      const sheetData = characterTools.renderCharacterSheet(characterId);
      if (!sheetData) {
        return {
          content: [{ type: "text", text: "Character not found" }],
          isError: true,
        };
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ascii: sheetData.ascii,
            characterId: sheetData.character.id,
            name: sheetData.character.name,
            locationName: sheetData.locationName,
            inventoryCount: sheetData.inventory.length,
            instruction: "Display the ASCII character sheet to the player. Use this to give players a visual overview of their character status.",
          }, null, 2),
        }],
      };
    }
  );
}
