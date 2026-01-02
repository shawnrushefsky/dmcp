import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as sessionTools from "../tools/session.js";
import * as rulesTools from "../tools/rules.js";
import { LIMITS } from "../utils/validation.js";
import { getSessionUrl, getWebUiBaseUrl } from "../utils/webui.js";
import { ANNOTATIONS } from "../utils/tool-annotations.js";

export function registerCoreTools(server: McpServer) {
  // ============================================================================
  // SESSION TOOLS
  // ============================================================================

  server.tool(
    "get_game_menu",
    "CALL THIS FIRST when player wants to play. Returns existing games (most recent first) or instructs to start new game if none exist.",
    {},
    async () => {
      const menu = sessionTools.getGameMenu();
      const menuWithUrls = {
        ...menu,
        sessions: menu.sessions.map((s) => ({
          ...s,
          webUiUrl: getSessionUrl(s.id),
        })),
        webUi: {
          baseUrl: getWebUiBaseUrl(),
          message: menu.hasExistingGames
            ? `Web UI available at: ${getWebUiBaseUrl()}`
            : `Web UI will be available at: ${getWebUiBaseUrl()}`,
        },
      };
      return {
        content: [{ type: "text", text: JSON.stringify(menuWithUrls, null, 2) }],
      };
    }
  );

  server.tool(
    "create_session",
    "Create a new game session with a setting and style",
    {
      name: z.string().min(1).max(LIMITS.NAME_MAX).describe("Name for this game session"),
      setting: z.string().min(1).max(LIMITS.DESCRIPTION_MAX).describe("The game setting (e.g., 'dark fantasy', 'cyberpunk', 'cosmic horror')"),
      style: z.string().min(1).max(LIMITS.NAME_MAX).describe("The narrative style (e.g., 'gritty', 'heroic', 'survival')"),
    },
    async ({ name, setting, style }) => {
      const session = sessionTools.createSession({ name, setting, style });
      const webUiUrl = getSessionUrl(session.id);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ...session,
            webUi: {
              url: webUiUrl,
              message: `View game at: ${webUiUrl}`,
            },
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "load_session",
    "Load an existing game session by ID",
    {
      sessionId: z.string().max(100).describe("The session ID to load"),
    },
    async ({ sessionId }) => {
      const session = sessionTools.loadSession(sessionId);
      if (!session) {
        return {
          content: [{ type: "text", text: `Session ${sessionId} not found` }],
          isError: true,
        };
      }
      const webUiUrl = getSessionUrl(session.id);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ...session,
            webUi: {
              url: webUiUrl,
              message: `View game at: ${webUiUrl}`,
            },
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "list_sessions",
    "List all saved game sessions",
    {},
    async () => {
      const sessions = sessionTools.listSessions();
      const sessionsWithUrls = sessions.map((s) => ({
        ...s,
        webUiUrl: getSessionUrl(s.id),
      }));
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            sessions: sessionsWithUrls,
            webUi: {
              baseUrl: getWebUiBaseUrl(),
            },
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "get_session_state",
    "Get full current state overview for a session",
    {
      sessionId: z.string().describe("The session ID"),
    },
    async ({ sessionId }) => {
      const state = sessionTools.getSessionState(sessionId);
      if (!state) {
        return {
          content: [{ type: "text", text: `Session ${sessionId} not found` }],
          isError: true,
        };
      }
      const webUiUrl = getSessionUrl(sessionId);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ...state,
            webUi: {
              url: webUiUrl,
              message: `View game at: ${webUiUrl}`,
            },
            tips: {
              visualization: "Use render_map to show the world. If no image generation is available, use ASCII art liberally for character portraits, items, scene illustrations, and combat layouts to enhance immersion.",
              mapRecommendation: state.locationCount > 0 ? "Consider showing a map with render_map" : null,
            },
          }, null, 2),
        }],
      };
    }
  );

  // delete_session - DESTRUCTIVE operation with annotation
  server.registerTool(
    "delete_session",
    {
      description: "Delete a game session and all its data. This is IRREVERSIBLE and removes all characters, locations, quests, and history.",
      inputSchema: {
        sessionId: z.string().describe("The session ID to delete"),
      },
      outputSchema: {
        deleted: z.boolean(),
        sessionId: z.string(),
        message: z.string(),
      },
      annotations: ANNOTATIONS.DESTRUCTIVE,
    },
    async ({ sessionId }) => {
      const success = sessionTools.deleteSession(sessionId);
      const output = {
        deleted: success,
        sessionId,
        message: success ? "Session deleted successfully" : "Session not found",
      };
      return {
        content: [{ type: "text", text: success ? "Session deleted" : "Session not found" }],
        structuredContent: output,
        isError: !success,
      };
    }
  );

  server.tool(
    "update_session",
    "Update a game session's name, setting, or style",
    {
      sessionId: z.string().describe("The session ID to update"),
      name: z.string().min(1).max(LIMITS.NAME_MAX).optional().describe("New name for the session"),
      setting: z.string().min(1).max(LIMITS.DESCRIPTION_MAX).optional().describe("New setting description"),
      style: z.string().min(1).max(LIMITS.NAME_MAX).optional().describe("New narrative style"),
    },
    async ({ sessionId, name, setting, style }) => {
      if (!name && !setting && !style) {
        return {
          content: [{ type: "text", text: "No updates provided" }],
          isError: true,
        };
      }
      const session = sessionTools.updateSession(sessionId, { name, setting, style });
      if (!session) {
        return {
          content: [{ type: "text", text: "Session not found" }],
          isError: true,
        };
      }
      const webUiUrl = getSessionUrl(session.id);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ...session,
            webUi: {
              url: webUiUrl,
              message: `View game at: ${webUiUrl}`,
            },
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "set_session_title_image",
    "Set or remove the title image for a game session",
    {
      sessionId: z.string().describe("The session ID"),
      imageId: z.string().nullable().describe("The image ID to set as title image, or null to remove"),
    },
    async ({ sessionId, imageId }) => {
      const session = sessionTools.setSessionTitleImage(sessionId, imageId);
      if (!session) {
        return {
          content: [{ type: "text", text: "Session not found" }],
          isError: true,
        };
      }
      const webUiUrl = getSessionUrl(session.id);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ...session,
            webUi: {
              url: webUiUrl,
              message: `View game at: ${webUiUrl}`,
            },
          }, null, 2),
        }],
      };
    }
  );

  // ============================================================================
  // GAME SETUP INTERVIEW TOOLS
  // ============================================================================

  server.tool(
    "get_interview_template",
    "Get the full game setup interview template with all questions. Use this to guide players through game creation.",
    {},
    async () => {
      const template = {
        introduction: "Let's create your perfect game experience! For each question, you can choose an option, give a custom answer, or say 'You decide' to let me handle it.",
        categories: [
          {
            name: "Core Identity",
            description: "The fundamental nature of your game",
            questions: [
              {
                id: "genre",
                question: "What genre or type of game appeals to you?",
                description: "This shapes the entire world and story",
                options: [
                  { value: "high-fantasy", label: "High Fantasy", description: "Magic, heroes, epic quests (Lord of the Rings)" },
                  { value: "dark-fantasy", label: "Dark Fantasy", description: "Grim, dangerous, morally grey (Dark Souls, Witcher)" },
                  { value: "sci-fi-space", label: "Space Opera", description: "Galaxy-spanning adventure (Star Wars, Mass Effect)" },
                  { value: "sci-fi-cyber", label: "Cyberpunk", description: "High tech, low life, corporate dystopia" },
                  { value: "horror-cosmic", label: "Cosmic Horror", description: "Unknowable terrors, sanity at stake (Lovecraft)" },
                  { value: "horror-gothic", label: "Gothic Horror", description: "Vampires, curses, dark romance" },
                  { value: "post-apocalyptic", label: "Post-Apocalyptic", description: "Survival after the fall" },
                  { value: "historical", label: "Historical/Alt-History", description: "Real world periods with twists" },
                  { value: "modern-supernatural", label: "Urban Fantasy", description: "Magic hidden in modern world" },
                  { value: "steampunk", label: "Steampunk", description: "Victorian era with fantastical technology" },
                ],
                allowFreeform: true,
                allowDelegate: true,
                delegateLabel: "Surprise me with something interesting",
              },
              {
                id: "tone",
                question: "What tone should the game have?",
                description: "How serious or lighthearted the experience feels",
                options: [
                  { value: "grimdark", label: "Grimdark", description: "Bleak, brutal, hope is scarce" },
                  { value: "gritty", label: "Gritty", description: "Realistic consequences, tough choices" },
                  { value: "balanced", label: "Balanced", description: "Mix of light and dark moments" },
                  { value: "heroic", label: "Heroic", description: "Triumph over evil, inspiring" },
                  { value: "comedic", label: "Comedic", description: "Humor and absurdity welcome" },
                  { value: "whimsical", label: "Whimsical", description: "Lighthearted, magical, wonder-filled" },
                ],
                allowFreeform: true,
                allowDelegate: true,
                delegateLabel: "Match it to the genre",
              },
              {
                id: "setting",
                question: "Any specific setting details you want?",
                description: "Particular world elements, time period, or unique features",
                options: [],
                allowFreeform: true,
                allowDelegate: true,
                delegateLabel: "Build a world that fits the genre and tone",
              },
            ],
          },
          {
            name: "Mechanics & Challenge",
            description: "How the game plays",
            questions: [
              {
                id: "complexity",
                question: "How complex should the rules be?",
                description: "Affects character sheets, combat, and decision-making",
                options: [
                  { value: "rules-light", label: "Rules-Light", description: "Simple, narrative-focused, quick resolution" },
                  { value: "medium", label: "Medium", description: "Some crunch but not overwhelming" },
                  { value: "crunchy", label: "Crunchy", description: "Detailed mechanics, tactical depth" },
                ],
                allowFreeform: false,
                allowDelegate: true,
                delegateLabel: "Whatever fits the genre best",
              },
              {
                id: "combatFrequency",
                question: "How often should combat occur?",
                description: "Balance between fighting and other activities",
                options: [
                  { value: "rare", label: "Rare", description: "Combat is a last resort, mostly avoided" },
                  { value: "occasional", label: "Occasional", description: "Some fights, but not the focus" },
                  { value: "frequent", label: "Frequent", description: "Regular combat encounters" },
                  { value: "constant", label: "Constant", description: "Action-heavy, always in danger" },
                ],
                allowFreeform: false,
                allowDelegate: true,
                delegateLabel: "Balance it naturally",
              },
              {
                id: "combatStyle",
                question: "What combat style do you prefer?",
                description: "How fights play out",
                options: [
                  { value: "tactical", label: "Tactical", description: "Positioning, strategy, detailed actions" },
                  { value: "narrative", label: "Narrative", description: "Descriptive, cinematic, story-driven" },
                  { value: "quick-resolution", label: "Quick Resolution", description: "Fast, decisive, minimal bookkeeping" },
                ],
                allowFreeform: false,
                allowDelegate: true,
                delegateLabel: "Match the complexity level",
              },
              {
                id: "lethality",
                question: "How dangerous should the game be?",
                description: "Risk of character death",
                options: [
                  { value: "safe", label: "Safe", description: "Death only if narratively appropriate" },
                  { value: "dangerous", label: "Dangerous", description: "Bad decisions have consequences" },
                  { value: "brutal", label: "Brutal", description: "Death is always a possibility" },
                  { value: "permadeath", label: "Permadeath", description: "Dead is dead, high stakes" },
                ],
                allowFreeform: false,
                allowDelegate: true,
                delegateLabel: "Match the tone",
              },
            ],
          },
          {
            name: "Narrative & Story",
            description: "How the story unfolds",
            questions: [
              {
                id: "narrativeStyle",
                question: "What narrative structure do you prefer?",
                description: "How the story is organized",
                options: [
                  { value: "linear", label: "Linear", description: "Clear main plot to follow" },
                  { value: "branching", label: "Branching", description: "Major choices create different paths" },
                  { value: "sandbox", label: "Sandbox", description: "Open world, player-driven goals" },
                  { value: "emergent", label: "Emergent", description: "Story arises from character actions" },
                ],
                allowFreeform: false,
                allowDelegate: true,
                delegateLabel: "Whatever works for the story",
              },
              {
                id: "playerAgency",
                question: "How much control do you want over the story?",
                description: "Your influence on events",
                options: [
                  { value: "guided", label: "Guided", description: "Clear objectives, directed experience" },
                  { value: "balanced", label: "Balanced", description: "Mix of direction and freedom" },
                  { value: "full-sandbox", label: "Full Sandbox", description: "Complete freedom, I make my own path" },
                ],
                allowFreeform: false,
                allowDelegate: true,
                delegateLabel: "Guide me when needed",
              },
              {
                id: "npcDepth",
                question: "How detailed should NPCs be?",
                description: "Depth of non-player characters",
                options: [
                  { value: "functional", label: "Functional", description: "Serve their purpose, move on" },
                  { value: "developed", label: "Developed", description: "Personalities, some backstory" },
                  { value: "deep-characterization", label: "Deep", description: "Rich histories, complex motivations" },
                ],
                allowFreeform: false,
                allowDelegate: true,
                delegateLabel: "Important NPCs should be deep",
              },
              {
                id: "romanceContent",
                question: "How should romantic content be handled?",
                description: "If romance occurs in the story",
                options: [
                  { value: "none", label: "None", description: "No romantic subplots" },
                  { value: "fade-to-black", label: "Fade to Black", description: "Romance exists but not detailed" },
                  { value: "tasteful", label: "Tasteful", description: "Romantic moments, nothing explicit" },
                  { value: "detailed", label: "Detailed", description: "Romantic storylines are important" },
                ],
                allowFreeform: false,
                allowDelegate: true,
                delegateLabel: "Keep it tasteful if it comes up",
              },
            ],
          },
          {
            name: "World Building",
            description: "The nature of the game world",
            questions: [
              {
                id: "worldFamiliarity",
                question: "How familiar should the world feel?",
                description: "Recognizable vs. alien",
                options: [
                  { value: "established-ip", label: "Established IP", description: "Based on existing fiction I know" },
                  { value: "familiar-tropes", label: "Familiar Tropes", description: "Classic genre conventions" },
                  { value: "unique-twists", label: "Unique Twists", description: "Familiar base with surprises" },
                  { value: "alien-unfamiliar", label: "Alien/Unfamiliar", description: "Strange and new to discover" },
                ],
                allowFreeform: true,
                allowDelegate: true,
                delegateLabel: "Surprise me but keep it coherent",
              },
              {
                id: "magicOrTechLevel",
                question: "How prevalent is magic/advanced technology?",
                description: "Supernatural or technological elements",
                options: [
                  { value: "none", label: "None", description: "Realistic, no supernatural elements" },
                  { value: "rare", label: "Rare", description: "Exists but uncommon, special" },
                  { value: "common", label: "Common", description: "Part of everyday life" },
                  { value: "ubiquitous", label: "Ubiquitous", description: "Everywhere, defines the world" },
                ],
                allowFreeform: false,
                allowDelegate: true,
                delegateLabel: "Match the genre",
              },
              {
                id: "politicalComplexity",
                question: "How complex should politics/factions be?",
                description: "Intrigue and power dynamics",
                options: [
                  { value: "simple", label: "Simple", description: "Clear good/evil, straightforward" },
                  { value: "moderate", label: "Moderate", description: "Some factions, reasonable complexity" },
                  { value: "intricate", label: "Intricate", description: "Web of alliances, betrayals, schemes" },
                ],
                allowFreeform: false,
                allowDelegate: true,
                delegateLabel: "Match the narrative style",
              },
            ],
          },
          {
            name: "Session & Pacing",
            description: "How we play together",
            questions: [
              {
                id: "sessionLength",
                question: "How long are your typical play sessions?",
                description: "Affects story pacing",
                options: [
                  { value: "quick-30min", label: "Quick (30 min)", description: "Short bursts of play" },
                  { value: "standard-1hr", label: "Standard (1 hour)", description: "Typical session length" },
                  { value: "extended-2hr", label: "Extended (2+ hours)", description: "Long immersive sessions" },
                  { value: "marathon", label: "Marathon", description: "Epic multi-hour adventures" },
                ],
                allowFreeform: true,
                allowDelegate: false,
                delegateLabel: null,
              },
              {
                id: "pacingPreference",
                question: "What pacing do you enjoy?",
                description: "Story rhythm",
                options: [
                  { value: "action-packed", label: "Action-Packed", description: "Constant momentum, little downtime" },
                  { value: "balanced", label: "Balanced", description: "Mix of action and quiet moments" },
                  { value: "slow-burn", label: "Slow Burn", description: "Build-up, atmosphere, payoff" },
                ],
                allowFreeform: false,
                allowDelegate: true,
                delegateLabel: "Vary it naturally",
              },
            ],
          },
          {
            name: "Character",
            description: "Your character in the story",
            questions: [
              {
                id: "characterCreation",
                question: "How do you want to create your character?",
                description: "Level of involvement in character creation",
                options: [
                  { value: "pre-made", label: "Pre-made", description: "Give me a character to play" },
                  { value: "guided", label: "Guided", description: "Help me build one step by step" },
                  { value: "full-custom", label: "Full Custom", description: "I'll define everything myself" },
                ],
                allowFreeform: false,
                allowDelegate: true,
                delegateLabel: "Suggest a character that fits",
              },
              {
                id: "startingPowerLevel",
                question: "Where should your character start?",
                description: "Initial capability level",
                options: [
                  { value: "zero-to-hero", label: "Zero to Hero", description: "Start weak, grow powerful" },
                  { value: "competent", label: "Competent", description: "Capable but room to grow" },
                  { value: "experienced", label: "Experienced", description: "Already skilled and capable" },
                  { value: "legendary", label: "Legendary", description: "Start as a powerhouse" },
                ],
                allowFreeform: false,
                allowDelegate: true,
                delegateLabel: "Match the story needs",
              },
            ],
          },
          {
            name: "Content & Safety",
            description: "Boundaries and preferences",
            questions: [
              {
                id: "contentToAvoid",
                question: "Any topics or themes you want to AVOID?",
                description: "Things that should not appear in the game",
                options: [],
                allowFreeform: true,
                allowDelegate: false,
                delegateLabel: null,
              },
              {
                id: "contentToInclude",
                question: "Any topics or themes you definitely WANT included?",
                description: "Things you'd enjoy seeing",
                options: [],
                allowFreeform: true,
                allowDelegate: false,
                delegateLabel: null,
              },
              {
                id: "inspirations",
                question: "Any movies, books, games, or shows you want this to feel like?",
                description: "Reference points for tone and style",
                options: [],
                allowFreeform: true,
                allowDelegate: true,
                delegateLabel: "Pick inspirations that fit my choices",
              },
              {
                id: "additionalNotes",
                question: "Anything else you want me to know?",
                description: "Other preferences, ideas, or requests",
                options: [],
                allowFreeform: true,
                allowDelegate: false,
                delegateLabel: null,
              },
            ],
          },
        ],
        instructions: {
          forDM: "Present questions conversationally. Group related questions. Remember: players can always say 'you decide' or 'surprise me' to delegate any choice.",
          delegatePhrase: "When a player delegates, note it with delegatedToDM: true and make an appropriate choice that fits their other preferences.",
        },
      };

      return {
        content: [{ type: "text", text: JSON.stringify(template, null, 2) }],
      };
    }
  );

  server.tool(
    "save_game_preferences",
    "Save the player's game preferences after the interview",
    {
      sessionId: z.string().describe("The session ID"),
      preferences: z.object({
        genre: z.object({ value: z.string().nullable(), delegatedToDM: z.boolean(), notes: z.string().optional() }),
        tone: z.object({ value: z.string().nullable(), delegatedToDM: z.boolean(), notes: z.string().optional() }),
        setting: z.object({ value: z.string().nullable(), delegatedToDM: z.boolean(), notes: z.string().optional() }),
        complexity: z.object({ value: z.string().nullable(), delegatedToDM: z.boolean(), notes: z.string().optional() }),
        combatFrequency: z.object({ value: z.string().nullable(), delegatedToDM: z.boolean(), notes: z.string().optional() }),
        combatStyle: z.object({ value: z.string().nullable(), delegatedToDM: z.boolean(), notes: z.string().optional() }),
        lethality: z.object({ value: z.string().nullable(), delegatedToDM: z.boolean(), notes: z.string().optional() }),
        narrativeStyle: z.object({ value: z.string().nullable(), delegatedToDM: z.boolean(), notes: z.string().optional() }),
        playerAgency: z.object({ value: z.string().nullable(), delegatedToDM: z.boolean(), notes: z.string().optional() }),
        npcDepth: z.object({ value: z.string().nullable(), delegatedToDM: z.boolean(), notes: z.string().optional() }),
        romanceContent: z.object({ value: z.string().nullable(), delegatedToDM: z.boolean(), notes: z.string().optional() }),
        worldFamiliarity: z.object({ value: z.string().nullable(), delegatedToDM: z.boolean(), notes: z.string().optional() }),
        magicOrTechLevel: z.object({ value: z.string().nullable(), delegatedToDM: z.boolean(), notes: z.string().optional() }),
        politicalComplexity: z.object({ value: z.string().nullable(), delegatedToDM: z.boolean(), notes: z.string().optional() }),
        sessionLength: z.object({ value: z.string().nullable(), delegatedToDM: z.boolean(), notes: z.string().optional() }),
        pacingPreference: z.object({ value: z.string().nullable(), delegatedToDM: z.boolean(), notes: z.string().optional() }),
        characterCreation: z.object({ value: z.string().nullable(), delegatedToDM: z.boolean(), notes: z.string().optional() }),
        startingPowerLevel: z.object({ value: z.string().nullable(), delegatedToDM: z.boolean(), notes: z.string().optional() }),
        contentToAvoid: z.array(z.string()),
        contentToInclude: z.array(z.string()),
        inspirations: z.array(z.string()),
        additionalNotes: z.string(),
      }).describe("The collected preferences"),
    },
    async ({ sessionId, preferences }) => {
      const success = sessionTools.updateSessionPreferences(sessionId, preferences);
      if (!success) {
        return {
          content: [{ type: "text", text: "Session not found" }],
          isError: true,
        };
      }

      // Count delegated vs specified
      const prefEntries = Object.entries(preferences).filter(
        ([key]) => !["contentToAvoid", "contentToInclude", "inspirations", "additionalNotes"].includes(key)
      );
      const delegated = prefEntries.filter(([, v]) => (v as { delegatedToDM: boolean }).delegatedToDM).length;
      const specified = prefEntries.length - delegated;

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            saved: true,
            summary: {
              specifiedByPlayer: specified,
              delegatedToDM: delegated,
              contentBoundaries: preferences.contentToAvoid.length + preferences.contentToInclude.length,
              inspirations: preferences.inspirations.length,
            },
            nextStep: "Use get_rules to check if rules exist, or generate rules based on these preferences.",
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "get_game_preferences",
    "Get the saved game preferences for a session",
    {
      sessionId: z.string().describe("The session ID"),
    },
    async ({ sessionId }) => {
      const preferences = sessionTools.getSessionPreferences(sessionId);
      if (!preferences) {
        return {
          content: [{ type: "text", text: "No preferences found for this session" }],
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(preferences, null, 2) }],
      };
    }
  );

  // ============================================================================
  // RULES TOOLS
  // ============================================================================

  server.tool(
    "set_rules",
    "Store a rule system for the session",
    {
      sessionId: z.string().describe("The session ID"),
      rules: z.object({
        name: z.string(),
        description: z.string(),
        attributes: z.array(z.object({
          name: z.string(),
          abbreviation: z.string(),
          description: z.string(),
          defaultValue: z.number(),
          minValue: z.number(),
          maxValue: z.number(),
        })),
        skills: z.array(z.object({
          name: z.string(),
          governingAttribute: z.string(),
          description: z.string(),
        })),
        derivedStats: z.array(z.object({
          name: z.string(),
          abbreviation: z.string(),
          description: z.string(),
          formula: z.string(),
        })),
        combatRules: z.object({
          initiativeFormula: z.string(),
          actionsPerTurn: z.number(),
          attackFormula: z.string(),
          defenseFormula: z.string(),
          damageFormula: z.string(),
          conditions: z.array(z.object({
            name: z.string(),
            description: z.string(),
            effects: z.string(),
          })),
        }),
        checkMechanics: z.object({
          baseDice: z.string(),
          modifierCalculation: z.string(),
          difficultyScale: z.record(z.string(), z.number()),
          criticalSuccess: z.number().optional(),
          criticalFailure: z.number().optional(),
        }),
        progression: z.object({
          experienceFormula: z.string(),
          levelUpThresholds: z.array(z.number()),
          attributePointsPerLevel: z.number(),
          skillPointsPerLevel: z.number(),
        }),
      }).describe("The complete rule system"),
    },
    async ({ sessionId, rules }) => {
      const success = rulesTools.setRules(sessionId, rules);
      return {
        content: [{ type: "text", text: success ? "Rules set successfully" : "Failed to set rules" }],
        isError: !success,
      };
    }
  );

  server.tool(
    "get_rules",
    "Get the current rule system for a session",
    {
      sessionId: z.string().describe("The session ID"),
    },
    async ({ sessionId }) => {
      const rules = rulesTools.getRules(sessionId);
      if (!rules) {
        return {
          content: [{ type: "text", text: "No rules set for this session" }],
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(rules, null, 2) }],
      };
    }
  );

  server.tool(
    "update_rules",
    "Partially update the rule system",
    {
      sessionId: z.string().describe("The session ID"),
      updates: z.record(z.string(), z.unknown()).describe("Partial rule updates"),
    },
    async ({ sessionId, updates }) => {
      const rules = rulesTools.updateRules(sessionId, updates);
      if (!rules) {
        return {
          content: [{ type: "text", text: "No rules to update" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(rules, null, 2) }],
      };
    }
  );
}
