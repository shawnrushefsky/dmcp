import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as statusTools from "../tools/status.js";
import { LIMITS } from "../utils/validation.js";
import { ANNOTATIONS } from "../utils/tool-annotations.js";

export function registerStatusTools(server: McpServer) {
  server.registerTool(
    "apply_status_effect",
    {
      description: "Apply a status effect to a character (handles stacking automatically)",
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
        targetId: z.string().max(100).describe("Character ID to apply effect to"),
        name: z.string().min(1).max(LIMITS.NAME_MAX).describe("Effect name (e.g., 'Poisoned', 'Blessed', 'Stunned')"),
        description: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("Description of the effect"),
        effectType: z.enum(["buff", "debuff", "neutral"]).optional().describe("Effect category"),
        duration: z.number().optional().describe("Duration in rounds (null for permanent)"),
        stacks: z.number().optional().describe("Initial stack count (default: 1)"),
        maxStacks: z.number().optional().describe("Maximum stacks allowed"),
        effects: z.record(z.number()).optional().describe("Stat modifiers (e.g., {strength: -2, speed: +1})"),
        sourceId: z.string().max(100).optional().describe("ID of the source (character, ability, item)"),
        sourceType: z.string().max(100).optional().describe("Type of the source"),
      },
      annotations: ANNOTATIONS.CREATE,
    },
    async (params) => {
      const effect = statusTools.applyStatusEffect(params);
      return {
        content: [{ type: "text", text: JSON.stringify(effect, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_status_effect",
    {
      description: "Get a status effect by ID",
      inputSchema: {
        effectId: z.string().max(100).describe("The effect ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ effectId }) => {
      const effect = statusTools.getStatusEffect(effectId);
      if (!effect) {
        return {
          content: [{ type: "text", text: "Effect not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(effect, null, 2) }],
      };
    }
  );

  server.registerTool(
    "remove_status_effect",
    {
      description: "Remove a specific status effect",
      inputSchema: {
        effectId: z.string().max(100).describe("The effect ID"),
      },
      annotations: ANNOTATIONS.DESTRUCTIVE,
    },
    async ({ effectId }) => {
      const success = statusTools.removeStatusEffect(effectId);
      return {
        content: [{ type: "text", text: success ? "Effect removed" : "Effect not found" }],
        isError: !success,
      };
    }
  );

  server.registerTool(
    "list_status_effects",
    {
      description: "List all status effects on a character",
      inputSchema: {
        targetId: z.string().max(100).describe("Character ID"),
        effectType: z.enum(["buff", "debuff", "neutral"]).optional().describe("Filter by effect type"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ targetId, effectType }) => {
      const effects = statusTools.listStatusEffects(targetId, effectType ? { effectType } : undefined);
      return {
        content: [{ type: "text", text: JSON.stringify(effects, null, 2) }],
      };
    }
  );

  server.registerTool(
    "tick_status_durations",
    {
      description: "Reduce duration of all status effects (call at end of round). Returns expired and remaining effects.",
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
        amount: z.number().optional().describe("Rounds to tick (default: 1)"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ gameId, amount }) => {
      const result = statusTools.tickDurations(gameId, amount);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    "modify_effect_stacks",
    {
      description: "Add or remove stacks from a status effect",
      inputSchema: {
        effectId: z.string().max(100).describe("The effect ID"),
        delta: z.number().describe("Change in stacks (positive or negative)"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ effectId, delta }) => {
      const effect = statusTools.modifyStacks(effectId, delta);
      if (!effect) {
        return {
          content: [{ type: "text", text: "Effect not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(effect, null, 2) }],
      };
    }
  );

  server.registerTool(
    "clear_status_effects",
    {
      description: "Remove all status effects from a character (or filter by type/name)",
      inputSchema: {
        targetId: z.string().max(100).describe("Character ID"),
        effectType: z.enum(["buff", "debuff", "neutral"]).optional().describe("Only clear this type"),
        name: z.string().max(LIMITS.NAME_MAX).optional().describe("Only clear effects with this name"),
      },
      annotations: ANNOTATIONS.DESTRUCTIVE,
    },
    async ({ targetId, effectType, name }) => {
      const count = statusTools.clearEffects(targetId, { effectType, name });
      return {
        content: [{ type: "text", text: `Cleared ${count} effect(s)` }],
      };
    }
  );

  server.registerTool(
    "get_effective_modifiers",
    {
      description: "Get the total stat modifiers from all status effects on a character",
      inputSchema: {
        targetId: z.string().max(100).describe("Character ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ targetId }) => {
      const modifiers = statusTools.getEffectiveModifiers(targetId);
      return {
        content: [{ type: "text", text: JSON.stringify(modifiers, null, 2) }],
      };
    }
  );
}
