export interface Game {
  id: string
  name: string
  setting: string
  style: string
  titleImageId: string | null
  faviconImageId: string | null
  createdAt: string
  updatedAt: string
}

export interface CharacterStatus {
  health: number
  maxHealth: number
  level: number
  experience: number
  conditions: string[]
}

export interface Character {
  id: string
  gameId: string
  name: string
  isPlayer: boolean
  locationId: string | null
  attributes: Record<string, number>
  skills: Record<string, number>
  status: CharacterStatus
  notes: string
  primaryImageId?: string | null
  createdAt: string
  updatedAt: string
}

export interface LocationExit {
  direction: string
  destinationId: string
  description?: string
}

export interface LocationProperties {
  exits: LocationExit[]
  atmosphere?: string
  features?: string[]
}

export interface Location {
  id: string
  gameId: string
  name: string
  description: string
  properties: LocationProperties
  primaryImageId?: string | null
  createdAt: string
  updatedAt: string
}

export interface QuestObjective {
  id: string
  description: string
  completed: boolean
  optional?: boolean
}

export interface Quest {
  id: string
  gameId: string
  name: string
  description: string
  status: 'active' | 'completed' | 'failed' | 'abandoned'
  objectives: QuestObjective[]
  rewards?: string
  createdAt: string
  updatedAt: string
}

export interface NarrativeEvent {
  id: string
  gameId: string
  eventType: string
  content: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface Item {
  id: string
  gameId: string
  name: string
  type?: string
  ownerId: string
  ownerType: 'character' | 'location'
  properties?: Record<string, unknown>
}

export interface Faction {
  id: string
  gameId: string
  name: string
  description?: string
  status: 'active' | 'disbanded' | 'hidden'
  leaderId?: string
  headquartersId?: string
  resources: Record<string, number>
  goals: string[]
  traits: string[]
  primaryImageId?: string | null
  createdAt: string
  updatedAt: string
}

export interface Resource {
  id: string
  gameId: string
  ownerType: 'game' | 'character'
  ownerId?: string
  name: string
  description?: string
  category?: string
  value: number
  minValue?: number
  maxValue?: number
  createdAt: string
  updatedAt: string
}

export interface Note {
  id: string
  gameId: string
  title: string
  content: string
  category?: string
  tags: string[]
  pinned: boolean
  relatedEntityType?: string
  relatedEntityId?: string
  createdAt: string
  updatedAt: string
}

export interface GameTime {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  formatted?: string
}

export interface Combat {
  id: string
  gameId: string
  locationId: string
  status: 'active' | 'ended'
  round: number
  currentTurnIndex: number
}

export interface StoredImage {
  id: string
  gameId: string
  entityId: string
  entityType: 'character' | 'location' | 'item' | 'scene'
  label?: string
  description?: string
  fileSize: number
  mimeType: string
  width?: number
  height?: number
  generationTool?: string
  generationPrompt?: string
  isPrimary: boolean
  createdAt: string
}

export interface MapNode {
  id: string
  name: string
  hasPlayer: boolean
  exits: { direction: string; destinationId: string }[]
}

export interface MapData {
  nodes: MapNode[]
  connections: { from: string; to: string; direction: string }[]
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
}

export interface CharacterSheet {
  character: Character
  inventory: Item[]
  locationName: string
}

export interface GameCounts {
  characters: number
  locations: number
  quests: number
  factions: number
  resources: number
  notes: number
  relationships: number
  abilities: number
  timers: number
  secrets: number
  images: number
  items: number
  events: number
}

export interface GameState {
  game: Game
  characters: Character[]
  locations: Location[]
  quests: Quest[]
  factions: Faction[]
  resources: Resource[]
  notes: Note[]
  counts: GameCounts
  activeCombat: Combat | null
  gameTime: GameTime | null
}

export interface EntityImages {
  images: StoredImage[]
  primaryImage: StoredImage | null
}

export interface Breadcrumb {
  label: string
  href?: string
  icon?: 'home' | 'game' | 'character' | 'location' | 'quest' | 'image'
}

// Image Generation Preset - a named collection of settings for a specific use case
export interface ImageGenerationPreset {
  id: string
  name: string
  description?: string
  entityTypes?: ('character' | 'location' | 'item' | 'scene')[]
  isDefault?: boolean
  config: ImageGenerationPreferences
  createdAt?: string
  updatedAt?: string
}

// Response from the presets API
export interface ImagePresetsResponse {
  presets: ImageGenerationPreset[]
  defaultPresetId: string | null
}

// Image Generation Preferences (config within a preset)
export interface ImageGenerationPreferences {
  defaultTool?: 'dalle' | 'sdxl' | 'midjourney' | 'comfyui' | 'flux' | 'other'
  defaultStyle?: {
    artisticStyle?: string
    mood?: string
    colorScheme?: string
    qualityTags?: string[]
    negativePrompts?: string[]
    influences?: string[]
  }
  comfyui?: {
    endpoint?: string
    checkpoint?: string
    loras?: Array<{ name: string; weight: number }>
    samplerSettings?: {
      sampler?: string
      scheduler?: string
      steps?: number
      cfg?: number
    }
    // Full workflow templates
    workflows?: Record<string, {
      name: string
      description?: string
      workflow: Record<string, unknown>
      inputNodes?: {
        positivePrompt?: string
        negativePrompt?: string
        checkpoint?: string
        seed?: string
        width?: string
        height?: string
        steps?: string
        cfg?: string
        sampler?: string
        scheduler?: string
      }
    }>
    defaultWorkflowId?: string
    defaultWorkflow?: string
    workflowOverrides?: Record<string, unknown>
  }
  dalle?: {
    model?: string
    quality?: 'standard' | 'hd'
    style?: 'vivid' | 'natural'
    size?: '1024x1024' | '1792x1024' | '1024x1792'
  }
  midjourney?: {
    version?: string
    stylize?: number
    chaos?: number
    quality?: number
    aspectRatio?: string
  }
  sdxl?: {
    model?: string
    samplerName?: string
    steps?: number
    cfg?: number
    width?: number
    height?: number
    negativePrompt?: string
  }
  flux?: {
    model?: string
    steps?: number
    guidance?: number
  }
  defaults?: {
    aspectRatio?: string
    generateOnCreate?: boolean
    savePrompts?: boolean
    framing?: {
      character?: string
      location?: string
      item?: string
    }
  }
  consistency?: {
    maintainColorPalette?: boolean
    characterSeedImages?: Record<string, string>
    styleReferenceImage?: string
    useCharacterRefs?: boolean
  }
  notes?: string
}
