import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as pauseTools from "../tools/pause.js";
import { LIMITS } from "../utils/validation.js";
import { ANNOTATIONS } from "../utils/tool-annotations.js";

// Zod schemas for nested types
const NarrativeThreadSchema = z.object({
  name: z.string().max(LIMITS.NAME_MAX).describe("Thread name/label"),
  description: z.string().max(LIMITS.DESCRIPTION_MAX).describe("What this thread is about"),
  status: z
    .enum(["active", "background", "climax", "resolving"])
    .describe("Thread status"),
  urgency: z.enum(["low", "medium", "high", "critical"]).describe("Urgency level"),
  involvedCharacterIds: z.array(z.string().max(100)).max(LIMITS.ARRAY_MAX).optional(),
  involvedLocationIds: z.array(z.string().max(100)).max(LIMITS.ARRAY_MAX).optional(),
  relatedQuestId: z.string().max(100).optional(),
  notes: z.string().max(LIMITS.DESCRIPTION_MAX).optional(),
});

const ActiveConversationSchema = z.object({
  npcId: z.string().max(100).describe("Character ID of NPC"),
  topic: z.string().max(LIMITS.NAME_MAX).describe("What's being discussed"),
  npcEmotionalState: z.string().max(LIMITS.NAME_MAX).describe("How they're feeling"),
  lastNpcStatement: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("What they just said"),
  playerIntent: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("What player seems to want"),
});

