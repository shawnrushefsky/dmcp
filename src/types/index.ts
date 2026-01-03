// Game types
export interface Game {
  id: string;
  name: string;
  setting: string;
  style: string;
  rules: RuleSystem | null;
  preferences: GamePreferences | null;
  currentLocationId: string | null;
  titleImageId: string | null;
  faviconImageId: string | null;
  createdAt: string;
  updatedAt: string;
}

// Lightweight game summary for listing (no rules/preferences)
export interface GameSummary {
  id: string;
  name: string;
  setting: string;
  style: string;
  titleImageId: string | null;
  faviconImageId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GamePreferences {
  // Core game identity
  genre: PreferenceValue<string>;
  tone: PreferenceValue<string>;
  setting: PreferenceValue<string>;

  // Mechanical preferences
  complexity: PreferenceValue<string>;
  combatFrequency: PreferenceValue<string>;
  combatStyle: PreferenceValue<string>;
  lethality: PreferenceValue<string>;

  // Narrative preferences
  narrativeStyle: PreferenceValue<string>;
  playerAgency: PreferenceValue<string>;
  npcDepth: PreferenceValue<string>;
  romanceContent: PreferenceValue<string>;

  // World building
  worldFamiliarity: PreferenceValue<string>;
  magicOrTechLevel: PreferenceValue<string>;
  politicalComplexity: PreferenceValue<string>;

  // Session preferences
  sessionLength: PreferenceValue<string>;
  pacingPreference: PreferenceValue<string>;

  // Content boundaries
  contentToAvoid: string[];
  contentToInclude: string[];

  // Inspiration
  inspirations: string[];

  // Character preferences
  characterCreation: PreferenceValue<string>;
  startingPowerLevel: PreferenceValue<string>;

  // Custom notes
  additionalNotes: string;

  // Image generation presets collection (optional)
  // Each preset can be for different use cases: portraits, locations, items with text, etc.
  imageGenerationPresets?: ImageGenerationPreset[];

  // Which preset to use by default
  defaultImagePresetId?: string;

  // Image prompt templates - configurable templates for building prompts from entity data
  imagePromptTemplates?: ImagePromptTemplate[];
}

// Image generation preset - a named collection of settings for a specific use case
export interface ImageGenerationPreset {
  id: string;                              // Unique identifier
  name: string;                            // Human-readable name (e.g., "Character Portraits", "Location Art")
  description?: string;                    // What this preset is for
  entityTypes?: ("character" | "location" | "item" | "scene" | "faction")[]; // Which entity types this preset is best for
  isDefault?: boolean;                     // Whether this is the default preset
  config: ImageGenerationPreferences;      // The actual settings
  createdAt?: string;
  updatedAt?: string;
}

// Image prompt template - configurable template for building prompts from structured data
export interface ImagePromptTemplate {
  id: string;
  name: string;                              // Human-readable name (e.g., "Fantasy Character Portrait")
  description?: string;                      // What this template is for
  entityType: "character" | "location" | "item" | "faction"; // Which entity type this template handles

  // Template strings with placeholders
  // Placeholders use mustache-like syntax: {{field.path}} or {{field.path|"default"}}
  // Examples: {{subject.primaryDescription}}, {{subject.physicalTraits.gender|"person"}}
  promptTemplate: string;                    // Main positive prompt template
  negativePromptTemplate?: string;           // Negative prompt template

  // Optional prefix/suffix that wrap the filled template
  promptPrefix?: string;                     // Added before the filled template
  promptSuffix?: string;                     // Added after the filled template (quality tags, etc.)

  // Field mappings for custom paths (optional)
  // Allows aliasing complex paths to simple names
  fieldAliases?: Record<string, string>;     // e.g., {"gender": "subject.physicalTraits.gender"}

  // Default values for missing fields
  defaults?: Record<string, string>;         // e.g., {"gender": "person", "mood": "neutral"}

  // Priority when multiple templates match (higher = preferred)
  priority?: number;

  // Whether this is the default template for its entity type
  isDefault?: boolean;

