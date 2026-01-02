// Session types
export interface Session {
  id: string;
  name: string;
  setting: string;
  style: string;
  rules: RuleSystem | null;
  preferences: GamePreferences | null;
  currentLocationId: string | null;
  titleImageId: string | null;
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
  sessionId: string;
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
  sessionId: string;
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
  sessionId: string;
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
  sessionId: string;
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
  sessionId: string;
  eventType: string;
  content: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

// Combat types
export interface Combat {
  id: string;
  sessionId: string;
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
  sessionId: string;
  ownerId: string | null;  // null for session-level resources
  ownerType: "session" | "character";
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
  sessionId: string;
  currentTime: GameDateTime;
  calendarConfig: CalendarConfig;
}

export interface ScheduledEvent {
  id: string;
  sessionId: string;
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
  sessionId: string;
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
  sessionId: string;
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
  sessionId: string;
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
  sessionId: string;
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
  sessionId: string;
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
  sessionId: string;
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
  sessionId: string;
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
  sessionId: string;
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
  sessionId: string;
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
  sessionId: string;

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
  sessionId: string;
  pendingCount: number;
  urgentCount: number;
  updates: ExternalUpdate[];
  hasUrgent: boolean;
  suggestion: string;
}

// Pause state types - captures agent context for seamless resume
export interface PauseState {
  id: string;
  sessionId: string;

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
  modelUsed: string | null;                // Which model was running the session
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
  sessionId: string;
  sessionName: string;

  // Current state summary (for agent reference)
  currentState: {
    playerLocation: string | null;
    activeQuests: number;
    activeCombat: boolean;
    activeTimers: number;
    pendingEvents: number;
    recentEventCount: number;
  };

  // Checklist of things to save
  checklist: PauseChecklistItem[];

  // Existing pause state if any
  existingPauseState: PauseState | null;

  // Instructions for the agent
  instructions: string;
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
    session: Session;
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
  sessionId: string;
  entityId: string;
  entityType: "character" | "location" | "item" | "scene";

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
  sessionId: string;
  entityId: string;
  entityType: "character" | "location" | "item" | "scene";

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
