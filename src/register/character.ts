import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as characterTools from "../tools/character.js";
import { imageGenSchema, voiceSchema } from "../schemas/index.js";
import { LIMITS } from "../utils/validation.js";
import { ANNOTATIONS } from "../utils/tool-annotations.js";
import {
  characterOutputSchema,
  characterStatusSchema,
  conditionModifyOutputSchema,
} from "../utils/output-schemas.js";

export function registerCharacterTools(server: McpServer) {
  // ============================================================================
  // CREATE CHARACTER - with annotations and output schema
  // ============================================================================
  server.registerTool(
    "create_character",
    {
      description: "Create a new character (PC or NPC)",
      inputSchema: {
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
      outputSchema: characterOutputSchema,
      annotations: ANNOTATIONS.CREATE,
    },
    async (params) => {
      const character = characterTools.createCharacter(params);
      return {
        content: [{ type: "text", text: JSON.stringify(character, null, 2) }],
        structuredContent: character as unknown as Record<string, unknown>,
      };
    }
  );

  // ============================================================================
  // GET CHARACTER - read-only with output schema
  // ============================================================================
  server.registerTool(
    "get_character",
    {
      description: "Get character details",
      inputSchema: {
        characterId: z.string().describe("The character ID"),
      },
      outputSchema: characterOutputSchema,
      annotations: ANNOTATIONS.READ_ONLY,
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
        structuredContent: character as unknown as Record<string, unknown>,
      };
    }
  );

  // ============================================================================
  // UPDATE CHARACTER
  // ============================================================================
  server.registerTool(
    "update_character",
    {
      description: "Update character attributes, skills, status, or voice",
      inputSchema: {
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
      outputSchema: characterOutputSchema,
      annotations: ANNOTATIONS.UPDATE,
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
        structuredContent: character as unknown as Record<string, unknown>,
      };
    }
  );

  // ============================================================================
  // LIST CHARACTERS - read-only
  // ============================================================================
  server.registerTool(
    "list_characters",
    {
      description: "List characters in a session",
      inputSchema: {
        sessionId: z.string().describe("The session ID"),
        isPlayer: z.boolean().optional().describe("Filter by player/NPC"),
        locationId: z.string().optional().describe("Filter by location"),
      },
      outputSchema: {
        characters: z.array(z.object({
          id: z.string(),
          name: z.string(),
          isPlayer: z.boolean(),
          status: characterStatusSchema,
          locationId: z.string().nullable(),
        })),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ sessionId, isPlayer, locationId }) => {
      const characters = characterTools.listCharacters(sessionId, { isPlayer, locationId });
      const output = { characters };
      return {
        content: [{ type: "text", text: JSON.stringify(characters, null, 2) }],
        structuredContent: output as unknown as Record<string, unknown>,
      };
    }
  );

  // ============================================================================
  // MOVE CHARACTER
  // ============================================================================
  server.registerTool(
    "move_character",
    {
      description: "Move a character to a different location",
      inputSchema: {
        characterId: z.string().describe("The character ID"),
        locationId: z.string().describe("The destination location ID"),
      },
      outputSchema: {
        success: z.boolean(),
        characterId: z.string(),
        newLocationId: z.string(),
        tip: z.string().optional(),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ characterId, locationId }) => {
      const success = characterTools.moveCharacter(characterId, locationId);
      if (!success) {
        return {
          content: [{ type: "text", text: "Failed to move character" }],
          isError: true,
        };
      }
      const output = {
        success: true,
        characterId,
        newLocationId: locationId,
        tip: "Consider using render_map to show the player their new position, or describe the new location with ASCII art for atmosphere.",
      };
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output as unknown as Record<string, unknown>,
      };
    }
  );

  // ============================================================================
  // APPLY DAMAGE
  // ============================================================================
  server.registerTool(
    "apply_damage",
    {
      description: "Apply damage to a character",
      inputSchema: {
        characterId: z.string().describe("The character ID"),
        amount: z.number().describe("Amount of damage"),
      },
      outputSchema: {
        health: z.number(),
        maxHealth: z.number(),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ characterId, amount }) => {
      const character = characterTools.applyDamage(characterId, amount);
      if (!character) {
        return {
          content: [{ type: "text", text: "Character not found" }],
          isError: true,
        };
      }
      const output = { health: character.status.health, maxHealth: character.status.maxHealth };
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output as unknown as Record<string, unknown>,
      };
    }
  );

  // ============================================================================
  // HEAL CHARACTER
  // ============================================================================
  server.registerTool(
    "heal_character",
    {
      description: "Heal a character",
      inputSchema: {
        characterId: z.string().describe("The character ID"),
        amount: z.number().describe("Amount to heal"),
      },
      outputSchema: {
        health: z.number(),
        maxHealth: z.number(),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ characterId, amount }) => {
      const character = characterTools.heal(characterId, amount);
      if (!character) {
        return {
          content: [{ type: "text", text: "Character not found" }],
          isError: true,
        };
      }
      const output = { health: character.status.health, maxHealth: character.status.maxHealth };
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output as unknown as Record<string, unknown>,
      };
    }
  );

  // ============================================================================
  // MODIFY CONDITIONS - CONSOLIDATED (replaces add_condition + remove_condition)
  // ============================================================================
  server.registerTool(
    "modify_conditions",
    {
      description: "Add and/or remove conditions from a character in a single call. More efficient than separate add/remove calls.",
      inputSchema: {
        characterId: z.string().describe("The character ID"),
        add: z.array(z.string().max(100)).max(LIMITS.ARRAY_MAX).optional().describe("Conditions to add"),
        remove: z.array(z.string().max(100)).max(LIMITS.ARRAY_MAX).optional().describe("Conditions to remove"),
      },
      outputSchema: conditionModifyOutputSchema,
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ characterId, add, remove }) => {
      if (!add?.length && !remove?.length) {
        return {
          content: [{ type: "text", text: "No conditions to add or remove" }],
          isError: true,
        };
      }

      const result = characterTools.modifyConditions(characterId, { add, remove });
      if (!result) {
        return {
          content: [{ type: "text", text: "Character not found" }],
          isError: true,
        };
      }

      const output = {
        characterId: result.character.id,
        characterName: result.character.name,
        conditions: result.character.status.conditions,
        action: result.added.length > 0 && result.removed.length > 0
          ? "modified" as const
          : result.added.length > 0
          ? "added" as const
          : "removed" as const,
        added: result.added,
        removed: result.removed,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output as unknown as Record<string, unknown>,
      };
    }
  );

  // ============================================================================
  // LEGACY: ADD CONDITION (kept for backwards compatibility)
  // ============================================================================
  server.registerTool(
    "add_condition",
    {
      description: "Add a condition to a character. Consider using modify_conditions for batch operations.",
      inputSchema: {
        characterId: z.string().describe("The character ID"),
        condition: z.string().describe("The condition to add"),
      },
      outputSchema: {
        conditions: z.array(z.string()),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ characterId, condition }) => {
      const character = characterTools.addCondition(characterId, condition);
      if (!character) {
        return {
          content: [{ type: "text", text: "Character not found" }],
          isError: true,
        };
      }
      const output = { conditions: character.status.conditions };
      return {
        content: [{ type: "text", text: JSON.stringify(character.status.conditions, null, 2) }],
        structuredContent: output as unknown as Record<string, unknown>,
      };
    }
  );

  // ============================================================================
  // LEGACY: REMOVE CONDITION (kept for backwards compatibility)
  // ============================================================================
  server.registerTool(
    "remove_condition",
    {
      description: "Remove a condition from a character. Consider using modify_conditions for batch operations.",
      inputSchema: {
        characterId: z.string().describe("The character ID"),
        condition: z.string().describe("The condition to remove"),
      },
      outputSchema: {
        conditions: z.array(z.string()),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ characterId, condition }) => {
      const character = characterTools.removeCondition(characterId, condition);
      if (!character) {
        return {
          content: [{ type: "text", text: "Character not found" }],
          isError: true,
        };
      }
      const output = { conditions: character.status.conditions };
      return {
        content: [{ type: "text", text: JSON.stringify(character.status.conditions, null, 2) }],
        structuredContent: output as unknown as Record<string, unknown>,
      };
    }
  );

  // ============================================================================
  // RENDER CHARACTER SHEET - read-only
  // ============================================================================
  server.registerTool(
    "render_character_sheet",
    {
      description: "Render an ASCII character sheet showing stats, health bar, attributes, skills, inventory, and conditions in a visual format",
      inputSchema: {
        characterId: z.string().describe("The character ID"),
      },
      outputSchema: {
        ascii: z.string(),
        characterId: z.string(),
        name: z.string(),
        locationName: z.string().nullable(),
        inventoryCount: z.number(),
        instruction: z.string(),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ characterId }) => {
      const sheetData = characterTools.renderCharacterSheet(characterId);
      if (!sheetData) {
        return {
          content: [{ type: "text", text: "Character not found" }],
          isError: true,
        };
      }
      const output = {
        ascii: sheetData.ascii,
        characterId: sheetData.character.id,
        name: sheetData.character.name,
        locationName: sheetData.locationName,
        inventoryCount: sheetData.inventory.length,
        instruction: "Display the ASCII character sheet to the player. Use this to give players a visual overview of their character status.",
      };
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output as unknown as Record<string, unknown>,
      };
    }
  );
}
