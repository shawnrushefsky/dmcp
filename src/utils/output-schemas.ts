import { z } from "zod";

/**
 * Shared output schemas for MCP tools.
 * These enable clients to validate structured outputs from tools.
 */

// ============================================================================
// COMMON RESPONSE PATTERNS
// ============================================================================

/** Simple success/failure response */
export const successResponseSchema = {
  success: z.boolean(),
  message: z.string().optional(),
};

/** Simple text result */
export const textResultSchema = {
  result: z.string(),
};

/** Entity deleted response */
export const deletedResponseSchema = {
  deleted: z.boolean(),
  id: z.string().optional(),
};

/** List response with count */
export const listResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) => ({
  items: z.array(itemSchema),
  count: z.number(),
});

// ============================================================================
// SESSION SCHEMAS
// ============================================================================

export const sessionOutputSchema = {
  id: z.string(),
  name: z.string(),
  setting: z.string(),
  style: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  webUi: z.object({
    url: z.string(),
    message: z.string(),
  }).optional(),
};

export const sessionStateOutputSchema = {
  session: z.object({
    id: z.string(),
    name: z.string(),
    setting: z.string(),
    style: z.string(),
  }),
  characterCount: z.number(),
  locationCount: z.number(),
  activeQuests: z.number(),
  activeCombat: z.boolean(),
};

export const gameMenuOutputSchema = {
  hasExistingGames: z.boolean(),
  sessions: z.array(z.object({
    id: z.string(),
    name: z.string(),
    setting: z.string(),
    style: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    webUiUrl: z.string().optional(),
  })),
  instruction: z.string(),
  webUi: z.object({
    baseUrl: z.string(),
    message: z.string(),
  }).optional(),
};

// ============================================================================
// CHARACTER SCHEMAS
// ============================================================================

export const characterStatusSchema = z.object({
  health: z.number(),
  maxHealth: z.number(),
  conditions: z.array(z.string()),
  experience: z.number(),
  level: z.number(),
});

export const characterOutputSchema = {
  id: z.string(),
  sessionId: z.string(),
  name: z.string(),
  isPlayer: z.boolean(),
  attributes: z.record(z.string(), z.number()),
  skills: z.record(z.string(), z.number()),
  status: characterStatusSchema,
  locationId: z.string().nullable(),
  notes: z.string(),
  createdAt: z.string(),
};

export const characterListOutputSchema = {
  characters: z.array(z.object({
    id: z.string(),
    name: z.string(),
    isPlayer: z.boolean(),
    status: characterStatusSchema,
    locationId: z.string().nullable(),
  })),
  count: z.number(),
};

// ============================================================================
// LOCATION SCHEMAS
// ============================================================================

export const exitSchema = z.object({
  direction: z.string(),
  destinationId: z.string(),
  description: z.string().optional(),
  locked: z.boolean().optional(),
  hidden: z.boolean().optional(),
});

export const locationOutputSchema = {
  id: z.string(),
  sessionId: z.string(),
  name: z.string(),
  description: z.string(),
  properties: z.object({
    exits: z.array(exitSchema),
    features: z.array(z.string()),
    atmosphere: z.string(),
  }),
};

export const locationListOutputSchema = {
  locations: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
  })),
  count: z.number(),
};

// ============================================================================
// QUEST SCHEMAS
// ============================================================================

export const questObjectiveSchema = z.object({
  id: z.string(),
  description: z.string(),
  completed: z.boolean(),
  optional: z.boolean().optional(),
});

export const questOutputSchema = {
  id: z.string(),
  sessionId: z.string(),
  name: z.string(),
  description: z.string(),
  objectives: z.array(questObjectiveSchema),
  status: z.enum(["active", "completed", "failed", "abandoned"]),
  rewards: z.string().optional(),
};

// ============================================================================
// COMBAT SCHEMAS
// ============================================================================

export const combatParticipantSchema = z.object({
  characterId: z.string(),
  initiative: z.number(),
  isActive: z.boolean(),
});

