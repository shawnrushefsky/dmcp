export interface Session {
  id: string
  name: string
  setting: string
  style: string
  titleImageId: string | null
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
  sessionId: string
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
  sessionId: string
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
  sessionId: string
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
  sessionId: string
  eventType: string
  content: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface Item {
  id: string
  sessionId: string
  name: string
  type?: string
  ownerId: string
  ownerType: 'character' | 'location'
  properties?: Record<string, unknown>
}

export interface StoredImage {
  id: string
  sessionId: string
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
  ascii: string
  nodes: MapNode[]
}

export interface CharacterSheet {
  character: Character
  inventory: Item[]
  locationName: string
  ascii: string
}

export interface SessionState {
  session: Session
  characters: Character[]
  locations: Location[]
  quests: Quest[]
}

export interface EntityImages {
  images: StoredImage[]
  primaryImage: StoredImage | null
}

export interface Breadcrumb {
  label: string
  href?: string
}
