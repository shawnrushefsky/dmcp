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

  async function getGames(): Promise<Game[]> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<Game[]>(`${API_BASE}/games`)
    } catch (e) {
      error.value = (e as Error).message
      return []
    } finally {
      loading.value = false
    }
  }

  async function getGame(gameId: string): Promise<GameState | null> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<GameState>(`${API_BASE}/games/${gameId}`)
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  async function getMap(gameId: string): Promise<MapData | null> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<MapData>(`${API_BASE}/games/${gameId}/map`)
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  async function getCharacter(characterId: string): Promise<Character | null> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<Character>(`${API_BASE}/characters/${characterId}`)
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  async function getCharacterSheet(characterId: string): Promise<CharacterSheet | null> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<CharacterSheet>(`${API_BASE}/characters/${characterId}/sheet`)
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  async function getLocation(locationId: string): Promise<Location | null> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<Location>(`${API_BASE}/locations/${locationId}`)
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  async function getQuest(questId: string): Promise<Quest | null> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<Quest>(`${API_BASE}/quests/${questId}`)
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  async function getFaction(factionId: string): Promise<Faction | null> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<Faction>(`${API_BASE}/factions/${factionId}`)
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  async function getItem(itemId: string): Promise<Item | null> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<Item>(`${API_BASE}/items/${itemId}`)
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  async function getHistory(gameId: string, limit = 50): Promise<NarrativeEvent[]> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<NarrativeEvent[]>(
        `${API_BASE}/games/${gameId}/history?limit=${limit}`
      )
    } catch (e) {
      error.value = (e as Error).message
      return []
    } finally {
      loading.value = false
    }
  }

  async function getGameImages(gameId: string): Promise<StoredImage[]> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<StoredImage[]>(`${API_BASE}/games/${gameId}/images`)
    } catch (e) {
      error.value = (e as Error).message
      return []
    } finally {
      loading.value = false
    }
  }

  async function getImage(imageId: string): Promise<StoredImage | null> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<StoredImage>(`${API_BASE}/images/${imageId}`)
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  async function getEntityImages(
    entityId: string,
    entityType: string
  ): Promise<EntityImages> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<EntityImages>(
        `${API_BASE}/entities/${entityType}/${entityId}/images`
      )
    } catch (e) {
      error.value = (e as Error).message
      return { images: [], primaryImage: null }
    } finally {
      loading.value = false
    }
  }

  async function getInventory(
    ownerId: string,
    ownerType: 'character' | 'location'
  ): Promise<Item[]> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<Item[]>(
        `${API_BASE}/inventory/${ownerType}/${ownerId}`
      )
    } catch (e) {
      error.value = (e as Error).message
      return []
    } finally {
      loading.value = false
    }
  }

  async function getCharactersAtLocation(
    gameId: string,
    locationId: string
  ): Promise<Character[]> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<Character[]>(
        `${API_BASE}/games/${gameId}/characters?locationId=${locationId}`
      )
    } catch (e) {
      error.value = (e as Error).message
      return []
    } finally {
      loading.value = false
    }
  }

  async function search(gameId: string, query: string): Promise<SearchResults> {
    // Don't set loading for search (it's non-blocking)
    try {
      return await fetchJson<SearchResults>(
        `${API_BASE}/games/${gameId}/search?q=${encodeURIComponent(query)}`
      )
    } catch {
      return { characters: [], locations: [], quests: [], items: [], factions: [], notes: [], events: [] }
    }
  }

  async function getImageGenerationPresets(
    gameId: string
  ): Promise<ImagePresetsResponse> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<ImagePresetsResponse>(
        `${API_BASE}/games/${gameId}/image-presets`
      )
    } catch (e) {
      error.value = (e as Error).message
      return { presets: [], defaultPresetId: null }
    } finally {
      loading.value = false
    }
  }

  async function getImageGenerationPreset(
    gameId: string,
    presetId: string
  ): Promise<ImageGenerationPreset | null> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<ImageGenerationPreset>(
        `${API_BASE}/games/${gameId}/image-presets/${presetId}`
      )
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  async function getRelationships(gameId: string): Promise<Relationship[]> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<Relationship[]>(
        `${API_BASE}/games/${gameId}/relationships`
      )
    } catch (e) {
      error.value = (e as Error).message
      return []
    } finally {
      loading.value = false
    }
  }

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