  createdAt?: string;
  updatedAt?: string;
}

// Image generation preferences (settings within a preset)
export interface ImageGenerationPreferences {
  // Default tool/service to use
  defaultTool?: "dalle" | "sdxl" | "midjourney" | "comfyui" | "flux" | "other";

  // Default style settings (applied to all images unless overridden)
  defaultStyle?: {
    artisticStyle?: string;     // "digital painting", "oil painting", "anime", etc.
    mood?: string;              // "dark", "epic", "whimsical", etc.
    colorScheme?: string;       // "warm", "cold", "muted", "vibrant"
    qualityTags?: string[];     // ["highly detailed", "8k", "masterpiece"]
    negativePrompts?: string[]; // Things to avoid globally
    influences?: string[];      // Artist/game/movie style references
  };

  // ComfyUI-specific settings
  comfyui?: {
    // Endpoint configuration
    endpoint?: string;          // ComfyUI server URL

    // Model settings
    checkpoint?: string;        // Default checkpoint model
    loras?: Array<{
      name: string;
      weight: number;
    }>;

    // Sampler defaults
    samplerSettings?: {
      sampler?: string;         // "euler_a", "dpm++_2m_sde", etc.
      scheduler?: string;       // "karras", "normal", etc.
      steps?: number;
      cfg?: number;
    };

    // Workflow templates - full ComfyUI workflow JSON
    // These can be exported from ComfyUI and stored here for reuse
    workflows?: Record<string, {
      name: string;                           // Human-readable name
      description?: string;                   // What this workflow does
      workflow: Record<string, unknown>;      // The full ComfyUI workflow JSON (API format)
      // Node IDs for dynamic value injection
      inputNodes?: {
        positivePrompt?: string;              // Node ID for positive prompt input
        negativePrompt?: string;              // Node ID for negative prompt input
        checkpoint?: string;                  // Node ID for checkpoint loader
        seed?: string;                        // Node ID for seed/noise
        width?: string;                       // Node ID for width
        height?: string;                      // Node ID for height
        steps?: string;                       // Node ID for steps
        cfg?: string;                         // Node ID for CFG scale
        sampler?: string;                     // Node ID for sampler
        scheduler?: string;                   // Node ID for scheduler
      };
    }>;

    // Which workflow to use by default
    defaultWorkflowId?: string;

    // Legacy: simple workflow name reference
    defaultWorkflow?: string;   // Workflow name or ID
    workflowOverrides?: Record<string, unknown>; // Custom workflow node values
  };

  // DALL-E specific settings
  dalle?: {
    model?: string;             // "dall-e-3", "dall-e-2"
    quality?: "standard" | "hd";
    style?: "vivid" | "natural";
    size?: "1024x1024" | "1792x1024" | "1024x1792";
  };

  // Midjourney specific settings
  midjourney?: {
    version?: string;           // "v5", "v6", "niji"
    stylize?: number;           // 0-1000
    chaos?: number;             // 0-100
    quality?: number;           // 0.25, 0.5, 1, 2
    aspectRatio?: string;       // "1:1", "16:9", "2:3", etc.
  };

  // Stable Diffusion / SDXL settings
  sdxl?: {
    model?: string;             // Model ID or path
    samplerName?: string;
    steps?: number;
    cfg?: number;
    width?: number;
    height?: number;
    negativePrompt?: string;
  };

  // Flux settings
  flux?: {
    model?: string;             // "schnell", "dev", "pro"
    steps?: number;
    guidance?: number;
  };

  // Generation defaults
  defaults?: {
    aspectRatio?: string;       // Default aspect ratio for images
    generateOnCreate?: boolean; // Auto-generate images when entities are created
    savePrompts?: boolean;      // Store prompts with entities
    framing?: {
      character?: string;       // Default framing for character portraits
      location?: string;        // Default framing for location scenes
      item?: string;            // Default framing for item images
    };
  };

  // Consistency settings
  consistency?: {
    maintainColorPalette?: boolean;
    characterSeedImages?: Record<string, string>; // characterId -> seed image
    styleReferenceImage?: string; // Game-wide style reference
    useCharacterRefs?: boolean;  // Use existing character images as reference
  };

