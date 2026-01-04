import { ref } from 'vue'
import type {
  Game,
  GameState,
  MapData,
  Character,
  CharacterSheet,
  Location,
  Quest,
  NarrativeEvent,
  StoredImage,
  EntityImages,
  Item,
  Faction,
  ImagePresetsResponse,
  ImageGenerationPreset,
  SearchResults,
  Relationship,
} from '../types'

const API_BASE = '/api'

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return response.json()
}

export function useApi() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Generic request wrapper that handles loading state, errors, and fallbacks
   */
  async function request<T>(url: string, fallback: T): Promise<T> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<T>(url)
    } catch (e) {
      error.value = (e as Error).message
      return fallback
    } finally {
      loading.value = false
    }
  }

  /**
   * Silent request that doesn't affect loading/error state (for background operations)
   */
  async function silentRequest<T>(url: string, fallback: T): Promise<T> {
    try {
      return await fetchJson<T>(url)
    } catch {
      return fallback
    }
  }

  // Game endpoints
  const getGames = () => request<Game[]>(`${API_BASE}/games`, [])

  const getGame = (gameId: string) =>
    request<GameState | null>(`${API_BASE}/games/${gameId}`, null)

  const getMap = (gameId: string) =>
    request<MapData | null>(`${API_BASE}/games/${gameId}/map`, null)

  const getHistory = (gameId: string, limit = 50) =>
    request<NarrativeEvent[]>(`${API_BASE}/games/${gameId}/history?limit=${limit}`, [])

  const getGameImages = (gameId: string) =>
    request<StoredImage[]>(`${API_BASE}/games/${gameId}/images`, [])

  const getRelationships = (gameId: string) =>
    request<Relationship[]>(`${API_BASE}/games/${gameId}/relationships`, [])

  const getImageGenerationPresets = (gameId: string) =>
    request<ImagePresetsResponse>(`${API_BASE}/games/${gameId}/image-presets`, {
      presets: [],
      defaultPresetId: null,
    })

  const getImageGenerationPreset = (gameId: string, presetId: string) =>
    request<ImageGenerationPreset | null>(
      `${API_BASE}/games/${gameId}/image-presets/${presetId}`,
      null
    )

  const getCharactersAtLocation = (gameId: string, locationId: string) =>
    request<Character[]>(
      `${API_BASE}/games/${gameId}/characters?locationId=${locationId}`,
      []
    )

  // Entity endpoints
  const getCharacter = (characterId: string) =>
    request<Character | null>(`${API_BASE}/characters/${characterId}`, null)

  const getCharacterSheet = (characterId: string) =>
    request<CharacterSheet | null>(`${API_BASE}/characters/${characterId}/sheet`, null)

  const getLocation = (locationId: string) =>
    request<Location | null>(`${API_BASE}/locations/${locationId}`, null)

  const getQuest = (questId: string) =>
    request<Quest | null>(`${API_BASE}/quests/${questId}`, null)

  const getFaction = (factionId: string) =>
    request<Faction | null>(`${API_BASE}/factions/${factionId}`, null)

  const getItem = (itemId: string) =>
    request<Item | null>(`${API_BASE}/items/${itemId}`, null)

  const getImage = (imageId: string) =>
    request<StoredImage | null>(`${API_BASE}/images/${imageId}`, null)

  const getEntityImages = (entityId: string, entityType: string) =>
    request<EntityImages>(`${API_BASE}/entities/${entityType}/${entityId}/images`, {
      images: [],
      primaryImage: null,
    })

  const getInventory = (ownerId: string, ownerType: 'character' | 'location') =>
    request<Item[]>(`${API_BASE}/inventory/${ownerType}/${ownerId}`, [])

  // Search (non-blocking, doesn't affect loading state)
  const search = (gameId: string, query: string) =>
    silentRequest<SearchResults>(
      `${API_BASE}/games/${gameId}/search?q=${encodeURIComponent(query)}`,
      { characters: [], locations: [], quests: [], items: [], factions: [], notes: [], events: [] }
    )

  return {
    loading,
    error,
    getGames,
    getGame,
    getMap,
    getCharacter,
    getCharacterSheet,
    getLocation,
    getQuest,
    getFaction,
    getItem,
    getHistory,
    getGameImages,
    getImage,
    getEntityImages,
    getInventory,
    getCharactersAtLocation,
    search,
    getImageGenerationPresets,
    getImageGenerationPreset,
    getRelationships,
  }
}
