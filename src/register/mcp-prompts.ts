import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as sessionTools from "../tools/session.js";
import * as characterTools from "../tools/character.js";
import * as narrativeTools from "../tools/narrative.js";
import * as pauseTools from "../tools/pause.js";

export function registerMcpPrompts(server: McpServer) {
  // ============================================================================
  // DM PERSONA - Initialize the DM with full game context
  // ============================================================================

  server.registerPrompt(
    "dm-persona",
    {
      description: "Initialize DM persona with full game context and preferences",
      argsSchema: {
        sessionId: z.string().describe("The session ID to load context from"),
      },
    },
    async ({ sessionId }) => {
      const session = sessionTools.loadSession(sessionId);
      if (!session) {
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Error: Session ${sessionId} not found.`,
              },
            },
          ],
        };
      }

      const state = sessionTools.getSessionState(sessionId);
      const preferences = session.preferences;

      let promptText = `You are the Dungeon Master for "${session.name}", a ${session.style} ${session.setting} game.\n\n`;

      if (preferences) {
        promptText += `## Player Preferences\n`;
        promptText += `- **Tone**: ${preferences.tone?.value || "Not specified"}\n`;
        promptText += `- **Complexity**: ${preferences.complexity?.value || "Not specified"}\n`;
        promptText += `- **Combat Frequency**: ${preferences.combatFrequency?.value || "Not specified"}\n`;
        promptText += `- **Lethality**: ${preferences.lethality?.value || "Not specified"}\n`;
        promptText += `- **Narrative Style**: ${preferences.narrativeStyle?.value || "Not specified"}\n`;
        promptText += `- **Player Agency**: ${preferences.playerAgency?.value || "Not specified"}\n`;
        promptText += `- **NPC Depth**: ${preferences.npcDepth?.value || "Not specified"}\n`;
        promptText += `- **Romance Content**: ${preferences.romanceContent?.value || "Not specified"}\n`;

        if (preferences.contentToAvoid?.length) {
          promptText += `\n### Content to AVOID\n`;
          preferences.contentToAvoid.forEach((item: string) => {
            promptText += `- ${item}\n`;
          });
        }

        if (preferences.contentToInclude?.length) {
          promptText += `\n### Content to INCLUDE\n`;
          preferences.contentToInclude.forEach((item: string) => {
            promptText += `- ${item}\n`;
          });
        }

        if (preferences.inspirations?.length) {
          promptText += `\n### Inspirations\n`;
          promptText += preferences.inspirations.join(", ") + "\n";
        }
      }

      if (state) {
        promptText += `\n## Current State\n`;
        promptText += `- Characters: ${state.characterCount}\n`;
        promptText += `- Locations: ${state.locationCount}\n`;
        promptText += `- Active Quests: ${state.activeQuests}\n`;
        promptText += `- Combat Active: ${state.activeCombat ? "Yes" : "No"}\n`;
      }

      promptText += `\n## DM Guidelines\n`;
      promptText += `1. Stay consistent with the established tone and setting\n`;
      promptText += `2. Honor player preferences and avoid restricted content\n`;
      promptText += `3. Use the DMCP tools to track all game state changes\n`;
      promptText += `4. Create immersive descriptions that match the genre\n`;
      promptText += `5. Use ASCII art for maps, character portraits, and scene illustrations when image generation is unavailable\n`;

      return {
        messages: [
          {
            role: "user",
            content: { type: "text", text: promptText },
          },
        ],
      };
    }
  );

  // ============================================================================
  // SESSION RECAP - Generate a narrative summary
  // ============================================================================

  server.registerPrompt(
    "session-recap",
    {
      description: "Generate a narrative recap of the game so far",
      argsSchema: {
        sessionId: z.string().describe("The session ID"),
      },
    },
    async ({ sessionId }) => {
      const session = sessionTools.loadSession(sessionId);
      if (!session) {
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Error: Session ${sessionId} not found.`,
              },
            },
          ],
        };
      }

      const summary = narrativeTools.getSummary(sessionId);

      let promptText = `# Session Recap: ${session.name}\n\n`;
      promptText += `**Setting**: ${session.setting}\n`;
      promptText += `**Style**: ${session.style}\n\n`;

      promptText += `## Statistics\n`;
      promptText += `- Total Events: ${summary.totalEvents}\n`;
      promptText += `- First Event: ${summary.firstEvent || "N/A"}\n`;
      promptText += `- Last Event: ${summary.lastEvent || "N/A"}\n\n`;

      if (Object.keys(summary.eventTypes).length > 0) {
        promptText += `## Event Breakdown\n`;
        for (const [type, count] of Object.entries(summary.eventTypes)) {
          promptText += `- ${type}: ${count}\n`;
        }
        promptText += "\n";
      }

      if (summary.recentEvents.length > 0) {
        promptText += `## Recent Events\n`;
        for (const event of summary.recentEvents) {
          promptText += `**[${event.eventType}]** ${event.content}\n\n`;
        }
      }

      promptText += `---\n\nPlease provide a narrative summary of this session suitable for reminding the player where we left off.`;

      return {
        messages: [
          {
            role: "user",
            content: { type: "text", text: promptText },
          },
        ],
      };
    }
  );

  // ============================================================================
  // NEW GAME SETUP - Interview template for game creation
  // ============================================================================

  server.registerPrompt(
    "new-game-setup",
    {
      description: "Interview template for creating a new game",
      argsSchema: {
        genre: z.string().optional().describe("Optional: Pre-select a genre"),
      },
    },
    async ({ genre }) => {
      let promptText = `# New Game Setup Interview\n\n`;
      promptText += `You are helping a player create their perfect tabletop RPG experience. Guide them through the following questions conversationally.\n\n`;

      promptText += `## Instructions\n`;
      promptText += `- Present questions in a friendly, conversational manner\n`;
      promptText += `- Group related questions together\n`;
      promptText += `- For each question, remind them they can:\n`;
      promptText += `  - Choose from the options provided\n`;
      promptText += `  - Give a custom answer\n`;
      promptText += `  - Say "you decide" to delegate the choice to you\n\n`;

      if (genre) {
        promptText += `The player has indicated interest in: **${genre}**\n\n`;
      }

      promptText += `## Question Categories\n\n`;

      promptText += `### 1. Core Identity\n`;
      promptText += `- Genre (fantasy, sci-fi, horror, etc.)\n`;
      promptText += `- Tone (grimdark, heroic, comedic, etc.)\n`;
      promptText += `- Specific setting details\n\n`;

      promptText += `### 2. Mechanics & Challenge\n`;
      promptText += `- Rules complexity (light, medium, crunchy)\n`;
      promptText += `- Combat frequency and style\n`;
      promptText += `- Lethality level\n\n`;

      promptText += `### 3. Narrative & Story\n`;
      promptText += `- Narrative structure (linear, branching, sandbox)\n`;
      promptText += `- Player agency level\n`;
      promptText += `- NPC depth\n`;
      promptText += `- Romance content handling\n\n`;

      promptText += `### 4. World Building\n`;
      promptText += `- World familiarity\n`;
      promptText += `- Magic/tech prevalence\n`;
      promptText += `- Political complexity\n\n`;

      promptText += `### 5. Session & Pacing\n`;
      promptText += `- Typical session length\n`;
      promptText += `- Pacing preference\n\n`;

      promptText += `### 6. Character\n`;
      promptText += `- Character creation style\n`;
      promptText += `- Starting power level\n\n`;

      promptText += `### 7. Content & Safety\n`;
      promptText += `- Topics to avoid\n`;
      promptText += `- Topics to include\n`;
      promptText += `- Media inspirations\n\n`;

      promptText += `---\n\n`;
      promptText += `After gathering preferences, use:\n`;
      promptText += `1. \`create_session\` to create the game\n`;
      promptText += `2. \`save_game_preferences\` to store their choices\n`;
      promptText += `3. \`set_rules\` to establish the rule system\n`;

      return {
        messages: [
          {
            role: "user",
            content: { type: "text", text: promptText },
          },
        ],
      };
    }
  );

  // ============================================================================
  // CONTINUE GAME - Resume a paused session with full context
  // ============================================================================

  server.registerPrompt(
    "continue-game",
    {
      description: "Resume a paused game with full context restoration",
      argsSchema: {
        sessionId: z.string().describe("The session ID to resume"),
      },
    },
    async ({ sessionId }) => {
      const resumeContext = pauseTools.getResumeContext(sessionId);

      if (!resumeContext) {
        // No pause state - try basic session load
        const session = sessionTools.loadSession(sessionId);
        if (!session) {
          return {
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: `Error: Session ${sessionId} not found.`,
                },
              },
            ],
          };
        }

        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `# Resuming: ${session.name}\n\nNo pause state was saved for this session. Use \`get_session_state\` and \`get_history\` to understand the current game state before continuing.`,
              },
            },
          ],
        };
      }

      let promptText = `# Resuming Game: ${resumeContext.gameState.session.name}\n\n`;

      // Pause state context
      const ps = resumeContext.pauseState;
      promptText += `## Where We Left Off\n`;
      promptText += `**Scene**: ${ps.currentScene}\n\n`;
      promptText += `**Immediate Situation**: ${ps.immediateSituation}\n\n`;

      if (ps.awaitingResponseTo) {
        promptText += `**Awaiting Player Response To**: ${ps.awaitingResponseTo}\n\n`;
      }

      if (ps.pendingPlayerAction) {
        promptText += `**Pending Player Action**: ${ps.pendingPlayerAction}\n\n`;
      }

      // DM Plans
      if (ps.dmShortTermPlans || ps.dmLongTermPlans) {
        promptText += `## DM Notes\n`;
        if (ps.dmShortTermPlans) {
          promptText += `**Short-term Plans**: ${ps.dmShortTermPlans}\n`;
        }
        if (ps.dmLongTermPlans) {
          promptText += `**Long-term Plans**: ${ps.dmLongTermPlans}\n`;
        }
        promptText += "\n";
      }

      // Active threads
      if (ps.activeThreads?.length) {
        promptText += `## Active Story Threads\n`;
        for (const thread of ps.activeThreads) {
          promptText += `- **${thread.name}** (${thread.status}, ${thread.urgency} urgency): ${thread.description}\n`;
        }
        promptText += "\n";
      }

      // Player character
      if (resumeContext.gameState.playerCharacter) {
        const pc = resumeContext.gameState.playerCharacter;
        promptText += `## Player Character\n`;
        promptText += `**${pc.name}** - HP: ${pc.status?.health || "?"}/${pc.status?.maxHealth || "?"}\n`;
        if (resumeContext.gameState.currentLocation) {
          promptText += `**Location**: ${resumeContext.gameState.currentLocation.name}\n`;
        }
        promptText += "\n";
      }

      // Warnings
      if (resumeContext.warnings?.length) {
        promptText += `## Warnings\n`;
        for (const warning of resumeContext.warnings) {
          promptText += `- ${warning}\n`;
        }
        promptText += "\n";
      }

      // Recent events
      if (resumeContext.gameState.recentEvents?.length) {
        promptText += `## Recent Events\n`;
        for (const event of resumeContext.gameState.recentEvents.slice(0, 5)) {
          promptText += `- [${event.eventType}] ${event.content}\n`;
        }
        promptText += "\n";
      }

      promptText += `---\n\nResume the game from this point. The player is ready to continue.`;

      return {
        messages: [
          {
            role: "user",
            content: { type: "text", text: promptText },
          },
        ],
      };
    }
  );

  // ============================================================================
  // CHARACTER VOICE - NPC voice prompt for roleplay
  // ============================================================================

  server.registerPrompt(
    "character-voice",
    {
      description: "Get NPC voice characteristics for roleplay",
      argsSchema: {
        characterId: z.string().describe("The character ID"),
      },
    },
    async ({ characterId }) => {
      const character = characterTools.getCharacter(characterId);

      if (!character) {
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Error: Character ${characterId} not found.`,
              },
            },
          ],
        };
      }

      let promptText = `# Voice Profile: ${character.name}\n\n`;

      if (character.voice) {
        const v = character.voice;
        promptText += `## Voice Characteristics\n`;
        promptText += `- **Pitch**: ${v.pitch}\n`;
        promptText += `- **Speed**: ${v.speed}\n`;
        promptText += `- **Tone**: ${v.tone}\n`;

        if (v.accent) {
          promptText += `- **Accent**: ${v.accent}\n`;
        }

        if (v.quirks?.length) {
          promptText += `\n## Speech Quirks\n`;
          for (const quirk of v.quirks) {
            promptText += `- ${quirk}\n`;
          }
        }

        if (v.description) {
          promptText += `\n## Additional Notes\n${v.description}\n`;
        }
      } else {
        promptText += `No voice profile defined for this character.\n\n`;
        promptText += `Consider these defaults based on the character:\n`;
        promptText += `- Name: ${character.name}\n`;
        promptText += `- Player Character: ${character.isPlayer ? "Yes" : "No"}\n`;
        if (character.notes) {
          promptText += `- Notes: ${character.notes}\n`;
        }
      }

      promptText += `\n---\n\nWhen voicing ${character.name}, embody these characteristics in dialogue and narration.`;

      return {
        messages: [
          {
            role: "user",
            content: { type: "text", text: promptText },
          },
        ],
      };
    }
  );
}