export function registerPauseTools(server: McpServer) {
  // ============================================================================
  // PAUSE PREPARATION
  // ============================================================================

  server.registerTool(
    "prepare_pause",
    {
      description: `Prepare to pause the game. Returns a checklist of context to save and current game state.

WHEN TO CALL: Before ending a game or when the player says they need to stop.

This tool returns:
- Current game state summary
- Checklist of ephemeral context that should be saved
- Any existing pause state
- Instructions for what to save

After calling this, use save_pause_state to persist your context.`,
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ gameId }) => {
      const checklist = pauseTools.preparePause(gameId);
      if (!checklist) {
        return {
          content: [{ type: "text", text: `Game ${gameId} not found` }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(checklist, null, 2) }],
      };
    }
  );

  // ============================================================================
  // SAVE PAUSE STATE
  // ============================================================================

  server.registerTool(
    "save_pause_state",
    {
      description: `Save your context for seamless game resumption. Call this before ending a game.

REQUIRED FIELDS:
- currentScene: Where we are in the story
- immediateSituation: What's happening RIGHT NOW (be specific!)

The more detail you provide, the smoother the resume will be for the next DM
(which might be you in a new context window, or a different model entirely).

Write as if briefing a replacement DM who's taking over mid-game.`,
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),

        // Required
        currentScene: z
          .string()
          .max(LIMITS.CONTENT_MAX)
          .describe(
            "Description of where we are in the story - the scene, location, narrative moment"
          ),
        immediateSituation: z
          .string()
          .max(LIMITS.CONTENT_MAX)
          .describe(
            "What is happening RIGHT NOW - the exact moment we're pausing at. Be specific!"
          ),

        // Scene context
        sceneAtmosphere: z
          .string()
          .max(LIMITS.DESCRIPTION_MAX)
          .optional()
          .describe("Mood, lighting, sounds, emotional tension"),
        recentTone: z
          .string()
          .max(LIMITS.NAME_MAX)
          .optional()
          .describe("Recent narrative tone (tense, comedic, romantic, etc.)"),

        // Player interaction
        pendingPlayerAction: z
          .string()
          .max(LIMITS.DESCRIPTION_MAX)
          .optional()
          .describe("What action was the player about to take?"),
        awaitingResponseTo: z
          .string()
          .max(LIMITS.DESCRIPTION_MAX)
          .optional()
          .describe("What question/prompt awaits player response?"),
        presentedChoices: z
          .array(z.string().max(LIMITS.DESCRIPTION_MAX))
          .max(LIMITS.ARRAY_MAX)
          .optional()
          .describe("Formal choices presented to player"),

        // Player context
        playerApparentGoals: z
          .string()
          .max(LIMITS.DESCRIPTION_MAX)
          .optional()
          .describe("What the player seems to be trying to accomplish"),
        unresolvedHooks: z
          .array(z.string().max(LIMITS.DESCRIPTION_MAX))
          .max(LIMITS.ARRAY_MAX)
          .optional()
          .describe("Plot hooks player noticed but hasn't pursued"),

        // Narrative threads
        activeThreads: z
          .array(NarrativeThreadSchema)
          .max(LIMITS.ARRAY_MAX)
          .optional()
          .describe("Ongoing storylines, investigations, subplots"),

        // DM notes
        dmShortTermPlans: z
          .string()
          .max(LIMITS.CONTENT_MAX)
          .optional()
          .describe("What was about to happen next? Planned encounters/reveals?"),
        dmLongTermPlans: z
          .string()
          .max(LIMITS.CONTENT_MAX)
          .optional()
          .describe("Major plot arcs being developed"),
        upcomingReveals: z
          .array(z.string().max(LIMITS.DESCRIPTION_MAX))
          .max(LIMITS.ARRAY_MAX)
          .optional()
          .describe("Secrets close to being discovered"),

        // NPC state
        npcAttitudes: z
          .record(z.string(), z.string().max(LIMITS.NAME_MAX))
          .optional()
          .describe("NPC emotional states/attitudes (characterId -> disposition)"),
        activeConversations: z
          .array(ActiveConversationSchema)
          .max(LIMITS.ARRAY_MAX)
          .optional()
          .describe("Ongoing conversations and where they left off"),

        // Metadata
        pauseReason: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("Why is the game pausing?"),
        modelUsed: z
          .string()
          .max(LIMITS.NAME_MAX)
          .optional()
          .describe("Which model/agent is saving this state"),
      },
      annotations: ANNOTATIONS.CREATE,
    },
    async (params) => {
      const pauseState = pauseTools.savePauseState(params);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                saved: true,
                pauseStateId: pauseState.id,
                message:
                  "Context saved successfully. Game can be resumed seamlessly using get_resume_context.",
                savedFields: {
                  required: {
                    currentScene: true,
                    immediateSituation: true,
                  },
                  optional: {
                    sceneAtmosphere: !!pauseState.sceneAtmosphere,
                    pendingPlayerAction: !!pauseState.pendingPlayerAction,
                    awaitingResponseTo: !!pauseState.awaitingResponseTo,
                    presentedChoices: (pauseState.presentedChoices?.length || 0) > 0,
                    activeThreads: pauseState.activeThreads.length > 0,
                    dmShortTermPlans: !!pauseState.dmShortTermPlans,
                    dmLongTermPlans: !!pauseState.dmLongTermPlans,
                    upcomingReveals: pauseState.upcomingReveals.length > 0,
                    npcAttitudes: Object.keys(pauseState.npcAttitudes).length > 0,
                    activeConversations: pauseState.activeConversations.length > 0,
                    recentTone: !!pauseState.recentTone,
                    playerApparentGoals: !!pauseState.playerApparentGoals,
                    unresolvedHooks: pauseState.unresolvedHooks.length > 0,
                  },
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ============================================================================
  // GET PAUSE STATE
  // ============================================================================

  server.registerTool(
    "get_pause_state",
    {
      description: "Get the saved pause state for a game (if any). Use this to check what context was preserved.",
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ gameId }) => {
      const pauseState = pauseTools.getPauseState(gameId);
      if (!pauseState) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                hasPauseState: false,
                message:
                  "No pause state saved for this game. If resuming, rely on narrative_events and game state.",
              }),
            },
          ],
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(pauseState, null, 2) }],
      };
    }
  );

  // ============================================================================
  // GET RESUME CONTEXT
  // ============================================================================

  server.registerTool(
    "get_resume_context",
    {
      description: `Get everything needed to resume a paused game seamlessly.

WHEN TO CALL: At the start of a game when continuing a paused game.

Returns:
- Full pause state (DM context, scene, plans)
- Current game state (characters, quests, location)
- Recent narrative events
- A ready-to-use resume briefing/prompt
- Warnings about things that need attention (active combat, etc.)

Use this to get up to speed quickly and resume exactly where the game left off.`,
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ gameId }) => {
      const context = pauseTools.getResumeContext(gameId);
      if (!context) {
        return {
          content: [
            {
              type: "text",
              text: `No pause state found for game ${gameId}. Use load_game and get_history instead.`,
            },
          ],
          isError: true,
        };
      }

      // Return the formatted resume prompt prominently
      return {
        content: [
          {
            type: "text",
            text:
              context.resumePrompt +
              "\n\n" +
              "═══════════════════════════════════════════════════════════════════════════════\n" +
              "                              FULL DATA (JSON)\n" +
              "═══════════════════════════════════════════════════════════════════════════════\n\n" +
              JSON.stringify(
                {
                  pauseState: context.pauseState,
                  gameState: context.gameState,
                  warnings: context.warnings,
                },
                null,
                2
              ),
          },
        ],
      };
    }
  );

  // ============================================================================
  // CONTEXT SNAPSHOT (Lightweight incremental save)
  // ============================================================================

  server.registerTool(
    "save_context_snapshot",
    {
      description: `Quick lightweight context save - use this DURING play to preserve context incrementally.

CRITICAL: Call this regularly to prevent context loss:
- After EVERY significant story beat
- After important NPC interactions
- When player makes major decisions
- Every 10-15 turns as a safety net
- Before any potentially long narrative sequence

This is faster than full save_pause_state but captures essential state.
For end-of-session, use prepare_pause + save_pause_state instead.`,
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
        situation: z
          .string()
          .max(LIMITS.DESCRIPTION_MAX)
          .describe(
            "Brief description of current situation (what's happening right now)"
          ),
        notes: z.string().max(LIMITS.CONTENT_MAX).optional().describe("Any additional context to preserve"),
        npcMood: z
          .record(z.string(), z.string().max(LIMITS.NAME_MAX))
          .optional()
          .describe("Current NPC attitudes (characterId -> mood)"),
        playerIntent: z
          .string()
          .max(LIMITS.DESCRIPTION_MAX)
          .optional()
          .describe("What the player seems to be trying to do"),
      },
      annotations: ANNOTATIONS.CREATE,
    },
    async (params) => {
      const result = pauseTools.saveContextSnapshot(params);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // ============================================================================
  // CHECK CONTEXT FRESHNESS
  // ============================================================================

  server.registerTool(
    "check_context_freshness",
    {
      description: `Check if context needs to be saved. Returns a reminder if it's been too long since last save.

IMPORTANT: Call this every 5-10 narrative turns to ensure context is being preserved. If stale, immediately call save_context_snapshot.`,
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ gameId }) => {
      const result = pauseTools.checkContextFreshness(gameId);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // ============================================================================
  // CLEAR PAUSE STATE
  // ============================================================================

  server.registerTool(
    "clear_pause_state",
    {
      description: "Clear the saved pause state for a game. Use after successfully resuming to start fresh.",
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
      },
      annotations: ANNOTATIONS.DESTRUCTIVE,
    },
    async ({ gameId }) => {
      const deleted = pauseTools.deletePauseState(gameId);
      return {
        content: [
          {
            type: "text",
            text: deleted
              ? "Pause state cleared. The game can now accumulate fresh context."
              : "No pause state to clear.",
          },
        ],
      };
    }
  );

  // ============================================================================
  // EXTERNAL UPDATES - Multi-agent collaboration
  // ============================================================================

  server.registerTool(
    "push_external_update",
    {
      description: `Push an update from an external agent into the game game.

USE CASE: External agents (research agents, worldbuilders, lore generators, etc.)
can push updates that the primary DM agent will receive and incorporate.

EXAMPLES:
- A research agent discovers detailed lore about a faction
- A worldbuilder generates NPC backstory
- A consistency checker flags a plot hole
- An atmosphere generator provides environmental details

The DM agent should periodically check for pending updates via get_pending_updates.`,
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
        sourceAgent: z.string().max(LIMITS.NAME_MAX).describe("ID/name of the agent pushing this update"),
        sourceDescription: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("Description of what this agent does"),
        updateType: z
          .string()
          .max(100)
          .describe("Type of update (e.g., 'lore', 'npc_backstory', 'world_event', 'item_details', 'plot_suggestion')"),
        category: z.string().max(100).optional().describe("Optional category for organization"),
        title: z.string().max(LIMITS.NAME_MAX).describe("Brief title/summary of the update"),
        content: z.string().max(LIMITS.CONTENT_MAX).describe("The full content/information being pushed"),
        structuredData: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("Optional structured data (JSON) for programmatic use"),
        targetEntityId: z.string().max(100).optional().describe("If this relates to a specific entity, its ID"),
        targetEntityType: z
          .string()
          .max(100)
          .optional()
          .describe("Type of target entity (character, location, item, quest, etc.)"),
        priority: z
          .enum(["low", "normal", "high", "urgent"])
          .optional()
          .describe("Priority level (default: normal). Urgent updates demand immediate DM attention."),
      },
      annotations: ANNOTATIONS.CREATE,
    },
    async (params) => {
      const update = pauseTools.pushExternalUpdate(params);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                pushed: true,
                updateId: update.id,
                priority: update.priority,
                message: `Update pushed successfully. The DM agent will see this when checking pending updates.`,
                tip:
                  update.priority === "urgent"
                    ? "This urgent update will be highlighted for immediate DM attention."
                    : "The DM will see this in their pending updates queue.",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "get_pending_updates",
    {
      description: `Check for pending updates from external agents.

WHEN TO CALL:
- At the start of each scene/turn
- Before making major narrative decisions
- Periodically during long sessions

Returns all pending updates, prioritized by urgency.
Use acknowledge_update, apply_update, or reject_update to process them.`,
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ gameId }) => {
      const result = pauseTools.getPendingUpdates(gameId);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    "acknowledge_update",
    {
      description: "Mark an external update as acknowledged (seen by DM). Use when you've read but haven't yet incorporated an update.",
      inputSchema: {
        updateId: z.string().max(100).describe("The update ID"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ updateId }) => {
      const update = pauseTools.acknowledgeUpdate(updateId);
      if (!update) {
        return {
          content: [{ type: "text", text: "Update not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(update, null, 2) }],
      };
    }
  );

  server.registerTool(
    "apply_update",
    {
      description: "Mark an external update as applied (incorporated into the narrative). Use when you've woven the update into the story.",
      inputSchema: {
        updateId: z.string().max(100).describe("The update ID"),
        dmNotes: z
          .string()
          .max(LIMITS.DESCRIPTION_MAX)
          .optional()
          .describe("Notes on how the update was incorporated"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ updateId, dmNotes }) => {
      const update = pauseTools.applyUpdate(updateId, dmNotes);
      if (!update) {
        return {
          content: [{ type: "text", text: "Update not found" }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                applied: true,
                update,
                message: "Update marked as applied. It will no longer appear in pending updates.",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "reject_update",
    {
      description: "Reject an external update (not appropriate for the narrative). Use when an update doesn't fit the current story direction.",
      inputSchema: {
        updateId: z.string().max(100).describe("The update ID"),
        dmNotes: z
          .string()
          .max(LIMITS.DESCRIPTION_MAX)
          .optional()
          .describe("Reason for rejection (helps external agents improve)"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ updateId, dmNotes }) => {
      const update = pauseTools.rejectUpdate(updateId, dmNotes);
      if (!update) {
        return {
          content: [{ type: "text", text: "Update not found" }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                rejected: true,
                update,
                message: "Update rejected. It will no longer appear in pending updates.",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "list_external_updates",
    {
      description: "List all external updates for a game with optional status filter.",
      inputSchema: {
        gameId: z.string().max(100).describe("The game ID"),
        status: z
          .enum(["pending", "acknowledged", "applied", "rejected"])
          .optional()
          .describe("Filter by status"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ gameId, status }) => {
      const updates = pauseTools.listExternalUpdates(gameId, status);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                count: updates.length,
                status: status || "all",
                updates,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "get_external_update",
    {
      description: "Get details of a specific external update by ID.",
      inputSchema: {
        updateId: z.string().max(100).describe("The update ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ updateId }) => {
      const update = pauseTools.getExternalUpdate(updateId);
      if (!update) {
        return {
          content: [{ type: "text", text: "Update not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(update, null, 2) }],
      };
    }
  );

  server.registerTool(
    "delete_external_update",
    {
      description: "Delete an external update entirely.",
      inputSchema: {
        updateId: z.string().max(100).describe("The update ID"),
      },
      annotations: ANNOTATIONS.DESTRUCTIVE,
    },
    async ({ updateId }) => {
      const deleted = pauseTools.deleteExternalUpdate(updateId);
      return {
        content: [
          {
            type: "text",
            text: deleted ? "Update deleted" : "Update not found",
          },
        ],
        isError: !deleted,
      };
    }
  );
}