  // Custom notes for the DM
  notes?: string;
}

export interface PreferenceValue<T> {
  value: T | null;
  delegatedToDM: boolean;
  notes?: string;
}

// Helper type for interview questions
export interface InterviewQuestion {
  id: keyof GamePreferences;
  category: string;
  question: string;
  description: string;
  options?: { value: string; label: string; description: string }[];
  allowFreeform: boolean;
  allowDelegate: boolean;
  delegateLabel?: string;
}

// Image generation types
export interface ImageGeneration {
  // Structured visual description (tool-agnostic)
  subject: SubjectDescription;
  style: StyleDescription;
  composition: CompositionDescription;

  // Generated prompt cache for different tools
  prompts?: {
    generic?: string;        // Plain English description
    sdxl?: string;           // Stable Diffusion XL optimized
    dalle?: string;          // DALL-E optimized
    midjourney?: string;     // Midjourney style
    flux?: string;           // Flux model optimized
    comfyui?: ComfyUIPrompt; // ComfyUI workflow-ready
  };

  // Generated images history
  generations?: GeneratedImage[];

  // Reference/consistency anchors
  consistency?: {
    characterRef?: string;   // Reference to another character for style matching
    seedImage?: string;      // Base64 or URL for img2img
    colorPalette?: string[]; // Hex colors to maintain
    styleRef?: string;       // Reference image for style
  };
}

export interface SubjectDescription {
  type: "character" | "location" | "item" | "scene";
  primaryDescription: string;  // Core visual description

  // Character-specific
  physicalTraits?: {
    age?: string;
    gender?: string;
    bodyType?: string;
    height?: string;
    skinTone?: string;
    hairColor?: string;
    hairStyle?: string;
    eyeColor?: string;
    facialFeatures?: string;
    distinguishingMarks?: string[];  // Scars, tattoos, etc.
  };

  // Clothing/equipment
  attire?: {
    description: string;
    colors?: string[];
    materials?: string[];
    accessories?: string[];
  };

  // Location-specific
  environment?: {
    setting: string;         // Indoor, outdoor, underground, etc.
    timeOfDay?: string;
    weather?: string;
    lighting?: string;
    architecture?: string;
    vegetation?: string;
    notableFeatures?: string[];
  };

  // Item-specific
  objectDetails?: {
    material?: string;
    size?: string;
    condition?: string;
    glowOrEffects?: string;
  };

