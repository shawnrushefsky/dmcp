import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as characterTools from "../tools/character.js";
import * as worldTools from "../tools/world.js";
import * as inventoryTools from "../tools/inventory.js";
import * as combatTools from "../tools/combat.js";
import * as narrativeTools from "../tools/narrative.js";
import { LIMITS } from "../utils/validation.js";
import { ANNOTATIONS } from "../utils/tool-annotations.js";
import { imageGenSchema, voiceSchema } from "../schemas/index.js";
import type { Character } from "../types/index.js";

export function registerBatchTools(server: McpServer) {
  // ============================================================================
  // BATCH CREATE NPCS - Create multiple NPCs at once
  // ============================================================================
  server.registerTool(
    "batch_create_npcs",
    {
      description:
        "Create multiple NPCs at once. Use this when populating a location with several characters. Returns all created characters.",
      inputSchema: {
        gameId: z.string().describe("The game ID"),
        npcs: z
          .array(
            z.object({
              name: z.string().min(1).max(LIMITS.NAME_MAX).describe("NPC name"),
              attributes: z.record(z.string(), z.number()).optional(),
              skills: z.record(z.string(), z.number()).optional(),
              status: z
                .object({
                  health: z.number().optional(),
                  maxHealth: z.number().optional(),
                  conditions: z.array(z.string()).optional(),
                })
                .optional(),
              locationId: z.string().optional().describe("Starting location"),
              notes: z.string().max(LIMITS.CONTENT_MAX).optional(),
              voice: voiceSchema.optional(),
              imageGen: imageGenSchema.optional(),
            })
          )
          .min(1)
          .max(20)
          .describe("Array of NPCs to create (max 20)"),
      },
      annotations: ANNOTATIONS.CREATE,
    },
    async ({ gameId, npcs }) => {
      const created: Character[] = [];
      const errors: Array<{ name: string; error: string }> = [];

      for (const npc of npcs) {
        try {
          const character = characterTools.createCharacter({
            gameId,
            name: npc.name,
            isPlayer: false,
            attributes: npc.attributes,
            skills: npc.skills,
            status: npc.status,
            locationId: npc.locationId,
            notes: npc.notes,
            voice: npc.voice,
            imageGen: npc.imageGen,
          });
          created.push(character);
        } catch (e) {
          errors.push({ name: npc.name, error: (e as Error).message });
        }
      }

      const result = {
        created,
        errors,
        summary: `Created ${created.length}/${npcs.length} NPCs`,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    }
  );

  // ============================================================================
  // SETUP COMBAT ENCOUNTER - Create NPCs, start combat with all participants
  // ============================================================================
  server.registerTool(
    "setup_combat_encounter",
    {
      description:
        "Complete combat setup in one call: creates enemy NPCs and starts combat with all participants (enemies + players at location). Returns the ready-to-play combat state.",
      inputSchema: {
        gameId: z.string().describe("The game ID"),
        locationId: z.string().describe("Location where combat takes place"),
        enemies: z
          .array(
            z.object({
              name: z.string().min(1).max(LIMITS.NAME_MAX).describe("Enemy name"),
              attributes: z.record(z.string(), z.number()).optional(),
              status: z
                .object({
                  health: z.number().optional(),
                  maxHealth: z.number().optional(),
                })
                .optional(),
            })
          )
          .min(1)
          .max(10)
          .describe("Enemies to create and add to combat"),
        includePlayersAtLocation: z
          .boolean()
          .default(true)
          .describe("Auto-add player characters at this location"),
      },
      annotations: ANNOTATIONS.CREATE,
    },
    async ({ gameId, locationId, enemies, includePlayersAtLocation = true }) => {
      // 1. Create enemy NPCs
      const createdEnemies: Character[] = [];
      for (const enemy of enemies) {
        const character = characterTools.createCharacter({
          gameId,
          name: enemy.name,
          isPlayer: false,
          attributes: enemy.attributes,
          status: enemy.status,
          locationId,
        });
        createdEnemies.push(character);
      }

      // 2. Get players at location if needed
      const participantIds: string[] = [...createdEnemies.map((e) => e.id)];

      if (includePlayersAtLocation) {
        const playersAtLocation = characterTools.listCharacters(gameId, {
          isPlayer: true,
          locationId,
        });
        participantIds.push(...playersAtLocation.map((p) => p.id));
      }

      // 3. Start combat with all participants
      const combat = combatTools.startCombat({
        gameId,
        locationId,
        participantIds,
      });

      // 4. Log the encounter start
      narrativeTools.logEvent({
        gameId,
        eventType: "combat",
        content: `Combat begins! ${createdEnemies.length} enemies attack.`,
        metadata: {
          enemyIds: createdEnemies.map((e) => e.id),
          locationId,
        },
      });

      const result = {
        combat,
        createdEnemies: createdEnemies.map((e) => ({ id: e.id, name: e.name })),
        participantCount: participantIds.length,
        summary: `Combat started with ${participantIds.length} participants. ${createdEnemies.length} enemies created.`,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    }
  );

  // ============================================================================
  // SCENE TRANSITION - Move characters, log event
  // ============================================================================
  server.registerTool(
    "scene_transition",
    {
      description:
        "Complete scene transition in one call: moves specified characters to a new location and logs a narrative event. Perfect for moving between scenes.",
      inputSchema: {
        gameId: z.string().describe("The game ID"),
        characterIds: z
          .array(z.string())
          .min(1)
          .describe("Characters to move to the new scene"),
        destinationId: z.string().describe("Destination location ID"),
        narrativeDescription: z
          .string()
          .max(LIMITS.DESCRIPTION_MAX)
          .describe("Description of the transition for the narrative log"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ gameId, characterIds, destinationId, narrativeDescription }) => {
      // 1. Move all characters
      const moved: Array<{ id: string; name: string }> = [];
      const errors: Array<{ characterId: string; error: string }> = [];

      for (const characterId of characterIds) {
        try {
          const character = characterTools.getCharacter(characterId);
          if (character) {
            characterTools.updateCharacter(characterId, { locationId: destinationId });
            moved.push({ id: characterId, name: character.name });
          } else {
            errors.push({ characterId, error: "Character not found" });
          }
        } catch (e) {
          errors.push({ characterId, error: (e as Error).message });
        }
      }

      // 2. Log the narrative event
      narrativeTools.logEvent({
        gameId,
        eventType: "scene",
        content: narrativeDescription,
        metadata: {
          characterIds: moved.map((m) => m.id),
          locationId: destinationId,
        },
      });

      // 3. Get destination location details
      const destination = worldTools.getLocation(destinationId);

      const result = {
        moved,
        errors,
        destination: destination ? { id: destination.id, name: destination.name } : null,
        summary: `Moved ${moved.length} characters to ${destination?.name || destinationId}`,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    }
  );

  // ============================================================================
  // GET CHARACTER CONTEXT - Character with all related data
  // ============================================================================
  server.registerTool(
    "get_character_context",
    {
      description:
        "Get comprehensive character context in one call: character details, inventory, and current location info. Reduces multiple tool calls to one.",
      inputSchema: {
        characterId: z.string().describe("The character ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ characterId }) => {
      const character = characterTools.getCharacter(characterId);
      if (!character) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  isError: true,
                  errorCode: "CHARACTER_NOT_FOUND",
                  message: `Character '${characterId}' not found`,
                  suggestions: [
                    "Use list_characters to see available characters",
                    "Create a character with create_character",
                  ],
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      // Get inventory
      const inventory = inventoryTools.getInventory(characterId, "character");

      // Get location details if available
      let location = null;
      if (character.locationId) {
        location = worldTools.getLocation(character.locationId);
      }

      const result = {
        character,
        inventory,
        location: location
          ? {
              id: location.id,
              name: location.name,
              description: location.description,
            }
          : null,
        summary: `${character.name} at ${location?.name || "unknown location"} with ${inventory.length} items`,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    }
  );

  // ============================================================================
  // GET LOCATION CONTEXT - Location with all related data
  // ============================================================================
  server.registerTool(
    "get_location_context",
    {
      description:
        "Get comprehensive location context in one call: location details, present characters, and items here. Reduces multiple tool calls to one.",
      inputSchema: {
        locationId: z.string().describe("The location ID"),
        gameId: z.string().describe("The game ID (needed for character lookup)"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ locationId, gameId }) => {
      const location = worldTools.getLocation(locationId);
      if (!location) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  isError: true,
                  errorCode: "LOCATION_NOT_FOUND",
                  message: `Location '${locationId}' not found`,
                  suggestions: [
                    "Use list_locations to see available locations",
                    "Create a location with create_location",
                  ],
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      // Get characters at this location
      const characters = characterTools.listCharacters(gameId, { locationId });

      // Get items at this location
      const items = inventoryTools.getInventory(locationId, "location");

      const result = {
        location,
        characters: characters.map((c) => ({
          id: c.id,
          name: c.name,
          isPlayer: c.isPlayer,
        })),
        items: items.map((i) => ({
          id: i.id,
          name: i.name,
        })),
        summary: `${location.name}: ${characters.length} characters, ${items.length} items`,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    }
  );
}
