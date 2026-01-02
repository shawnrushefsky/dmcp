import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as combatTools from "../tools/combat.js";
import * as diceTools from "../tools/dice.js";
import { LIMITS } from "../utils/validation.js";
import { ANNOTATIONS } from "../utils/tool-annotations.js";

export function registerCombatTools(server: McpServer) {
  // ============================================================================
  // DICE & CHECK TOOLS
  // ============================================================================

  server.registerTool(
    "roll",
    {
      description: "Roll dice using standard notation",
      inputSchema: {
        expression: z.string().max(100).describe("Dice expression (e.g., '2d6+3', '1d20', '4d6-2')"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
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

  server.registerTool(
    "check",
    {
      description: "Perform a skill or ability check",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
        characterId: z.string().max(100).describe("The character making the check"),
        skill: z.string().max(100).optional().describe("Skill to use"),
        attribute: z.string().max(100).optional().describe("Attribute to use"),
        difficulty: z.number().describe("Difficulty threshold"),
        bonusModifier: z.number().optional().describe("Additional modifier"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
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

  server.registerTool(
    "contest",
    {
      description: "Opposed check between two characters",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
        attackerId: z.string().max(100).describe("First character ID"),
        defenderId: z.string().max(100).describe("Second character ID"),
        attackerSkill: z.string().max(100).optional().describe("Skill for first character"),
        defenderSkill: z.string().max(100).optional().describe("Skill for second character"),
        attackerAttribute: z.string().max(100).optional().describe("Attribute for first character"),
        defenderAttribute: z.string().max(100).optional().describe("Attribute for second character"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
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

  server.registerTool(
    "start_combat",
    {
      description: "Initialize a combat encounter",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
        locationId: z.string().max(100).describe("Location where combat occurs"),
        participantIds: z.array(z.string().max(100)).max(LIMITS.ARRAY_MAX).describe("Character IDs of all combatants"),
      },
      annotations: ANNOTATIONS.CREATE,
    },
    async (params) => {
      const combat = combatTools.startCombat(params);
      return {
        content: [{ type: "text", text: JSON.stringify(combat, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_combat",
    {
      description: "Get current combat state",
      inputSchema: {
        combatId: z.string().max(100).describe("The combat ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
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

  server.registerTool(
    "get_active_combat",
    {
      description: "Get the active combat for a session",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
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

  server.registerTool(
    "next_turn",
    {
      description: "Advance to the next combatant's turn",
      inputSchema: {
        combatId: z.string().max(100).describe("The combat ID"),
      },
      annotations: ANNOTATIONS.UPDATE,
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

  server.registerTool(
    "add_combat_log",
    {
      description: "Add an entry to the combat log",
      inputSchema: {
        combatId: z.string().max(100).describe("The combat ID"),
        entry: z.string().max(LIMITS.DESCRIPTION_MAX).describe("Log entry text"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ combatId, entry }) => {
      const success = combatTools.addCombatLog(combatId, entry);
      return {
        content: [{ type: "text", text: success ? "Entry added" : "Combat not found" }],
        isError: !success,
      };
    }
  );

  server.registerTool(
    "remove_combatant",
    {
      description: "Remove a character from combat (defeated, fled, etc.)",
      inputSchema: {
        combatId: z.string().max(100).describe("The combat ID"),
        characterId: z.string().max(100).describe("The character to remove"),
      },
      annotations: ANNOTATIONS.DESTRUCTIVE,
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

  server.registerTool(
    "end_combat",
    {
      description: "End a combat encounter",
      inputSchema: {
        combatId: z.string().max(100).describe("The combat ID"),
      },
      annotations: ANNOTATIONS.UPDATE,
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