  // Pose/action (for characters)
  pose?: string;
  expression?: string;
  action?: string;
}

export interface StyleDescription {
  artisticStyle: string;       // "digital painting", "oil painting", "anime", "photorealistic"
  genre: string;               // Should match game genre
  mood: string;                // "dark", "epic", "whimsical", "gritty"
  colorScheme?: string;        // "warm", "cold", "muted", "vibrant", "monochromatic"
  influences?: string[];       // Artist or game/movie references
  qualityTags?: string[];      // "highly detailed", "8k", "masterpiece"
  negativeElements?: string[]; // Things to avoid in generation
}

export interface CompositionDescription {
  framing: string;             // "portrait", "full body", "wide shot", "close-up"
  cameraAngle?: string;        // "eye level", "low angle", "bird's eye"
  aspectRatio?: string;        // "1:1", "16:9", "2:3", "portrait", "landscape"
  focusPoint?: string;         // What should be the visual focus
  background?: string;         // "blurred", "detailed", "simple", "transparent"
  depth?: string;              // "shallow DOF", "deep focus"
}

export interface ComfyUIPrompt {
  positive: string;
  negative: string;
  checkpoint?: string;         // Recommended model
  loras?: { name: string; weight: number }[];
  samplerSettings?: {
    sampler?: string;
    scheduler?: string;
    steps?: number;
    cfg?: number;
  };
}

export interface GeneratedImage {
  id: string;
  tool: string;                // "dalle", "sdxl", "midjourney", "comfyui", etc.
  prompt: string;              // The actual prompt used
  url?: string;                // If hosted
  base64?: string;             // If stored locally
  seed?: number;               // For reproducibility
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// Rule system types
export interface RuleSystem {
  name: string;
  description: string;
  attributes: AttributeDef[];
  skills: SkillDef[];
  derivedStats: DerivedStatDef[];
  combatRules: CombatRules;
  checkMechanics: CheckMechanics;
  progression: ProgressionRules;
}

export interface AttributeDef {
  name: string;
  abbreviation: string;
  description: string;
  defaultValue: number;
  minValue: number;
  maxValue: number;
}

export interface SkillDef {
  name: string;
  governingAttribute: string;
  description: string;
}

export interface DerivedStatDef {
  name: string;
  abbreviation: string;
  description: string;
  formula: string; // e.g., "constitution * 2 + 10"
}

export interface CombatRules {
  initiativeFormula: string;
  actionsPerTurn: number;
  attackFormula: string;
  defenseFormula: string;
  damageFormula: string;
  conditions: ConditionDef[];
}

export interface ConditionDef {
  name: string;
  description: string;
  effects: string;
}

export interface CheckMechanics {
  baseDice: string; // e.g., "1d20", "2d6", "d100"
  modifierCalculation: string;
  difficultyScale: Record<string, number>;
  criticalSuccess?: number;
  criticalFailure?: number;
}

export interface ProgressionRules {
  experienceFormula: string;
  levelUpThresholds: number[];
  attributePointsPerLevel: number;
  skillPointsPerLevel: number;
}

// Character types
export interface Character {
  id: string;
  gameId: string;
  name: string;
  isPlayer: boolean;
  attributes: Record<string, number>;
  skills: Record<string, number>;
  status: CharacterStatus;
  locationId: string | null;
  notes: string;
  voice: VoiceDescription | null;
  imageGen: ImageGeneration | null;
  createdAt: string;
}

export interface VoiceDescription {
  pitch: "very_low" | "low" | "medium" | "high" | "very_high";
  speed: "very_slow" | "slow" | "medium" | "fast" | "very_fast";
  tone: string; // e.g., "gravelly", "melodic", "nasal", "breathy", "resonant"
  accent?: string; // e.g., "Scottish", "French", "Brooklyn", "Southern drawl"
  quirks?: string[]; // e.g., ["stutters when nervous", "elongates vowels", "whispers threats"]
  description?: string; // Free-form description for more nuance
}

export interface CharacterStatus {
  health: number;
  maxHealth: number;
  conditions: string[];
  experience: number;
  level: number;
  [key: string]: unknown; // Allow custom derived stats
}

// Location types
export interface Location {
  id: string;
  gameId: string;
  name: string;
  description: string;
  properties: LocationProperties;
  imageGen: ImageGeneration | null;
}

export interface LocationProperties {
  exits: Exit[];
  features: string[];
  atmosphere: string;
  [key: string]: unknown;
}

export interface Exit {
  direction: string;
  destinationId: string;
  description?: string;
  locked?: boolean;
  hidden?: boolean;
}

// Item types
export interface Item {
  id: string;
  gameId: string;
  ownerId: string;
  ownerType: "character" | "location";
  name: string;
  properties: ItemProperties;
  imageGen: ImageGeneration | null;
}

export interface ItemProperties {
  description: string;
  type: string;
  weight?: number;
  value?: number;
  effects?: string[];
  [key: string]: unknown;
}

// Quest types
export interface Quest {
  id: string;
  gameId: string;
  name: string;
  description: string;
  objectives: QuestObjective[];
  status: "active" | "completed" | "failed" | "abandoned";
  rewards?: string;
}

export interface QuestObjective {
  id: string;
  description: string;
  completed: boolean;
  optional?: boolean;
}

// Narrative types
export interface NarrativeEvent {
  id: string;
  gameId: string;
  eventType: string;
  content: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

// Combat types
export interface Combat {
  id: string;
  gameId: string;
  locationId: string;
  participants: CombatParticipant[];
  currentTurn: number;
  round: number;
  status: "active" | "resolved";
  log: string[];
}

export interface CombatParticipant {
  characterId: string;
  initiative: number;
  isActive: boolean;
}

// Dice types
export interface DiceRoll {
  expression: string;
  rolls: number[];
  modifier: number;
  total: number;
}

export interface CheckResult {
  roll: DiceRoll;
  modifier: number;
  total: number;
  difficulty: number;
  success: boolean;
  criticalSuccess: boolean;
  criticalFailure: boolean;
  margin: number;
}

// Resource types (for tracking currency, reputation, counters, etc.)
export interface Resource {
  id: string;
  gameId: string;
  ownerId: string | null;  // null for game-level resources
  ownerType: "game" | "character";
  name: string;
  description: string;
  category: string | null;
  value: number;
  minValue: number | null;
  maxValue: number | null;
  createdAt: string;
}

export interface ResourceChange {
  id: string;
  resourceId: string;
  previousValue: number;
  newValue: number;
  delta: number;
  reason: string | null;
  timestamp: string;
}

// Time/Calendar types
export interface GameDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface CalendarConfig {
  monthNames: string[];
  daysPerMonth: number[];
  hoursPerDay: number;
  minutesPerHour: number;
  startYear: number;
  eraName?: string;
}

export interface GameTime {
  gameId: string;
  currentTime: GameDateTime;
  calendarConfig: CalendarConfig;
}

export interface ScheduledEvent {
  id: string;
  gameId: string;
  name: string;
  description: string;
  triggerTime: GameDateTime;
  recurring: string | null;
  triggered: boolean;
  metadata: Record<string, unknown>;
}

// Timer types
export interface Timer {
  id: string;
  gameId: string;
  name: string;
  description: string;
  timerType: "countdown" | "stopwatch" | "clock";
  currentValue: number;
  maxValue: number | null;
  direction: "up" | "down";
  triggerAt: number | null;
  triggered: boolean;
  unit: string;
  visibleToPlayers: boolean;
  createdAt: string;
}

// Random table types
export interface TableEntry {
  minRoll: number;
  maxRoll: number;
  result: string;
  weight?: number;
  subtable?: string;
  metadata?: Record<string, unknown>;
}

export interface RandomTable {
  id: string;
  gameId: string;
  name: string;
  description: string;
  category: string | null;
  entries: TableEntry[];
  rollExpression: string;
  createdAt: string;
}

export interface TableRollResult {
  table: RandomTable;
  roll: DiceRoll;
  entry: TableEntry;
  result: string;
  subtableResults?: TableRollResult[];
}

// Secret/Knowledge types
export interface Secret {
  id: string;
  gameId: string;
  name: string;
  description: string;
  category: string | null;
  relatedEntityId: string | null;
  relatedEntityType: string | null;
  revealedTo: string[];
  isPublic: boolean;
  clues: string[];
  createdAt: string;
}

// Relationship types
export interface Relationship {
  id: string;
  gameId: string;
  sourceId: string;
  sourceType: string;
  targetId: string;
  targetType: string;
  relationshipType: string;
  value: number;
  label: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface RelationshipChange {
  id: string;
  relationshipId: string;
  previousValue: number;
  newValue: number;
  reason: string | null;
  timestamp: string;
}

// Faction types
export interface Faction {
  id: string;
  gameId: string;
  name: string;
  description: string;
  leaderId: string | null;
  headquartersId: string | null;
  resources: Record<string, number>;
  goals: string[];
  traits: string[];
  status: "active" | "disbanded" | "hidden";
  createdAt: string;
}

// Ability types
export interface Ability {
  id: string;
  gameId: string;
  ownerId: string | null;
  ownerType: "template" | "character";
  name: string;
  description: string;
  category: string | null;
  cost: Record<string, number>;
  cooldown: number | null;
  currentCooldown: number;
  effects: string[];
  requirements: Record<string, number>;
  tags: string[];
  createdAt: string;
}

// Status effect types
export interface StatusEffect {
  id: string;
  gameId: string;
  targetId: string;
  name: string;
  description: string;
  effectType: "buff" | "debuff" | "neutral" | null;
  duration: number | null;
  stacks: number;
  maxStacks: number | null;
  effects: Record<string, number>;
  sourceId: string | null;
  sourceType: string | null;
  expiresAt: string | null;
  createdAt: string;
}

// Tag types
export interface Tag {
  id: string;
  gameId: string;
  entityId: string;
  entityType: string;
  tag: string;
  color: string | null;
  notes: string;
  createdAt: string;
}

// Note types
export interface Note {
  id: string;
  gameId: string;
  title: string;
  content: string;
  category: string | null;
  pinned: boolean;
  relatedEntityId: string | null;
  relatedEntityType: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// External update types - enables multi-agent collaboration
export interface ExternalUpdate {
  id: string;
  gameId: string;

