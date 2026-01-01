import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as combatTools from "../tools/combat.js";
import * as diceTools from "../tools/dice.js";
import { LIMITS } from "../utils/validation.js";

export function registerCombatTools(server: McpServer) {
  // ============================================================================
  // DICE & CHECK TOOLS
  // ============================================================================

  server.tool(
    "roll",
    "Roll dice using standard notation",
    {
      expression: z.string().max(100).describe("Dice expression (e.g., '2d6+3', '1d20', '4d6-2')"),
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
      sessionId: z.string().max(100).describe("The session ID"),
      characterId: z.string().max(100).describe("The character making the check"),
      skill: z.string().max(100).optional().describe("Skill to use"),
      attribute: z.string().max(100).optional().describe("Attribute to use"),
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
      sessionId: z.string().max(100).describe("The session ID"),
      attackerId: z.string().max(100).describe("First character ID"),
      defenderId: z.string().max(100).describe("Second character ID"),
      attackerSkill: z.string().max(100).optional().describe("Skill for first character"),
      defenderSkill: z.string().max(100).optional().describe("Skill for second character"),
      attackerAttribute: z.string().max(100).optional().describe("Attribute for first character"),
      defenderAttribute: z.string().max(100).optional().describe("Attribute for second character"),
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
      sessionId: z.string().max(100).describe("The session ID"),
      locationId: z.string().max(100).describe("Location where combat occurs"),
      participantIds: z.array(z.string().max(100)).max(LIMITS.ARRAY_MAX).describe("Character IDs of all combatants"),
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
      combatId: z.string().max(100).describe("The combat ID"),
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
      sessionId: z.string().max(100).describe("The session ID"),
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
      combatId: z.string().max(100).describe("The combat ID"),
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
      combatId: z.string().max(100).describe("The combat ID"),
      entry: z.string().max(LIMITS.DESCRIPTION_MAX).describe("Log entry text"),
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
      combatId: z.string().max(100).describe("The combat ID"),
      characterId: z.string().max(100).describe("The character to remove"),
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
      combatId: z.string().max(100).describe("The combat ID"),
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
}
