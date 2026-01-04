import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useApi } from '../useApi'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('useApi', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getGames', () => {
    it('should fetch games successfully', async () => {
      const mockGames = [
        { id: '1', name: 'Game 1' },
        { id: '2', name: 'Game 2' },
      ]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGames),
      })

      const { getGames, loading, error } = useApi()
      const result = await getGames()

      expect(mockFetch).toHaveBeenCalledWith('/api/games')
      expect(result).toEqual(mockGames)
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('should handle fetch errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const { getGames, error } = useApi()
      const result = await getGames()

      expect(result).toEqual([])
      expect(error.value).toBe('HTTP error! status: 500')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { getGames, error } = useApi()
      const result = await getGames()

      expect(result).toEqual([])
      expect(error.value).toBe('Network error')
    })
  })

  describe('getGame', () => {
    it('should fetch a game by ID', async () => {
      const mockGame = { game: { id: '123', name: 'Test Game' } }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGame),
      })

      const { getGame } = useApi()
      const result = await getGame('123')

      expect(mockFetch).toHaveBeenCalledWith('/api/games/123')
      expect(result).toEqual(mockGame)
    })

    it('should return null on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const { getGame, error } = useApi()
      const result = await getGame('nonexistent')

      expect(result).toBeNull()
      expect(error.value).toBe('HTTP error! status: 404')
    })
  })

  describe('getCharacter', () => {
    it('should fetch a character by ID', async () => {
      const mockChar = { id: 'char1', name: 'Hero' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockChar),
      })

      const { getCharacter } = useApi()
      const result = await getCharacter('char1')

      expect(mockFetch).toHaveBeenCalledWith('/api/characters/char1')
      expect(result).toEqual(mockChar)
    })
  })

  describe('search', () => {
    it('should search with encoded query', async () => {
      const mockResults = { characters: [], locations: [] }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResults),
      })

      const { search } = useApi()
      const result = await search('game1', 'test query')

      expect(mockFetch).toHaveBeenCalledWith('/api/games/game1/search?q=test%20query')
      expect(result).toEqual(mockResults)
    })

    it('should return empty results on error without setting error state', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed'))

      const { search, error } = useApi()
      const result = await search('game1', 'query')

      // search() intentionally doesn't set error state (non-blocking)
      expect(result).toEqual({
        characters: [],
        locations: [],
        quests: [],
        items: [],
        factions: [],
        notes: [],
        events: [],
      })
    })
  })

  describe('loading state', () => {
    it('should set loading to true during request', async () => {
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      mockFetch.mockReturnValueOnce(pendingPromise)

      const { getGames, loading } = useApi()

      const fetchPromise = getGames()
      expect(loading.value).toBe(true)

      resolvePromise!({
        ok: true,
        json: () => Promise.resolve([]),
      })

      await fetchPromise
      expect(loading.value).toBe(false)
    })
  })
})
