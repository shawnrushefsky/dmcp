#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { initializeSchema } from "./db/schema.js";
import { closeDatabase } from "./db/connection.js";

// Import all tool modules
import * as sessionTools from "./tools/session.js";
import * as rulesTools from "./tools/rules.js";
import * as worldTools from "./tools/world.js";
import * as characterTools from "./tools/character.js";
import * as combatTools from "./tools/combat.js";
import * as inventoryTools from "./tools/inventory.js";
import * as questTools from "./tools/quest.js";
import * as diceTools from "./tools/dice.js";
import * as narrativeTools from "./tools/narrative.js";
import * as resourceTools from "./tools/resource.js";

// Initialize database
initializeSchema();

// Reusable Zod schemas for image generation
const subjectDescriptionSchema = z.object({
  type: z.enum(["character", "location", "item", "scene"]),
  primaryDescription: z.string(),
  physicalTraits: z.object({
    age: z.string().optional(),
    gender: z.string().optional(),
    bodyType: z.string().optional(),
    height: z.string().optional(),
    skinTone: z.string().optional(),
    hairColor: z.string().optional(),
    hairStyle: z.string().optional(),
    eyeColor: z.string().optional(),
    facialFeatures: z.string().optional(),
    distinguishingMarks: z.array(z.string()).optional(),
  }).optional(),
  attire: z.object({
    description: z.string(),
    colors: z.array(z.string()).optional(),
    materials: z.array(z.string()).optional(),
    accessories: z.array(z.string()).optional(),
  }).optional(),
  environment: z.object({
    setting: z.string(),
    timeOfDay: z.string().optional(),
    weather: z.string().optional(),
    lighting: z.string().optional(),
    architecture: z.string().optional(),
    vegetation: z.string().optional(),
    notableFeatures: z.array(z.string()).optional(),
  }).optional(),
  objectDetails: z.object({
    material: z.string().optional(),
    size: z.string().optional(),
    condition: z.string().optional(),
    glowOrEffects: z.string().optional(),
  }).optional(),
  pose: z.string().optional(),
  expression: z.string().optional(),
  action: z.string().optional(),
});

const styleDescriptionSchema = z.object({
  artisticStyle: z.string(),
  genre: z.string(),
  mood: z.string(),
  colorScheme: z.string().optional(),
  influences: z.array(z.string()).optional(),
  qualityTags: z.array(z.string()).optional(),
  negativeElements: z.array(z.string()).optional(),
});

const compositionDescriptionSchema = z.object({
  framing: z.string(),
  cameraAngle: z.string().optional(),
  aspectRatio: z.string().optional(),
  focusPoint: z.string().optional(),
  background: z.string().optional(),
  depth: z.string().optional(),
});

const comfyUIPromptSchema = z.object({
  positive: z.string(),
  negative: z.string(),
  checkpoint: z.string().optional(),
  loras: z.array(z.object({
    name: z.string(),
    weight: z.number(),
  })).optional(),
  samplerSettings: z.object({
    sampler: z.string().optional(),
    scheduler: z.string().optional(),
    steps: z.number().optional(),
    cfg: z.number().optional(),
  }).optional(),
});

