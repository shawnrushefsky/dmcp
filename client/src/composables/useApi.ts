import { ref } from 'vue'
import type {
  Session,
  SessionState,
  MapData,
  Character,
  CharacterSheet,
  Location,
  Quest,
  NarrativeEvent,
  StoredImage,
  EntityImages,
  Item,
  ImagePresetsResponse,
  ImageGenerationPreset,
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

  async function getSessions(): Promise<Session[]> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<Session[]>(`${API_BASE}/sessions`)
    } catch (e) {
      error.value = (e as Error).message
      return []
    } finally {
      loading.value = false
    }
  }

  async function getSession(sessionId: string): Promise<SessionState | null> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<SessionState>(`${API_BASE}/sessions/${sessionId}`)
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  async function getMap(sessionId: string): Promise<MapData | null> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<MapData>(`${API_BASE}/sessions/${sessionId}/map`)
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

  async function getHistory(sessionId: string, limit = 50): Promise<NarrativeEvent[]> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<NarrativeEvent[]>(
        `${API_BASE}/sessions/${sessionId}/history?limit=${limit}`
      )
    } catch (e) {
      error.value = (e as Error).message
      return []
    } finally {
      loading.value = false
    }
  }

  async function getSessionImages(sessionId: string): Promise<StoredImage[]> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<StoredImage[]>(`${API_BASE}/sessions/${sessionId}/images`)
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
    sessionId: string,
    locationId: string
  ): Promise<Character[]> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<Character[]>(
        `${API_BASE}/sessions/${sessionId}/characters?locationId=${locationId}`
      )
    } catch (e) {
      error.value = (e as Error).message
      return []
    } finally {
      loading.value = false
    }
  }

  interface SearchResult {
    characters: Array<{
      id: string
      name: string
      type: 'character'
      isPlayer: boolean
      primaryImageId: string | null
    }>
    locations: Array<{
      id: string
      name: string
      type: 'location'
      primaryImageId: string | null
    }>
    quests: Array<{
      id: string
      name: string
      type: 'quest'
      status: string
    }>
  }

  async function search(sessionId: string, query: string): Promise<SearchResult> {
    // Don't set loading for search (it's non-blocking)
    try {
      return await fetchJson<SearchResult>(
        `${API_BASE}/sessions/${sessionId}/search?q=${encodeURIComponent(query)}`
      )
    } catch {
      return { characters: [], locations: [], quests: [] }
    }
  }

  async function getImageGenerationPresets(
    sessionId: string
  ): Promise<ImagePresetsResponse> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<ImagePresetsResponse>(
        `${API_BASE}/sessions/${sessionId}/image-presets`
      )
    } catch (e) {
      error.value = (e as Error).message
      return { presets: [], defaultPresetId: null }
    } finally {
      loading.value = false
    }
  }

  async function getImageGenerationPreset(
    sessionId: string,
    presetId: string
  ): Promise<ImageGenerationPreset | null> {
    loading.value = true
    error.value = null
    try {
      return await fetchJson<ImageGenerationPreset>(
        `${API_BASE}/sessions/${sessionId}/image-presets/${presetId}`
      )
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    getSessions,
    getSession,
    getMap,
    getCharacter,
    getCharacterSheet,
    getLocation,
    getQuest,
    getHistory,
    getSessionImages,
    getImage,
    getEntityImages,
    getInventory,
    getCharactersAtLocation,
    search,
    getImageGenerationPresets,
    getImageGenerationPreset,
  }
}
