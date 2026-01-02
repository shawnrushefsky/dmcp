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

  server.registerTool(
    "get_game_menu",
    {
      description: "CALL THIS FIRST when player wants to play. Returns existing games (most recent first) or instructs to start new game if none exist.",
      inputSchema: {},
      annotations: ANNOTATIONS.READ_ONLY,
    },
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

  server.registerTool(
    "create_session",
    {
      description: "Create a new game session with a setting and style",
      inputSchema: {
        name: z.string().min(1).max(LIMITS.NAME_MAX).describe("Name for this game session"),
        setting: z.string().min(1).max(LIMITS.DESCRIPTION_MAX).describe("The game setting (e.g., 'dark fantasy', 'cyberpunk', 'cosmic horror')"),
        style: z.string().min(1).max(LIMITS.NAME_MAX).describe("The narrative style (e.g., 'gritty', 'heroic', 'survival')"),
      },
      annotations: ANNOTATIONS.CREATE,
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

  server.registerTool(
    "load_session",
    {
      description: "Load an existing game session by ID",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID to load"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
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

  server.registerTool(
    "list_sessions",
    {
      description: "List all saved game sessions",
      inputSchema: {},
      annotations: ANNOTATIONS.READ_ONLY,
    },
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

  server.registerTool(
    "get_session_state",
    {
      description: "Get full current state overview for a session",
      inputSchema: {
        sessionId: z.string().describe("The session ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
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
              visualization: "Use the location and character data to describe the world. Generate ASCII art, maps, or other visualizations as appropriate to enhance immersion.",
            },
          }, null, 2),
        }],
      };
    }
  );

  server.registerTool(
    "delete_session",
    {
      description: "Delete a game session and all its data. This is IRREVERSIBLE and removes all characters, locations, quests, and history.",
      inputSchema: {
        sessionId: z.string().describe("The session ID to delete"),
      },
      annotations: ANNOTATIONS.DESTRUCTIVE,
    },
    async ({ sessionId }) => {
      const success = sessionTools.deleteSession(sessionId);
      return {
        content: [{ type: "text", text: success ? "Session deleted" : "Session not found" }],
        isError: !success,
      };
    }
  );

  server.registerTool(
    "update_session",
    {
      description: "Update a game session's name, setting, or style",
      inputSchema: {
        sessionId: z.string().describe("The session ID to update"),
        name: z.string().min(1).max(LIMITS.NAME_MAX).optional().describe("New name for the session"),
        setting: z.string().min(1).max(LIMITS.DESCRIPTION_MAX).optional().describe("New setting description"),
        style: z.string().min(1).max(LIMITS.NAME_MAX).optional().describe("New narrative style"),
      },
      annotations: ANNOTATIONS.UPDATE,
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

  server.registerTool(
    "set_session_title_image",
    {
      description: "Set or remove the title image for a game session",
      inputSchema: {
        sessionId: z.string().describe("The session ID"),
        imageId: z.string().nullable().describe("The image ID to set as title image, or null to remove"),
      },
      annotations: ANNOTATIONS.SET,
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

  server.registerTool(
    "get_interview_template",
    {
      description: "Get the full game setup interview template with all questions. Use this to guide players through game creation.",
      inputSchema: {},
      annotations: ANNOTATIONS.READ_ONLY,
    },
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

  server.registerTool(
    "save_game_preferences",
    {
      description: "Save the player's game preferences after the interview",
      inputSchema: {
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
      annotations: ANNOTATIONS.CREATE,
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

  server.registerTool(
    "get_game_preferences",
    {
      description: "Get the saved game preferences for a session",
      inputSchema: {
        sessionId: z.string().describe("The session ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
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
  // IMAGE GENERATION PRESET TOOLS
  // ============================================================================

  // Reusable schema for image generation config (used in create and update)
  const imageGenerationConfigSchema = z.object({
    defaultTool: z.enum(["dalle", "sdxl", "midjourney", "comfyui", "flux", "other"]).optional()
      .describe("Default image generation tool/service"),
    defaultStyle: z.object({
      artisticStyle: z.string().optional().describe("E.g., 'digital painting', 'oil painting', 'anime'"),
      mood: z.string().optional().describe("E.g., 'dark', 'epic', 'whimsical'"),
      colorScheme: z.string().optional().describe("E.g., 'warm', 'cold', 'muted', 'vibrant'"),
      qualityTags: z.array(z.string()).optional().describe("E.g., ['highly detailed', '8k', 'masterpiece']"),
      negativePrompts: z.array(z.string()).optional().describe("Things to avoid globally"),
      influences: z.array(z.string()).optional().describe("Artist/game/movie style references"),
    }).optional().describe("Default style settings applied to all images"),
    comfyui: z.object({
      endpoint: z.string().optional().describe("ComfyUI server URL"),
      checkpoint: z.string().optional().describe("Default checkpoint model"),
      loras: z.array(z.object({
        name: z.string(),
        weight: z.number(),
      })).optional().describe("LoRA models to apply"),
      samplerSettings: z.object({
        sampler: z.string().optional(),
        scheduler: z.string().optional(),
        steps: z.number().optional(),
        cfg: z.number().optional(),
      }).optional(),
      workflows: z.record(z.string(), z.object({
        name: z.string().describe("Human-readable workflow name"),
        description: z.string().optional().describe("What this workflow does"),
        workflow: z.record(z.string(), z.unknown()).describe("Full ComfyUI workflow JSON (API format)"),
        inputNodes: z.object({
          positivePrompt: z.string().optional().describe("Node ID for positive prompt"),
          negativePrompt: z.string().optional().describe("Node ID for negative prompt"),
          checkpoint: z.string().optional().describe("Node ID for checkpoint loader"),
          seed: z.string().optional().describe("Node ID for seed/noise"),
          width: z.string().optional().describe("Node ID for width"),
          height: z.string().optional().describe("Node ID for height"),
          steps: z.string().optional().describe("Node ID for steps"),
          cfg: z.string().optional().describe("Node ID for CFG scale"),
          sampler: z.string().optional().describe("Node ID for sampler"),
          scheduler: z.string().optional().describe("Node ID for scheduler"),
        }).optional().describe("Node IDs for dynamic value injection"),
      })).optional().describe("Named workflow templates - full ComfyUI workflows"),
      defaultWorkflowId: z.string().optional().describe("ID of the default workflow to use"),
      defaultWorkflow: z.string().optional().describe("Legacy: Workflow name or ID"),
      workflowOverrides: z.record(z.string(), z.unknown()).optional(),
    }).optional().describe("ComfyUI-specific settings"),
    dalle: z.object({
      model: z.string().optional().describe("'dall-e-3' or 'dall-e-2'"),
      quality: z.enum(["standard", "hd"]).optional(),
      style: z.enum(["vivid", "natural"]).optional(),
      size: z.enum(["1024x1024", "1792x1024", "1024x1792"]).optional(),
    }).optional().describe("DALL-E specific settings"),
    midjourney: z.object({
      version: z.string().optional().describe("'v5', 'v6', 'niji'"),
      stylize: z.number().optional().describe("0-1000"),
      chaos: z.number().optional().describe("0-100"),
      quality: z.number().optional().describe("0.25, 0.5, 1, 2"),
      aspectRatio: z.string().optional().describe("E.g., '1:1', '16:9', '2:3'"),
    }).optional().describe("Midjourney specific settings"),
    sdxl: z.object({
      model: z.string().optional().describe("Model ID or path"),
      samplerName: z.string().optional(),
      steps: z.number().optional(),
      cfg: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      negativePrompt: z.string().optional(),
    }).optional().describe("Stable Diffusion / SDXL settings"),
    flux: z.object({
      model: z.string().optional().describe("'schnell', 'dev', 'pro'"),
      steps: z.number().optional(),
      guidance: z.number().optional(),
    }).optional().describe("Flux settings"),
    defaults: z.object({
      aspectRatio: z.string().optional().describe("Default aspect ratio for images"),
      generateOnCreate: z.boolean().optional().describe("Auto-generate images when entities are created"),
      savePrompts: z.boolean().optional().describe("Store prompts with entities"),
      framing: z.object({
        character: z.string().optional().describe("Default framing for character portraits"),
        location: z.string().optional().describe("Default framing for location scenes"),
        item: z.string().optional().describe("Default framing for item images"),
      }).optional(),
    }).optional().describe("Generation defaults"),
    consistency: z.object({
      maintainColorPalette: z.boolean().optional(),
      characterSeedImages: z.record(z.string(), z.string()).optional().describe("characterId -> seed image"),
      styleReferenceImage: z.string().optional().describe("Session-wide style reference"),
      useCharacterRefs: z.boolean().optional().describe("Use existing character images as reference"),
    }).optional().describe("Consistency settings"),
    notes: z.string().optional().describe("Custom notes for the DM about image generation"),
  });

  server.registerTool(
    "list_image_generation_presets",
    {
      description: "List all image generation presets for a session. Presets allow different configurations for different use cases (character portraits, location art, items with text, etc.)",
      inputSchema: {
        sessionId: z.string().describe("The session ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ sessionId }) => {
      const presets = sessionTools.listImageGenerationPresets(sessionId);
      const defaultPreset = sessionTools.getDefaultImagePreset(sessionId);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            count: presets.length,
            defaultPresetId: defaultPreset?.id || null,
            presets: presets.map(p => ({
              id: p.id,
              name: p.name,
              description: p.description,
              entityTypes: p.entityTypes,
              isDefault: p.isDefault,
              tool: p.config.defaultTool,
            })),
          }, null, 2),
        }],
      };
    }
  );

  server.registerTool(
    "get_image_generation_preset",
    {
      description: "Get a specific image generation preset by ID, including full configuration details",
      inputSchema: {
        sessionId: z.string().describe("The session ID"),
        presetId: z.string().describe("The preset ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ sessionId, presetId }) => {
      const preset = sessionTools.getImageGenerationPreset(sessionId, presetId);
      if (!preset) {
        return {
          content: [{ type: "text", text: "Preset not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(preset, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_default_image_preset",
    {
      description: "Get the default image generation preset for a session",
      inputSchema: {
        sessionId: z.string().describe("The session ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ sessionId }) => {
      const preset = sessionTools.getDefaultImagePreset(sessionId);
      if (!preset) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              message: "No image generation presets configured for this session",
              hint: "Use create_image_generation_preset to add presets for different use cases",
            }, null, 2),
          }],
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(preset, null, 2) }],
      };
    }
  );

  server.registerTool(
    "create_image_generation_preset",
    {
      description: "Create a new image generation preset. Use different presets for different purposes: character portraits, location art, items with text, etc. Each preset can have its own tool, model, style, and workflow configuration.",
      inputSchema: {
        sessionId: z.string().describe("The session ID"),
        name: z.string().describe("Human-readable preset name (e.g., 'Character Portraits', 'Location Art', 'Items with Text')"),
        description: z.string().optional().describe("What this preset is for"),
        entityTypes: z.array(z.enum(["character", "location", "item", "scene", "faction"])).optional()
          .describe("Which entity types this preset is best suited for"),
        isDefault: z.boolean().optional().describe("Make this the default preset"),
        config: imageGenerationConfigSchema.describe("The image generation configuration"),
      },
      annotations: ANNOTATIONS.CREATE,
    },
    async ({ sessionId, name, description, entityTypes, isDefault, config }) => {
      const preset = sessionTools.createImageGenerationPreset(sessionId, {
        name,
        description,
        entityTypes,
        isDefault,
        config,
      });
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            created: true,
            preset: {
              id: preset.id,
              name: preset.name,
              description: preset.description,
              entityTypes: preset.entityTypes,
              isDefault: preset.isDefault,
              tool: preset.config.defaultTool,
            },
          }, null, 2),
        }],
      };
    }
  );

  server.registerTool(
    "update_image_generation_preset",
    {
      description: "Update an existing image generation preset. Only specified fields are updated; others are preserved.",
      inputSchema: {
        sessionId: z.string().describe("The session ID"),
        presetId: z.string().describe("The preset ID to update"),
        name: z.string().optional().describe("New preset name"),
        description: z.string().optional().describe("New description"),
        entityTypes: z.array(z.enum(["character", "location", "item", "scene", "faction"])).optional()
          .describe("Update which entity types this preset is for"),
        isDefault: z.boolean().optional().describe("Make this the default preset"),
        config: imageGenerationConfigSchema.partial().optional().describe("Partial config updates (deep merged)"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ sessionId, presetId, name, description, entityTypes, isDefault, config }) => {
      const preset = sessionTools.updateImageGenerationPreset(sessionId, presetId, {
        name,
        description,
        entityTypes,
        isDefault,
        config,
      });
      if (!preset) {
        return {
          content: [{ type: "text", text: "Preset not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(preset, null, 2) }],
      };
    }
  );

  server.registerTool(
    "delete_image_generation_preset",
    {
      description: "Delete an image generation preset. This is IRREVERSIBLE.",
      inputSchema: {
        sessionId: z.string().describe("The session ID"),
        presetId: z.string().describe("The preset ID to delete"),
      },
      annotations: ANNOTATIONS.DELETE,
    },
    async ({ sessionId, presetId }) => {
      const success = sessionTools.deleteImageGenerationPreset(sessionId, presetId);
      if (!success) {
        return {
          content: [{ type: "text", text: "Preset not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify({ deleted: true, presetId }, null, 2) }],
      };
    }
  );

  server.registerTool(
    "set_default_image_preset",
    {
      description: "Set which image generation preset should be used by default",
      inputSchema: {
        sessionId: z.string().describe("The session ID"),
        presetId: z.string().describe("The preset ID to make default"),
      },
      annotations: ANNOTATIONS.SET,
    },
    async ({ sessionId, presetId }) => {
      const success = sessionTools.setDefaultImagePreset(sessionId, presetId);
      if (!success) {
        return {
          content: [{ type: "text", text: "Preset not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, defaultPresetId: presetId }, null, 2) }],
      };
    }
  );

  // ============================================================================
  // RULES TOOLS
  // ============================================================================

  server.registerTool(
    "set_rules",
    {
      description: "Store a rule system for the session",
      inputSchema: {
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
      annotations: ANNOTATIONS.SET,
    },
    async ({ sessionId, rules }) => {
      const success = rulesTools.setRules(sessionId, rules);
      return {
        content: [{ type: "text", text: success ? "Rules set successfully" : "Failed to set rules" }],
        isError: !success,
      };
    }
  );

  server.registerTool(
    "get_rules",
    {
      description: "Get the current rule system for a session",
      inputSchema: {
        sessionId: z.string().describe("The session ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
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

  server.registerTool(
    "update_rules",
    {
      description: "Partially update the rule system",
      inputSchema: {
        sessionId: z.string().describe("The session ID"),
        updates: z.record(z.string(), z.unknown()).describe("Partial rule updates"),
      },
      annotations: ANNOTATIONS.UPDATE,
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