  // Source identification
  sourceAgent: string;           // ID/name of the agent pushing this update
  sourceDescription: string | null; // Description of what the source agent does

  // Update content
  updateType: string;            // e.g., "lore", "npc_backstory", "world_event", "item_details"
  category: string | null;       // Optional categorization
  title: string;                 // Brief title/summary
  content: string;               // The actual content/information
  structuredData: Record<string, unknown> | null; // Optional structured data

  // Targeting
  targetEntityId: string | null;   // If this relates to a specific entity
  targetEntityType: string | null; // Type of that entity

  // Priority and status
  priority: "low" | "normal" | "high" | "urgent";
  status: "pending" | "acknowledged" | "applied" | "rejected";

  // Timestamps
  createdAt: string;
  acknowledgedAt: string | null;
  appliedAt: string | null;

  // DM notes
  dmNotes: string | null;
}

export interface PendingUpdatesResult {
  gameId: string;
  pendingCount: number;
  urgentCount: number;
  updates: ExternalUpdate[];
  hasUrgent: boolean;
  suggestion: string;
}

// Pause state types - captures agent context for seamless resume
export interface PauseState {
  id: string;
  gameId: string;

  // Current scene/moment context
  currentScene: string;                    // Description of where we are in the story
  sceneAtmosphere: string | null;          // Mood, lighting, sounds, feelings
  immediateSituation: string;              // What's happening RIGHT NOW