const generatedImageSchema = z.object({
  id: z.string(),
  tool: z.string(),
  prompt: z.string(),
  url: z.string().optional(),
  base64: z.string().optional(),
  seed: z.number().optional(),
  timestamp: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const imageGenSchema = z.object({
  subject: subjectDescriptionSchema,
  style: styleDescriptionSchema,
  composition: compositionDescriptionSchema,
  prompts: z.object({
    generic: z.string().optional(),
    sdxl: z.string().optional(),
    dalle: z.string().optional(),
    midjourney: z.string().optional(),
    flux: z.string().optional(),
    comfyui: comfyUIPromptSchema.optional(),
  }).optional(),
  generations: z.array(generatedImageSchema).optional(),
  consistency: z.object({
    characterRef: z.string().optional(),
    seedImage: z.string().optional(),
    colorPalette: z.array(z.string()).optional(),
    styleRef: z.string().optional(),
  }).optional(),
}).describe("Image generation metadata for visual representation");

// Create MCP server
const server = new McpServer({
  name: "dmcp",
  version: "0.1.0",
});

// ============================================================================
// SESSION TOOLS
// ============================================================================

server.tool(
  "get_game_menu",
  "CALL THIS FIRST when player wants to play. Returns existing games (most recent first) or instructs to start new game if none exist.",
  {},
  async () => {
    const menu = sessionTools.getGameMenu();
    return {
      content: [{ type: "text", text: JSON.stringify(menu, null, 2) }],
    };
  }
);

server.tool(
  "create_session",
  "Create a new game session with a setting and style",
  {
    name: z.string().describe("Name for this game session"),
    setting: z.string().describe("The game setting (e.g., 'dark fantasy', 'cyberpunk', 'cosmic horror')"),
    style: z.string().describe("The narrative style (e.g., 'gritty', 'heroic', 'survival')"),
  },
  async ({ name, setting, style }) => {
    const session = sessionTools.createSession({ name, setting, style });
    return {
      content: [{ type: "text", text: JSON.stringify(session, null, 2) }],
    };
  }
);

server.tool(
  "load_session",
  "Load an existing game session by ID",
  {
    sessionId: z.string().describe("The session ID to load"),
  },
  async ({ sessionId }) => {
    const session = sessionTools.loadSession(sessionId);
    if (!session) {
      return {
        content: [{ type: "text", text: `Session ${sessionId} not found` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(session, null, 2) }],
    };
  }
);

server.tool(
  "list_sessions",
  "List all saved game sessions",
  {},
  async () => {
    const sessions = sessionTools.listSessions();
    return {
      content: [{ type: "text", text: JSON.stringify(sessions, null, 2) }],
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
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          ...state,
          tips: {
            visualization: "Use render_map to show the world. If no image generation is available, use ASCII art liberally for character portraits, items, scene illustrations, and combat layouts to enhance immersion.",
            mapRecommendation: state.locationCount > 0 ? "Consider showing a map with render_map" : null,
          },
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "delete_session",
  "Delete a game session and all its data",
  {
    sessionId: z.string().describe("The session ID to delete"),
  },
  async ({ sessionId }) => {
    const success = sessionTools.deleteSession(sessionId);
    return {
      content: [{ type: "text", text: success ? "Session deleted" : "Session not found" }],
      isError: !success,
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

// ============================================================================
// WORLD/LOCATION TOOLS
// ============================================================================

server.tool(
  "create_location",
  "Create a new location in the game world",
  {
    sessionId: z.string().describe("The session ID"),
    name: z.string().describe("Location name"),
    description: z.string().describe("Location description"),
    properties: z.object({
      features: z.array(z.string()).optional(),
      atmosphere: z.string().optional(),
    }).optional().describe("Additional location properties"),
    imageGen: imageGenSchema.optional().describe("Image generation metadata for location art"),
  },
  async ({ sessionId, name, description, properties, imageGen }) => {
    const location = worldTools.createLocation({ sessionId, name, description, properties, imageGen });
    return {
      content: [{ type: "text", text: JSON.stringify(location, null, 2) }],
    };
  }
);

server.tool(
  "get_location",
  "Get location details",
  {
    locationId: z.string().describe("The location ID"),
  },
  async ({ locationId }) => {
    const location = worldTools.getLocation(locationId);
    if (!location) {
      return {
        content: [{ type: "text", text: "Location not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(location, null, 2) }],
    };
  }
);

server.tool(
  "update_location",
  "Update a location",
  {
    locationId: z.string().describe("The location ID"),
    name: z.string().optional().describe("New name"),
    description: z.string().optional().describe("New description"),
    properties: z.record(z.string(), z.unknown()).optional().describe("Property updates"),
    imageGen: imageGenSchema.nullable().optional().describe("Image generation metadata (null to remove)"),
  },
  async ({ locationId, name, description, properties, imageGen }) => {
    const location = worldTools.updateLocation(locationId, { name, description, properties, imageGen });
    if (!location) {
      return {
        content: [{ type: "text", text: "Location not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(location, null, 2) }],
    };
  }
);

server.tool(
  "list_locations",
  "List all locations in a session",
  {
    sessionId: z.string().describe("The session ID"),
  },
  async ({ sessionId }) => {
    const locations = worldTools.listLocations(sessionId);
    return {
      content: [{ type: "text", text: JSON.stringify(locations, null, 2) }],
    };
  }
);

server.tool(
  "connect_locations",
  "Create exits/paths between two locations",
  {
    fromLocationId: z.string().describe("First location ID"),
    toLocationId: z.string().describe("Second location ID"),
    fromDirection: z.string().describe("Direction from first location (e.g., 'north', 'up', 'through the door')"),
    toDirection: z.string().describe("Direction from second location back (e.g., 'south', 'down')"),
    description: z.string().optional().describe("Description of the path"),
    bidirectional: z.boolean().optional().describe("Create exit in both directions (default: true)"),
  },
  async ({ fromLocationId, toLocationId, fromDirection, toDirection, description, bidirectional }) => {
    const success = worldTools.connectLocations({
      fromLocationId,
      toLocationId,
      fromDirection,
      toDirection,
      description,
      bidirectional,
    });
    return {
      content: [{ type: "text", text: success ? "Locations connected" : "Failed to connect locations" }],
      isError: !success,
    };
  }
);

server.tool(
  "render_map",
  "Render an ASCII map of the game world. Can show the full map or a local area around a specific location.",
  {
    sessionId: z.string().describe("The session ID"),
    centerId: z.string().optional().describe("Location ID to center the map on (defaults to player location or first location)"),
    radius: z.number().optional().describe("Maximum distance from center to show (omit for full map)"),
    playerLocationId: z.string().optional().describe("Current player location ID (marks with @ on map)"),
  },
  async ({ sessionId, centerId, radius, playerLocationId }) => {
    const mapData = worldTools.renderMap(sessionId, {
      centerId,
      radius,
      showPlayerLocation: !!playerLocationId,
      playerLocationId,
    });

    if (!mapData) {
      return {
        content: [{ type: "text", text: "No locations found in this session" }],
        isError: true,
      };
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          ascii: mapData.ascii,
          nodeCount: mapData.nodes.length,
          bounds: mapData.bounds,
          nodes: mapData.nodes.map(n => ({
            id: n.id,
            name: n.name,
            position: { x: n.x, y: n.y },
            exits: n.exits.length,
            isCenter: n.isCenter,
            hasPlayer: n.hasPlayer,
          })),
          instruction: "Display the ASCII map to the player. The @ symbol marks the player's location. Use this to help players visualize the game world.",
        }, null, 2),
      }],
    };
  }
);

// ============================================================================
// CHARACTER TOOLS
// ============================================================================

server.tool(
  "create_character",
  "Create a new character (PC or NPC)",
  {
    sessionId: z.string().describe("The session ID"),
    name: z.string().describe("Character name"),
    isPlayer: z.boolean().describe("True for player character, false for NPC"),
    attributes: z.record(z.string(), z.number()).optional().describe("Character attributes"),
    skills: z.record(z.string(), z.number()).optional().describe("Character skills"),
    status: z.object({
      health: z.number().optional(),
      maxHealth: z.number().optional(),
      conditions: z.array(z.string()).optional(),
      experience: z.number().optional(),
      level: z.number().optional(),
    }).optional().describe("Initial status"),
    locationId: z.string().optional().describe("Starting location"),
    notes: z.string().optional().describe("Character notes"),
    voice: z.object({
      pitch: z.enum(["very_low", "low", "medium", "high", "very_high"]).describe("Voice pitch"),
      speed: z.enum(["very_slow", "slow", "medium", "fast", "very_fast"]).describe("Speaking speed"),
      tone: z.string().describe("Voice tone (e.g., 'gravelly', 'melodic', 'nasal', 'breathy')"),
      accent: z.string().optional().describe("Accent (e.g., 'Scottish', 'French', 'Brooklyn')"),
      quirks: z.array(z.string()).optional().describe("Speech quirks (e.g., 'stutters when nervous')"),
      description: z.string().optional().describe("Free-form voice description for more nuance"),
    }).optional().describe("Voice characteristics for TTS/voice mode"),
    imageGen: imageGenSchema.optional().describe("Image generation metadata for character portraits"),
  },
  async (params) => {
    const character = characterTools.createCharacter(params);
    return {
      content: [{ type: "text", text: JSON.stringify(character, null, 2) }],
    };
  }
);

server.tool(
  "get_character",
  "Get character details",
  {
    characterId: z.string().describe("The character ID"),
  },
  async ({ characterId }) => {
    const character = characterTools.getCharacter(characterId);
    if (!character) {
      return {
        content: [{ type: "text", text: "Character not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(character, null, 2) }],
    };
  }
);

server.tool(
  "update_character",
  "Update character attributes, skills, status, or voice",
  {
    characterId: z.string().describe("The character ID"),
    name: z.string().optional().describe("New name"),
    attributes: z.record(z.string(), z.number()).optional().describe("Attribute updates"),
    skills: z.record(z.string(), z.number()).optional().describe("Skill updates"),
    status: z.record(z.string(), z.unknown()).optional().describe("Status updates"),
    locationId: z.string().optional().describe("New location"),
    notes: z.string().optional().describe("Notes update"),
    voice: z.object({
      pitch: z.enum(["very_low", "low", "medium", "high", "very_high"]).describe("Voice pitch"),
      speed: z.enum(["very_slow", "slow", "medium", "fast", "very_fast"]).describe("Speaking speed"),
      tone: z.string().describe("Voice tone"),
      accent: z.string().optional().describe("Accent"),
      quirks: z.array(z.string()).optional().describe("Speech quirks"),
      description: z.string().optional().describe("Free-form voice description"),
    }).nullable().optional().describe("Voice characteristics (null to remove)"),
    imageGen: imageGenSchema.nullable().optional().describe("Image generation metadata (null to remove)"),
  },
  async ({ characterId, ...updates }) => {
    const character = characterTools.updateCharacter(characterId, updates);
    if (!character) {
      return {
        content: [{ type: "text", text: "Character not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(character, null, 2) }],
    };
  }
);

server.tool(
  "list_characters",
  "List characters in a session",
  {
    sessionId: z.string().describe("The session ID"),
    isPlayer: z.boolean().optional().describe("Filter by player/NPC"),
    locationId: z.string().optional().describe("Filter by location"),
  },
  async ({ sessionId, isPlayer, locationId }) => {
    const characters = characterTools.listCharacters(sessionId, { isPlayer, locationId });
    return {
      content: [{ type: "text", text: JSON.stringify(characters, null, 2) }],
    };
  }
);

server.tool(
  "move_character",
  "Move a character to a different location",
  {
    characterId: z.string().describe("The character ID"),
    locationId: z.string().describe("The destination location ID"),
  },
  async ({ characterId, locationId }) => {
    const success = characterTools.moveCharacter(characterId, locationId);
    if (!success) {
      return {
        content: [{ type: "text", text: "Failed to move character" }],
        isError: true,
      };
    }
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          characterId,
          newLocationId: locationId,
          tip: "Consider using render_map to show the player their new position, or describe the new location with ASCII art for atmosphere.",
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "apply_damage",
  "Apply damage to a character",
  {
    characterId: z.string().describe("The character ID"),
    amount: z.number().describe("Amount of damage"),
  },
  async ({ characterId, amount }) => {
    const character = characterTools.applyDamage(characterId, amount);
    if (!character) {
      return {
        content: [{ type: "text", text: "Character not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ health: character.status.health, maxHealth: character.status.maxHealth }, null, 2) }],
    };
  }
);

server.tool(
  "heal_character",
  "Heal a character",
  {
    characterId: z.string().describe("The character ID"),
    amount: z.number().describe("Amount to heal"),
  },
  async ({ characterId, amount }) => {
    const character = characterTools.heal(characterId, amount);
    if (!character) {
      return {
        content: [{ type: "text", text: "Character not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ health: character.status.health, maxHealth: character.status.maxHealth }, null, 2) }],
    };
  }
);

server.tool(
  "add_condition",
  "Add a condition to a character",
  {
    characterId: z.string().describe("The character ID"),
    condition: z.string().describe("The condition to add"),
  },
  async ({ characterId, condition }) => {
    const character = characterTools.addCondition(characterId, condition);
    if (!character) {
      return {
        content: [{ type: "text", text: "Character not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(character.status.conditions, null, 2) }],
    };
  }
);

server.tool(
  "remove_condition",
  "Remove a condition from a character",
  {
    characterId: z.string().describe("The character ID"),
    condition: z.string().describe("The condition to remove"),
  },
  async ({ characterId, condition }) => {
    const character = characterTools.removeCondition(characterId, condition);
    if (!character) {
      return {
        content: [{ type: "text", text: "Character not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(character.status.conditions, null, 2) }],
    };
  }
);

server.tool(
  "render_character_sheet",
  "Render an ASCII character sheet showing stats, health bar, attributes, skills, inventory, and conditions in a visual format",
  {
    characterId: z.string().describe("The character ID"),
  },
  async ({ characterId }) => {
    const sheetData = characterTools.renderCharacterSheet(characterId);
    if (!sheetData) {
      return {
        content: [{ type: "text", text: "Character not found" }],
        isError: true,
      };
    }
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          ascii: sheetData.ascii,
          characterId: sheetData.character.id,
          name: sheetData.character.name,
          locationName: sheetData.locationName,
          inventoryCount: sheetData.inventory.length,
          instruction: "Display the ASCII character sheet to the player. Use this to give players a visual overview of their character status.",
        }, null, 2),
      }],
    };
  }
);

// ============================================================================
// DICE & CHECK TOOLS
// ============================================================================

server.tool(
  "roll",
  "Roll dice using standard notation",
  {
    expression: z.string().describe("Dice expression (e.g., '2d6+3', '1d20', '4d6-2')"),
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
    sessionId: z.string().describe("The session ID"),
    characterId: z.string().describe("The character making the check"),
    skill: z.string().optional().describe("Skill to use"),
    attribute: z.string().optional().describe("Attribute to use"),
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
    sessionId: z.string().describe("The session ID"),
    attackerId: z.string().describe("First character ID"),
    defenderId: z.string().describe("Second character ID"),
    attackerSkill: z.string().optional().describe("Skill for first character"),
    defenderSkill: z.string().optional().describe("Skill for second character"),
    attackerAttribute: z.string().optional().describe("Attribute for first character"),
    defenderAttribute: z.string().optional().describe("Attribute for second character"),
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
    sessionId: z.string().describe("The session ID"),
    locationId: z.string().describe("Location where combat occurs"),
    participantIds: z.array(z.string()).describe("Character IDs of all combatants"),
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
    combatId: z.string().describe("The combat ID"),
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
    sessionId: z.string().describe("The session ID"),
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
    combatId: z.string().describe("The combat ID"),
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
    combatId: z.string().describe("The combat ID"),
    entry: z.string().describe("Log entry text"),
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
    combatId: z.string().describe("The combat ID"),
    characterId: z.string().describe("The character to remove"),
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
    combatId: z.string().describe("The combat ID"),
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

// ============================================================================
// INVENTORY TOOLS
// ============================================================================

server.tool(
  "create_item",
  "Create a new item",
  {
    sessionId: z.string().describe("The session ID"),
    ownerId: z.string().describe("Character or location ID that owns the item"),
    ownerType: z.enum(["character", "location"]).describe("Owner type"),
    name: z.string().describe("Item name"),
    properties: z.object({
      description: z.string().optional(),
      type: z.string().optional(),
      weight: z.number().optional(),
      value: z.number().optional(),
      effects: z.array(z.string()).optional(),
    }).optional().describe("Item properties"),
    imageGen: imageGenSchema.optional().describe("Image generation metadata for item art"),
  },
  async (params) => {
    const item = inventoryTools.createItem(params);
    return {
      content: [{ type: "text", text: JSON.stringify(item, null, 2) }],
    };
  }
);

server.tool(
  "get_item",
  "Get item details",
  {
    itemId: z.string().describe("The item ID"),
  },
  async ({ itemId }) => {
    const item = inventoryTools.getItem(itemId);
    if (!item) {
      return {
        content: [{ type: "text", text: "Item not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(item, null, 2) }],
    };
  }
);

server.tool(
  "update_item",
  "Update an item",
  {
    itemId: z.string().describe("The item ID"),
    name: z.string().optional().describe("New name"),
    properties: z.record(z.string(), z.unknown()).optional().describe("Property updates"),
    imageGen: imageGenSchema.nullable().optional().describe("Image generation metadata (null to remove)"),
  },
  async ({ itemId, name, properties, imageGen }) => {
    const item = inventoryTools.updateItem(itemId, { name, properties, imageGen });
    if (!item) {
      return {
        content: [{ type: "text", text: "Item not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(item, null, 2) }],
    };
  }
);

server.tool(
  "delete_item",
  "Delete an item",
  {
    itemId: z.string().describe("The item ID"),
  },
  async ({ itemId }) => {
    const success = inventoryTools.deleteItem(itemId);
    return {
      content: [{ type: "text", text: success ? "Item deleted" : "Item not found" }],
      isError: !success,
    };
  }
);

server.tool(
  "transfer_item",
  "Transfer an item to a new owner",
  {
    itemId: z.string().describe("The item ID"),
    newOwnerId: z.string().describe("New owner ID"),
    newOwnerType: z.enum(["character", "location"]).describe("New owner type"),
  },
  async ({ itemId, newOwnerId, newOwnerType }) => {
    const item = inventoryTools.transferItem(itemId, newOwnerId, newOwnerType);
    if (!item) {
      return {
        content: [{ type: "text", text: "Item not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(item, null, 2) }],
    };
  }
);

server.tool(
  "get_inventory",
  "Get inventory for a character or location",
  {
    ownerId: z.string().describe("Owner ID"),
    ownerType: z.enum(["character", "location"]).describe("Owner type"),
  },
  async ({ ownerId, ownerType }) => {
    const items = inventoryTools.getInventory(ownerId, ownerType);
    return {
      content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
    };
  }
);

// ============================================================================
// QUEST TOOLS
// ============================================================================

server.tool(
  "create_quest",
  "Create a new quest",
  {
    sessionId: z.string().describe("The session ID"),
    name: z.string().describe("Quest name"),
    description: z.string().describe("Quest description"),
    objectives: z.array(z.object({
      description: z.string(),
      completed: z.boolean().optional(),
      optional: z.boolean().optional(),
    })).describe("Quest objectives"),
    rewards: z.string().optional().describe("Quest rewards"),
  },
  async (params) => {
    const quest = questTools.createQuest({
      ...params,
      objectives: params.objectives.map((obj) => ({
        description: obj.description,
        completed: obj.completed ?? false,
        optional: obj.optional,
      })),
    });
    return {
      content: [{ type: "text", text: JSON.stringify(quest, null, 2) }],
    };
  }
);

server.tool(
  "get_quest",
  "Get quest details",
  {
    questId: z.string().describe("The quest ID"),
  },
  async ({ questId }) => {
    const quest = questTools.getQuest(questId);
    if (!quest) {
      return {
        content: [{ type: "text", text: "Quest not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(quest, null, 2) }],
    };
  }
);

server.tool(
  "update_quest",
  "Update a quest",
  {
    questId: z.string().describe("The quest ID"),
    name: z.string().optional().describe("New name"),
    description: z.string().optional().describe("New description"),
    status: z.enum(["active", "completed", "failed", "abandoned"]).optional().describe("New status"),
    rewards: z.string().optional().describe("Updated rewards"),
  },
  async ({ questId, ...updates }) => {
    const quest = questTools.updateQuest(questId, updates);
    if (!quest) {
      return {
        content: [{ type: "text", text: "Quest not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(quest, null, 2) }],
    };
  }
);

server.tool(
  "complete_objective",
  "Mark a quest objective as completed",
  {
    questId: z.string().describe("The quest ID"),
    objectiveId: z.string().describe("The objective ID"),
  },
  async ({ questId, objectiveId }) => {
    const quest = questTools.completeObjective(questId, objectiveId);
    if (!quest) {
      return {
        content: [{ type: "text", text: "Quest not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(quest, null, 2) }],
    };
  }
);

server.tool(
  "add_objective",
  "Add a new objective to a quest",
  {
    questId: z.string().describe("The quest ID"),
    description: z.string().describe("Objective description"),
    optional: z.boolean().optional().describe("Is this objective optional?"),
  },
  async ({ questId, description, optional }) => {
    const quest = questTools.addObjective(questId, { description, completed: false, optional });
    if (!quest) {
      return {
        content: [{ type: "text", text: "Quest not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(quest, null, 2) }],
    };
  }
);

server.tool(
  "list_quests",
  "List quests in a session",
  {
    sessionId: z.string().describe("The session ID"),
    status: z.enum(["active", "completed", "failed", "abandoned"]).optional().describe("Filter by status"),
  },
  async ({ sessionId, status }) => {
    const quests = questTools.listQuests(sessionId, status ? { status } : undefined);
    return {
      content: [{ type: "text", text: JSON.stringify(quests, null, 2) }],
    };
  }
);

// ============================================================================
// NARRATIVE TOOLS
// ============================================================================

server.tool(
  "log_event",
  "Log a narrative event",
  {
    sessionId: z.string().describe("The session ID"),
    eventType: z.string().describe("Type of event (e.g., 'dialogue', 'action', 'discovery', 'combat')"),
    content: z.string().describe("Event content/description"),
    metadata: z.record(z.string(), z.unknown()).optional().describe("Additional metadata"),
  },
  async (params) => {
    const event = narrativeTools.logEvent(params);
    return {
      content: [{ type: "text", text: JSON.stringify(event, null, 2) }],
    };
  }
);

server.tool(
  "get_history",
  "Get narrative history",
  {
    sessionId: z.string().describe("The session ID"),
    limit: z.number().optional().describe("Maximum events to return"),
    eventType: z.string().optional().describe("Filter by event type"),
    since: z.string().optional().describe("Only events after this timestamp"),
  },
  async ({ sessionId, limit, eventType, since }) => {
    const events = narrativeTools.getHistory(sessionId, { limit, eventType, since });
    return {
      content: [{ type: "text", text: JSON.stringify(events, null, 2) }],
    };
  }
);

server.tool(
  "get_summary",
  "Get a summary of the narrative so far",
  {
    sessionId: z.string().describe("The session ID"),
  },
  async ({ sessionId }) => {
    const summary = narrativeTools.getSummary(sessionId);
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
    };
  }
);

server.tool(
  "get_export_styles",
  "Get available narrative styles for story export",
  {},
  async () => {
    const styles = [
      { id: "literary-fiction", name: "Literary Fiction", description: "Sophisticated prose with deep character introspection" },
      { id: "pulp-adventure", name: "Pulp Adventure", description: "Fast-paced action with bold heroes and cliffhangers" },
      { id: "epic-fantasy", name: "Epic Fantasy", description: "Grand, sweeping narrative with mythic undertones" },
      { id: "noir", name: "Noir", description: "Hardboiled prose with moral ambiguity" },
      { id: "horror", name: "Horror", description: "Atmospheric dread and tension" },
      { id: "comedic", name: "Comedic", description: "Witty and humorous with clever dialogue" },
      { id: "young-adult", name: "Young Adult", description: "Accessible and engaging with relatable characters" },
      { id: "screenplay", name: "Screenplay", description: "Formatted as a film script" },
      { id: "journal", name: "Journal/Diary", description: "Personal entries from protagonist's perspective" },
      { id: "chronicle", name: "Chronicle", description: "Historical documentation with a sense of legacy" },
    ];
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          styles,
          instruction: "Present these style options to the player and let them choose how their story should be written.",
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "export_story",
  "Export the game history as structured data for reconstruction into a narrative book. Use get_chapter_for_export to fetch individual chapters for writing.",
  {
    sessionId: z.string().describe("The session ID"),
    style: z.string().describe("Narrative style (e.g., 'literary-fiction', 'pulp-adventure', 'epic-fantasy', 'noir', or custom)"),
  },
  async ({ sessionId, style }) => {
    const exportData = narrativeTools.exportStoryData(sessionId, style);
    if (!exportData) {
      return {
        content: [{ type: "text", text: "Session not found" }],
        isError: true,
      };
    }

    // Create chapter summaries for the overview (without full event data)
    const chapterSummaries = exportData.chapters.map((ch, idx) => ({
      chapterNumber: idx + 1,
      title: ch.title,
      eventCount: ch.events.length,
      eventTypes: [...new Set(ch.events.map(e => e.eventType))],
      timeSpan: ch.events.length > 0 ? {
        start: ch.events[0].timestamp,
        end: ch.events[ch.events.length - 1].timestamp,
      } : null,
    }));

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          session: exportData.session,
          characters: exportData.characters,
          locations: exportData.locations,
          quests: exportData.quests,
          chapterSummaries,
          totalChapters: exportData.chapters.length,
          totalEvents: exportData.totalEvents,
          exportStyle: exportData.exportStyle,
          instruction: exportData.instruction,
          meta: {
            exportedAt: new Date().toISOString(),
            workflow: [
              "1. Review the session, characters, locations, and quests for context",
              "2. For each chapter, use get_chapter_for_export to fetch the full event data",
              "3. Spawn a subagent for each chapter with the style instruction and chapter data",
              "4. Each subagent writes its chapter as narrative prose",
              "5. Combine chapters into the final book with front matter",
            ],
          },
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "get_chapter_for_export",
  "Get a single chapter's full event data for writing. Use this to fetch chapters one at a time for subagent processing.",
  {
    sessionId: z.string().describe("The session ID"),
    chapterNumber: z.number().describe("Chapter number (1-indexed)"),
    style: z.string().describe("Narrative style for the instruction"),
  },
  async ({ sessionId, chapterNumber, style }) => {
    const exportData = narrativeTools.exportStoryData(sessionId, style);
    if (!exportData) {
      return {
        content: [{ type: "text", text: "Session not found" }],
        isError: true,
      };
    }

    const chapterIndex = chapterNumber - 1;
    if (chapterIndex < 0 || chapterIndex >= exportData.chapters.length) {
      return {
        content: [{ type: "text", text: `Chapter ${chapterNumber} not found. Total chapters: ${exportData.chapters.length}` }],
        isError: true,
      };
    }

    const chapter = exportData.chapters[chapterIndex];

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          chapterNumber,
          totalChapters: exportData.chapters.length,
          title: chapter.title,
          events: chapter.events,
          context: {
            sessionName: exportData.session.name,
            setting: exportData.session.setting,
            style: exportData.exportStyle,
          },
          instruction: exportData.instruction,
          subagentPrompt: `You are writing Chapter ${chapterNumber} of "${exportData.session.name}". ${exportData.instruction} Transform the following events into engaging narrative prose. Maintain consistency with the ${exportData.session.setting} setting.`,
        }, null, 2),
      }],
    };
  }
);

// ============================================================================
// PLAYER INTERACTION TOOLS
// ============================================================================

server.tool(
  "present_choices",
  "Present choices to the player with multi-select and free-form input support. Returns structured choice data for the DM agent to display.",
  {
    sessionId: z.string().describe("The session ID"),
    prompt: z.string().describe("The question or situation description to present"),
    choices: z.array(z.object({
      id: z.string().describe("Unique identifier for this choice"),
      label: z.string().describe("Short label for the choice (1-5 words)"),
      description: z.string().describe("Fuller description of what this choice means"),
      consequences: z.string().optional().describe("Hint at consequences (optional, for DM reference)"),
    })).min(1).max(6).describe("Available choices (1-6 options)"),
    allowMultiple: z.boolean().optional().describe("Allow selecting multiple choices (default: false)"),
    allowFreeform: z.boolean().optional().describe("Allow player to type a custom response (default: true)"),
    freeformPlaceholder: z.string().optional().describe("Placeholder text for free-form input (default: 'Or describe what you want to do...')"),
    context: z.object({
      locationId: z.string().optional(),
      characterIds: z.array(z.string()).optional(),
      urgency: z.enum(["low", "medium", "high", "critical"]).optional(),
    }).optional().describe("Context for the choice"),
  },
  async ({ sessionId, prompt, choices, allowMultiple, allowFreeform, freeformPlaceholder, context }) => {
    // Log this as a narrative event
    narrativeTools.logEvent({
      sessionId,
      eventType: "choice_presented",
      content: prompt,
      metadata: { choices, allowMultiple, allowFreeform, context },
    });

    // Return structured choice data for the agent to present via its UI
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          type: "player_choice",
          prompt,
          choices,
          allowMultiple: allowMultiple ?? false,
          allowFreeform: allowFreeform ?? true,
          freeformPlaceholder: freeformPlaceholder ?? "Or describe what you want to do...",
          context,
          instruction: "Present these choices to the player. Use AskUserQuestion - players can always select 'Other' to provide free-form input.",
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "record_choice",
  "Record the player's choice after they've selected",
  {
    sessionId: z.string().describe("The session ID"),
    choiceIds: z.array(z.string()).describe("The ID(s) of the choice(s) the player selected"),
    customResponse: z.string().optional().describe("If player chose 'Other', their custom response"),
  },
  async ({ sessionId, choiceIds, customResponse }) => {
    const event = narrativeTools.logEvent({
      sessionId,
      eventType: "choice_made",
      content: customResponse || `Player chose: ${choiceIds.join(", ")}`,
      metadata: { choiceIds, customResponse },
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          recorded: true,
          choiceIds,
          customResponse,
          event,
        }, null, 2),
      }],
    };
  }
);

// ============================================================================
// RESOURCE TOOLS
// ============================================================================

server.tool(
  "create_resource",
  "Create a new resource (currency, reputation, counter, etc.)",
  {
    sessionId: z.string().describe("The session ID"),
    ownerType: z.enum(["session", "character"]).describe("Owner type: 'session' for party/global resources, 'character' for personal resources"),
    ownerId: z.string().optional().describe("Character ID if ownerType is 'character' (omit for session-level resources)"),
    name: z.string().describe("Resource name (e.g., 'Gold', 'Sanity', 'Thieves Guild Reputation')"),
    description: z.string().optional().describe("Resource description"),
    category: z.string().optional().describe("Category for grouping (e.g., 'currency', 'reputation', 'pool', 'counter')"),
    value: z.number().optional().describe("Initial value (default: 0)"),
    minValue: z.number().optional().describe("Minimum bound (null for unbounded)"),
    maxValue: z.number().optional().describe("Maximum bound (null for unbounded)"),
  },
  async (params) => {
    const resource = resourceTools.createResource(params);
    return {
      content: [{ type: "text", text: JSON.stringify(resource, null, 2) }],
    };
  }
);

server.tool(
  "get_resource",
  "Get resource details",
  {
    resourceId: z.string().describe("The resource ID"),
  },
  async ({ resourceId }) => {
    const resource = resourceTools.getResource(resourceId);
    if (!resource) {
      return {
        content: [{ type: "text", text: "Resource not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(resource, null, 2) }],
    };
  }
);

server.tool(
  "update_resource",
  "Update resource metadata (name, description, category, bounds)",
  {
    resourceId: z.string().describe("The resource ID"),
    name: z.string().optional().describe("New name"),
    description: z.string().optional().describe("New description"),
    category: z.string().nullable().optional().describe("New category (null to clear)"),
    minValue: z.number().nullable().optional().describe("New minimum bound (null for unbounded)"),
    maxValue: z.number().nullable().optional().describe("New maximum bound (null for unbounded)"),
  },
  async ({ resourceId, ...updates }) => {
    const resource = resourceTools.updateResource(resourceId, updates);
    if (!resource) {
      return {
        content: [{ type: "text", text: "Resource not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(resource, null, 2) }],
    };
  }
);

server.tool(
  "delete_resource",
  "Delete a resource and its history",
  {
    resourceId: z.string().describe("The resource ID"),
  },
  async ({ resourceId }) => {
    const success = resourceTools.deleteResource(resourceId);
    return {
      content: [{ type: "text", text: success ? "Resource deleted" : "Resource not found" }],
      isError: !success,
    };
  }
);

server.tool(
  "list_resources",
  "List resources in a session",
  {
    sessionId: z.string().describe("The session ID"),
    ownerType: z.enum(["session", "character"]).optional().describe("Filter by owner type"),
    ownerId: z.string().optional().describe("Filter by owner ID (for character resources)"),
    category: z.string().optional().describe("Filter by category"),
  },
  async ({ sessionId, ownerType, ownerId, category }) => {
    const resources = resourceTools.listResources(sessionId, { ownerType, ownerId, category });
    return {
      content: [{ type: "text", text: JSON.stringify(resources, null, 2) }],
    };
  }
);

server.tool(
  "modify_resource",
  "Add or subtract from a resource value (with clamping and history logging)",
  {
    resourceId: z.string().describe("The resource ID"),
    delta: z.number().describe("Amount to add (positive) or subtract (negative)"),
    reason: z.string().optional().describe("Reason for the change (logged to history)"),
  },
  async (params) => {
    const result = resourceTools.modifyResource(params);
    if (!result) {
      return {
        content: [{ type: "text", text: "Resource not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "set_resource",
  "Set a resource to a specific value (with clamping and history logging)",
  {
    resourceId: z.string().describe("The resource ID"),
    value: z.number().describe("New value to set"),
    reason: z.string().optional().describe("Reason for the change (logged to history)"),
  },
  async (params) => {
    const result = resourceTools.setResource(params);
    if (!result) {
      return {
        content: [{ type: "text", text: "Resource not found" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "get_resource_history",
  "Get change history for a resource",
  {
    resourceId: z.string().describe("The resource ID"),
    limit: z.number().optional().describe("Maximum number of entries to return"),
  },
  async ({ resourceId, limit }) => {
    const history = resourceTools.getResourceHistory(resourceId, limit);
    return {
      content: [{ type: "text", text: JSON.stringify(history, null, 2) }],
    };
  }
);

// ============================================================================
// START SERVER
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Handle cleanup
process.on("SIGINT", () => {
  closeDatabase();
  process.exit(0);
});

process.on("SIGTERM", () => {
  closeDatabase();
  process.exit(0);
});

main().catch((error) => {
  console.error("Server error:", error);
  closeDatabase();
  process.exit(1);
});
