// Session types
export interface Session {
  id: string;
  name: string;
  setting: string;
  style: string;
  rules: RuleSystem | null;
  preferences: GamePreferences | null;
  currentLocationId: string | null;
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