  // Pending player interaction
  pendingPlayerAction: string | null;      // What action is the player about to take
  awaitingResponseTo: string | null;       // What question/prompt awaits response
  presentedChoices: string[] | null;       // Choices offered to player

  // Active narrative threads
  activeThreads: NarrativeThread[];        // Ongoing storylines, investigations, conversations

  // DM's plans and notes
  dmShortTermPlans: string | null;         // What was about to happen next
  dmLongTermPlans: string | null;          // Major plot points being built toward
  upcomingReveals: string[];               // Secrets about to be revealed

  // NPC states (attitudes may shift in ways not captured elsewhere)
  npcAttitudes: Record<string, string>;    // characterId -> current disposition
  activeConversations: ActiveConversation[];

  // Important context that might be lost
  recentTone: string | null;               // Recent narrative tone (tense, relaxed, etc.)
  playerApparentGoals: string | null;      // What the player seems to be trying to do
  unresolvedHooks: string[];               // Plot hooks player noticed but hasn't pursued

  // Metadata
  pauseReason: string | null;              // Why was the game paused
  createdAt: string;
  modelUsed: string | null;                // Which model was running the game
}

export interface NarrativeThread {
  name: string;                            // Thread name/label
  description: string;                     // What this thread is about
  status: "active" | "background" | "climax" | "resolving";
  urgency: "low" | "medium" | "high" | "critical";
  involvedCharacterIds?: string[];
  involvedLocationIds?: string[];
  relatedQuestId?: string;
  notes?: string;
}

export interface ActiveConversation {
  npcId: string;                           // Character ID of NPC
  topic: string;                           // What's being discussed
  npcEmotionalState: string;               // How they're feeling
  lastNpcStatement?: string;               // What they just said
  playerIntent?: string;                   // What player seems to want from convo
}

// Pause preparation checklist returned by prepare_pause
export interface PauseChecklist {
  gameId: string;
  gameName: string;

  // Current state summary (for agent reference)
  currentState: {
    playerLocation: string | null;
    activeQuests: number;
    activeCombat: boolean;
    activeTimers: number;
    pendingEvents: number;
    recentEventCount: number;
  };

  // Comprehensive game state audit - everything that exists in the game
  gameStateAudit: GameStateAudit;

