import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as statusTools from "../tools/status.js";

export function registerStatusTools(server: McpServer) {
  server.tool(
    "apply_status_effect",
    "Apply a status effect to a character (handles stacking automatically)",
    {
      sessionId: z.string().describe("The session ID"),
      targetId: z.string().describe("Character ID to apply effect to"),
      name: z.string().describe("Effect name (e.g., 'Poisoned', 'Blessed', 'Stunned')"),
      description: z.string().optional().describe("Description of the effect"),
      effectType: z.enum(["buff", "debuff", "neutral"]).optional().describe("Effect category"),
      duration: z.number().optional().describe("Duration in rounds (null for permanent)"),
      stacks: z.number().optional().describe("Initial stack count (default: 1)"),
      maxStacks: z.number().optional().describe("Maximum stacks allowed"),
      effects: z.record(z.number()).optional().describe("Stat modifiers (e.g., {strength: -2, speed: +1})"),
      sourceId: z.string().optional().describe("ID of the source (character, ability, item)"),
      sourceType: z.string().optional().describe("Type of the source"),
    },
    async (params) => {
      const effect = statusTools.applyStatusEffect(params);
      return {
        content: [{ type: "text", text: JSON.stringify(effect, null, 2) }],
      };
    }
  );

  server.tool(
    "get_status_effect",
    "Get a status effect by ID",
    {
      effectId: z.string().describe("The effect ID"),
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

  server.tool(
    "remove_status_effect",
    "Remove a specific status effect",
    {
      effectId: z.string().describe("The effect ID"),
    },
    async ({ effectId }) => {
      const success = statusTools.removeStatusEffect(effectId);
      return {
        content: [{ type: "text", text: success ? "Effect removed" : "Effect not found" }],
        isError: !success,
      };
    }
  );

  server.tool(
    "list_status_effects",
    "List all status effects on a character",
    {
      targetId: z.string().describe("Character ID"),
      effectType: z.enum(["buff", "debuff", "neutral"]).optional().describe("Filter by effect type"),
    },
    async ({ targetId, effectType }) => {
      const effects = statusTools.listStatusEffects(targetId, effectType ? { effectType } : undefined);
      return {
        content: [{ type: "text", text: JSON.stringify(effects, null, 2) }],
      };
    }
  );

  server.tool(
    "tick_status_durations",
    "Reduce duration of all status effects (call at end of round). Returns expired and remaining effects.",
    {
      sessionId: z.string().describe("The session ID"),
      amount: z.number().optional().describe("Rounds to tick (default: 1)"),
    },
    async ({ sessionId, amount }) => {
      const result = statusTools.tickDurations(sessionId, amount);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "modify_effect_stacks",
    "Add or remove stacks from a status effect",
    {
      effectId: z.string().describe("The effect ID"),
      delta: z.number().describe("Change in stacks (positive or negative)"),
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

  server.tool(
    "clear_status_effects",
    "Remove all status effects from a character (or filter by type/name)",
    {
      targetId: z.string().describe("Character ID"),
      effectType: z.enum(["buff", "debuff", "neutral"]).optional().describe("Only clear this type"),
      name: z.string().optional().describe("Only clear effects with this name"),
    },
    async ({ targetId, effectType, name }) => {
      const count = statusTools.clearEffects(targetId, { effectType, name });
      return {
        content: [{ type: "text", text: `Cleared ${count} effect(s)` }],
      };
    }
  );

  server.tool(
    "get_effective_modifiers",
    "Get the total stat modifiers from all status effects on a character",
    {
      targetId: z.string().describe("Character ID"),
    },
    async ({ targetId }) => {
      const modifiers = statusTools.getEffectiveModifiers(targetId);
      return {
        content: [{ type: "text", text: JSON.stringify(modifiers, null, 2) }],
      };
    }
  );
}
