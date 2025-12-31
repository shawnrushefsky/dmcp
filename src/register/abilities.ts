import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as abilityTools from "../tools/ability.js";

export function registerAbilityTools(server: McpServer) {
  server.tool(
    "create_ability",
    "Create an ability template or character-owned ability",
    {
      sessionId: z.string().describe("The session ID"),
      ownerType: z.enum(["template", "character"]).describe("'template' for reusable, 'character' for owned"),
      ownerId: z.string().optional().describe("Character ID if ownerType is 'character'"),
      name: z.string().describe("Ability name"),
      description: z.string().optional().describe("Ability description"),
      category: z.string().optional().describe("Category (e.g., 'spell', 'skill', 'power')"),
      cost: z.record(z.number()).optional().describe("Resource costs (e.g., {mana: 10, stamina: 5})"),
      cooldown: z.number().optional().describe("Cooldown in rounds"),
      effects: z.array(z.string()).optional().describe("Effect descriptions"),
      requirements: z.record(z.number()).optional().describe("Requirements (e.g., {level: 5, strength: 10})"),
      tags: z.array(z.string()).optional().describe("Tags for categorization"),
    },
    async (params) => {
      const ability = abilityTools.createAbility(params);
      return {
        content: [{ type: "text", text: JSON.stringify(ability, null, 2) }],
      };
    }
  );

  server.tool(
    "get_ability",
    "Get an ability by ID",
    {
      abilityId: z.string().describe("The ability ID"),
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

  server.tool(
    "update_ability",
    "Update an ability's details",
    {
      abilityId: z.string().describe("The ability ID"),
      name: z.string().optional().describe("New name"),
      description: z.string().optional().describe("New description"),
      category: z.string().nullable().optional().describe("New category"),
      cost: z.record(z.number()).optional().describe("New cost"),
      cooldown: z.number().nullable().optional().describe("New cooldown"),
      effects: z.array(z.string()).optional().describe("New effects"),
      requirements: z.record(z.number()).optional().describe("New requirements"),
      tags: z.array(z.string()).optional().describe("New tags"),
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

  server.tool(
    "delete_ability",
    "Delete an ability",
    {
      abilityId: z.string().describe("The ability ID"),
    },
    async ({ abilityId }) => {
      const success = abilityTools.deleteAbility(abilityId);
      return {
        content: [{ type: "text", text: success ? "Ability deleted" : "Ability not found" }],
        isError: !success,
      };
    }
  );

  server.tool(
    "list_abilities",
    "List abilities with optional filters",
    {
      sessionId: z.string().describe("The session ID"),
      ownerType: z.enum(["template", "character"]).optional().describe("Filter by owner type"),
      ownerId: z.string().optional().describe("Filter by owner ID"),
      category: z.string().optional().describe("Filter by category"),
    },
    async ({ sessionId, ...filter }) => {
      const abilities = abilityTools.listAbilities(sessionId, filter);
      return {
        content: [{ type: "text", text: JSON.stringify(abilities, null, 2) }],
      };
    }
  );

  server.tool(
    "learn_ability",
    "Copy a template ability to a character",
    {
      templateId: z.string().describe("The template ability ID"),
      characterId: z.string().describe("The character ID to learn the ability"),
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

  server.tool(
    "use_ability",
    "Use an ability (checks cooldown, sets new cooldown)",
    {
      abilityId: z.string().describe("The ability ID"),
      characterId: z.string().describe("The character using the ability"),
    },
    async ({ abilityId, characterId }) => {
      const result = abilityTools.useAbility(abilityId, characterId);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        isError: !result.success,
      };
    }
  );

  server.tool(
    "tick_ability_cooldowns",
    "Reduce all ability cooldowns (call at end of round)",
    {
      sessionId: z.string().describe("The session ID"),
      amount: z.number().optional().describe("Rounds to tick (default: 1)"),
    },
    async ({ sessionId, amount }) => {
      const updated = abilityTools.tickCooldowns(sessionId, amount);
      return {
        content: [{ type: "text", text: JSON.stringify({ updatedCount: updated.length, abilities: updated }, null, 2) }],
      };
    }
  );

  server.tool(
    "check_ability_requirements",
    "Check if a character meets an ability's requirements",
    {
      abilityId: z.string().describe("The ability ID"),
      characterId: z.string().describe("The character ID"),
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
