import { ref, watch, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'

const DEFAULT_FAVICON = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🎲</text></svg>'

const currentFaviconUrl = ref<string | null>(null)
const currentGameId = ref<string | null>(null)

/**
 * Get or create the favicon link element
 */
function getFaviconLink(): HTMLLinkElement {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/png'
    document.head.appendChild(link)
  }
  return link
}

/**
 * Set the favicon to a specific URL
 */
function setFavicon(url: string): void {
  const link = getFaviconLink()
  link.href = url
  currentFaviconUrl.value = url
}

/**
 * Reset to default favicon
 */
function resetFavicon(): void {
  setFavicon(DEFAULT_FAVICON)
}

/**
 * Load favicon for a specific game
 */
async function loadGameFavicon(gameId: string | null): Promise<void> {
  if (!gameId) {
    resetFavicon()
    return
  }

  // Check if game has a favicon
  try {
    const url = `/api/games/${gameId}/favicon?size=32`
    const response = await fetch(url, { method: 'HEAD' })

    if (response.ok) {
      // Add cache-busting timestamp for fresh favicon
      setFavicon(`${url}&t=${Date.now()}`)
    } else {
      resetFavicon()
    }
  } catch {
    resetFavicon()
  }
}

/**
 * Set the current game context for favicon loading.
 * Exported for use by useTheme.setSession() to keep theme and favicon in sync.
 */
export function setGameContext(gameId: string | null): void {
  if (gameId !== currentGameId.value) {
    currentGameId.value = gameId
    loadGameFavicon(gameId)
  }
}

/**
 * Main composable hook
 */
export function useFavicon() {
  const route = useRoute()

  // Computed game ID from route
  const gameId = computed(() => {
    if (route.params.gameId) {
      return route.params.gameId as string
    }
    return null
  })

  onMounted(() => {
    // Only set from route if we have a gameId param
    if (gameId.value) {
      currentGameId.value = gameId.value
      loadGameFavicon(gameId.value)
    }
  })

  // Watch for game changes from route
  watch(gameId, (newGameId) => {
    if (newGameId !== currentGameId.value) {
      currentGameId.value = newGameId
      loadGameFavicon(newGameId)
    }
  })

  return {
    currentFaviconUrl,
    setFavicon,
    resetFavicon,
    reloadFavicon: () => loadGameFavicon(currentGameId.value),
  }
}