  // Persistence reminders - things the DM should consider updating
  persistenceReminders: PersistenceReminder[];

  // Checklist of things to save (ephemeral DM context)
  checklist: PauseChecklistItem[];

  // Existing pause state if any
  existingPauseState: PauseState | null;

  // Instructions for the agent
  instructions: string;
}

// Comprehensive audit of all game data
export interface GameStateAudit {
  characters: {
    total: number;
    players: number;
    npcs: number;
    withNotes: number;
    withConditions: number;
  };
  locations: {
    total: number;
    connected: number;
  };
  quests: {
    active: number;
    completed: number;
    failed: number;
  };
  items: {
    total: number;
    inInventories: number;
    inLocations: number;
  };
  combat: {
    active: boolean;
    combatId: string | null;
    round: number | null;
    participantCount: number;
  };
  resources: {
    gameLevel: number;
    characterLevel: number;
  };
  timers: {
    active: number;
    triggered: number;
  };
  scheduledEvents: {
    pending: number;
    triggered: number;
  };
  relationships: {
    total: number;
  };
  secrets: {
    total: number;
    revealed: number;
    hidden: number;
  };
  factions: {
    active: number;
    disbanded: number;
  };
  abilities: {
    templates: number;
    characterOwned: number;
  };
  notes: {
    total: number;
    pinned: number;
  };
  statusEffects: {
    activeCount: number;
    affectedCharacters: number;
  };
  tags: {
    uniqueTags: number;
  };
  randomTables: {
    total: number;
  };
  narrativeEvents: {
    total: number;
    recentHour: number;
  };
  images: {
    total: number;
  };
  time: {
    hasCalendar: boolean;
    currentTime: string | null;
  };
}

// Reminder for DM to consider persisting something
export interface PersistenceReminder {
  category: "critical" | "important" | "suggested";
  entityType: string;
  tool: string;
  reminder: string;
  reason: string;
  entityIds?: string[];
  entityNames?: string[];
}

export interface PauseChecklistItem {
  category: string;
  item: string;
  description: string;
  required: boolean;
  example?: string;
}

// Resume context returned by get_resume_context
export interface ResumeContext {
  // The saved pause state
  pauseState: PauseState;

  // Full game state for quick reference
  gameState: {
    game: Game;
    playerCharacter: Character | null;
    currentLocation: Location | null;
    activeQuests: Quest[];
    activeCombat: Combat | null;
    recentEvents: NarrativeEvent[];
    activeTimers: Timer[];
    pendingScheduledEvents: ScheduledEvent[];
  };

  // Narrative summary
  narrativeSummary: string;

  // Ready-to-use resume prompt
  resumePrompt: string;

  // Warnings about potential issues
  warnings: string[];
}

// Stored image types - for file-based image storage
export interface StoredImage {
  id: string;
  gameId: string;
  entityId: string;
  entityType: "character" | "location" | "item" | "scene" | "faction";
  entityName?: string;  // Populated at runtime for confirmation, not stored in DB

  // File information
  filePath: string;           // Relative path from data/images/
  fileSize: number;           // Size in bytes
  mimeType: string;           // e.g., 'image/png'
  width: number | null;
  height: number | null;

  // Metadata
  label: string | null;
  description: string | null;
  source: "generated" | "uploaded" | "url";
  sourceUrl: string | null;
  generationTool: string | null;
  generationPrompt: string | null;

  // Flags
  isPrimary: boolean;

  // Timestamps
  createdAt: string;
}

export interface StoreImageParams {
  gameId: string;
  entityId: string;
  entityType: "character" | "location" | "item" | "scene" | "faction";

  // Image data (one required)
  base64?: string;            // Base64-encoded image data
  url?: string;               // URL to fetch image from
  filePath?: string;          // Local file path to copy from

  // Metadata
  label?: string;
  description?: string;
  mimeType?: string;          // Required if base64, inferred from URL/content otherwise
  generationTool?: string;
  generationPrompt?: string;

  // Set as primary?
  setAsPrimary?: boolean;
}

export interface ImageListResult {
  entityId: string;
  entityType: string;
  images: StoredImage[];
  primaryImage: StoredImage | null;
}
