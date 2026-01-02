import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as abilityTools from "../tools/ability.js";
import { LIMITS } from "../utils/validation.js";
import { ANNOTATIONS } from "../utils/tool-annotations.js";

export function registerAbilityTools(server: McpServer) {
  server.registerTool(
    "create_ability",
    {
      description: "Create an ability template or character-owned ability",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
        ownerType: z.enum(["template", "character"]).describe("'template' for reusable, 'character' for owned"),
        ownerId: z.string().max(100).optional().describe("Character ID if ownerType is 'character'"),
        name: z.string().min(1).max(LIMITS.NAME_MAX).describe("Ability name"),
        description: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("Ability description"),
        category: z.string().max(100).optional().describe("Category (e.g., 'spell', 'skill', 'power')"),
        cost: z.record(z.number()).optional().describe("Resource costs (e.g., {mana: 10, stamina: 5})"),
        cooldown: z.number().optional().describe("Cooldown in rounds"),
        effects: z.array(z.string().max(LIMITS.DESCRIPTION_MAX)).max(LIMITS.ARRAY_MAX).optional().describe("Effect descriptions"),
        requirements: z.record(z.number()).optional().describe("Requirements (e.g., {level: 5, strength: 10})"),
        tags: z.array(z.string().max(LIMITS.NAME_MAX)).max(LIMITS.ARRAY_MAX).optional().describe("Tags for categorization"),
      },
      annotations: ANNOTATIONS.CREATE,
    },
    async (params) => {
      const ability = abilityTools.createAbility(params);
      return {
        content: [{ type: "text", text: JSON.stringify(ability, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_ability",
    {
      description: "Get an ability by ID",
      inputSchema: {
        abilityId: z.string().max(100).describe("The ability ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ abilityId }) => {
      const ability = abilityTools.getAbility(abilityId);
      if (!ability) {
        return {
          content: [{ type: "text", text: "Ability not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(ability, null, 2) }],
      };
    }
  );

  server.registerTool(
    "update_ability",
    {
      description: "Update an ability's details",
      inputSchema: {
        abilityId: z.string().max(100).describe("The ability ID"),
        name: z.string().max(LIMITS.NAME_MAX).optional().describe("New name"),
        description: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("New description"),
        category: z.string().max(100).nullable().optional().describe("New category"),
        cost: z.record(z.number()).optional().describe("New cost"),
        cooldown: z.number().nullable().optional().describe("New cooldown"),
        effects: z.array(z.string().max(LIMITS.DESCRIPTION_MAX)).max(LIMITS.ARRAY_MAX).optional().describe("New effects"),
        requirements: z.record(z.number()).optional().describe("New requirements"),
        tags: z.array(z.string().max(LIMITS.NAME_MAX)).max(LIMITS.ARRAY_MAX).optional().describe("New tags"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ abilityId, ...updates }) => {
      const ability = abilityTools.updateAbility(abilityId, updates);
      if (!ability) {
        return {
          content: [{ type: "text", text: "Ability not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(ability, null, 2) }],
      };
    }
  );

  server.registerTool(
    "delete_ability",
    {
      description: "Delete an ability",
      inputSchema: {
        abilityId: z.string().max(100).describe("The ability ID"),
      },
      annotations: ANNOTATIONS.DESTRUCTIVE,
    },
    async ({ abilityId }) => {
      const success = abilityTools.deleteAbility(abilityId);
      return {
        content: [{ type: "text", text: success ? "Ability deleted" : "Ability not found" }],
        isError: !success,
      };
    }
  );

  server.registerTool(
    "list_abilities",
    {
      description: "List abilities with optional filters",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
        ownerType: z.enum(["template", "character"]).optional().describe("Filter by owner type"),
        ownerId: z.string().max(100).optional().describe("Filter by owner ID"),
        category: z.string().max(100).optional().describe("Filter by category"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ sessionId, ...filter }) => {
      const abilities = abilityTools.listAbilities(sessionId, filter);
      return {
        content: [{ type: "text", text: JSON.stringify(abilities, null, 2) }],
      };
    }
  );

  server.registerTool(
    "learn_ability",
    {
      description: "Copy a template ability to a character",
      inputSchema: {
        templateId: z.string().max(100).describe("The template ability ID"),
        characterId: z.string().max(100).describe("The character ID to learn the ability"),
      },
      annotations: ANNOTATIONS.CREATE,
    },
    async ({ templateId, characterId }) => {
      const ability = abilityTools.learnAbility(templateId, characterId);
      if (!ability) {
        return {
          content: [{ type: "text", text: "Template not found or is not a template" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(ability, null, 2) }],
      };
    }
  );

  server.registerTool(
    "use_ability",
    {
      description: "Use an ability (checks cooldown, sets new cooldown)",
      inputSchema: {
        abilityId: z.string().max(100).describe("The ability ID"),
        characterId: z.string().max(100).describe("The character using the ability"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ abilityId, characterId }) => {
      const result = abilityTools.useAbility(abilityId, characterId);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        isError: !result.success,
      };
    }
  );

  server.registerTool(
    "tick_ability_cooldowns",
    {
      description: "Reduce all ability cooldowns (call at end of round)",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
        amount: z.number().optional().describe("Rounds to tick (default: 1)"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ sessionId, amount }) => {
      const updated = abilityTools.tickCooldowns(sessionId, amount);
      return {
        content: [{ type: "text", text: JSON.stringify({ updatedCount: updated.length, abilities: updated }, null, 2) }],
      };
    }
  );

  server.registerTool(
    "check_ability_requirements",
    {
      description: "Check if a character meets an ability's requirements",
      inputSchema: {
        abilityId: z.string().max(100).describe("The ability ID"),
        characterId: z.string().max(100).describe("The character ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ abilityId, characterId }) => {
      const result = abilityTools.checkRequirements(abilityId, characterId);
      if (!result) {
        return {
          content: [{ type: "text", text: "Ability or character not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