export const combatOutputSchema = {
  id: z.string(),
  sessionId: z.string(),
  locationId: z.string(),
  participants: z.array(combatParticipantSchema),
  currentTurn: z.number(),
  round: z.number(),
  status: z.enum(["active", "resolved"]),
  log: z.array(z.string()),
};

// ============================================================================
// DICE SCHEMAS
// ============================================================================

export const diceRollOutputSchema = {
  expression: z.string(),
  rolls: z.array(z.number()),
  modifier: z.number(),
  total: z.number(),
};

export const checkResultOutputSchema = {
  roll: z.object({
    expression: z.string(),
    rolls: z.array(z.number()),
    modifier: z.number(),
    total: z.number(),
  }),
  modifier: z.number(),
  total: z.number(),
  difficulty: z.number(),
  success: z.boolean(),
  criticalSuccess: z.boolean(),
  criticalFailure: z.boolean(),
  margin: z.number(),
};

// ============================================================================
// ITEM SCHEMAS
// ============================================================================

export const itemOutputSchema = {
  id: z.string(),
  sessionId: z.string(),
  ownerId: z.string(),
  ownerType: z.enum(["character", "location"]),
  name: z.string(),
  properties: z.object({
    description: z.string(),
    type: z.string(),
    weight: z.number().optional(),
    value: z.number().optional(),
    effects: z.array(z.string()).optional(),
  }),
};

export const inventoryOutputSchema = {
  ownerId: z.string(),
  ownerType: z.enum(["character", "location"]),
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    properties: z.object({
      description: z.string(),
      type: z.string(),
    }),
  })),
  count: z.number(),
};

// ============================================================================
// NARRATIVE SCHEMAS
// ============================================================================

export const narrativeEventOutputSchema = {
  id: z.string(),
  sessionId: z.string(),
  eventType: z.string(),
  content: z.string(),
  timestamp: z.string(),
};

export const narrativeSummaryOutputSchema = {
  totalEvents: z.number(),
  firstEvent: z.string().nullable(),
  lastEvent: z.string().nullable(),
  eventTypes: z.record(z.string(), z.number()),
  recentEvents: z.array(z.object({
    id: z.string(),
    eventType: z.string(),
    content: z.string(),
    timestamp: z.string(),
  })),
};

// ============================================================================
// MAP SCHEMAS
// ============================================================================

export const mapOutputSchema = {
  ascii: z.string(),
  legend: z.record(z.string(), z.string()).optional(),
  playerLocation: z.string().optional(),
};

// ============================================================================
// RESOURCE SCHEMAS
// ============================================================================

export const resourceOutputSchema = {
  id: z.string(),
  sessionId: z.string(),
  ownerId: z.string().nullable(),
  ownerType: z.enum(["session", "character"]),
  name: z.string(),
  description: z.string(),
  category: z.string().nullable(),
  value: z.number(),
  minValue: z.number().nullable(),
  maxValue: z.number().nullable(),
};

// ============================================================================
// CONDITION/STATUS EFFECT SCHEMAS
// ============================================================================

export const conditionModifyOutputSchema = {
  characterId: z.string(),
  characterName: z.string(),
  conditions: z.array(z.string()),
  action: z.enum(["added", "removed", "modified"]),
  added: z.array(z.string()),
  removed: z.array(z.string()),
};

export const statusEffectOutputSchema = {
  id: z.string(),
  targetId: z.string(),
  name: z.string(),
  description: z.string(),
  effectType: z.enum(["buff", "debuff", "neutral"]).nullable(),
  duration: z.number().nullable(),
  stacks: z.number(),
};

// ============================================================================
// TAG SCHEMAS
// ============================================================================

export const tagModifyOutputSchema = {
  entityId: z.string(),
  entityType: z.string(),
  tags: z.array(z.string()),
  action: z.enum(["added", "removed"]),
  tag: z.string(),
};

// ============================================================================
// IMAGE SCHEMAS
// ============================================================================

export const storedImageOutputSchema = {
  id: z.string(),
  sessionId: z.string(),
  entityId: z.string(),
  entityType: z.enum(["character", "location", "item", "scene"]),
  fileSize: z.number(),
  mimeType: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  label: z.string().nullable(),
  isPrimary: z.boolean(),
  createdAt: z.string(),
};
