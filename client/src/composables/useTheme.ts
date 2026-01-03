import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { setGameContext as setFaviconContext } from './useFavicon'

// Border radius mapping
const BORDER_RADIUS_MAP = {
  sharp: '0px',
  rounded: '12px',
  soft: '24px',
} as const

export type BorderRadiusStyle = keyof typeof BORDER_RADIUS_MAP
export type CardStyle = 'clean' | 'grungy' | 'tech' | 'parchment' | 'metallic' | 'wooden'

export interface ThemeConfig {
  // Colors
  bgColor: string
  bgSecondary: string
  bgElevated: string
  textColor: string
  textMuted: string
  accentColor: string
  accentHover: string
  borderColor: string
  successColor: string
  warningColor: string
  dangerColor: string
  codeBackground: string
  codeText: string

  // Visual style
  borderRadius: BorderRadiusStyle
  cardStyle: CardStyle

  // Fonts (Google Fonts names)
  fontDisplay: string
  fontBody: string
  fontMono: string

  // Display options
  showHealthBars: boolean
  showConditionTags: boolean
  showImages: boolean

  // Custom title
  appTitle: string
}

const defaultConfig: ThemeConfig = {
  // Colors - Modern dark theme
  bgColor: '#0f0f1a',
  bgSecondary: '#1a1a2e',
  bgElevated: '#252545',
  textColor: '#f0f0f5',
  textMuted: '#9090a0',
  accentColor: '#7c3aed',
  accentHover: '#8b5cf6',
  borderColor: '#3a3a5c',
  successColor: '#22c55e',
  warningColor: '#f59e0b',
  dangerColor: '#ef4444',
  codeBackground: '#0a0a12',
  codeText: '#a5f3a0',

  // Visual style
  borderRadius: 'rounded',
  cardStyle: 'clean',

  // Fonts
  fontDisplay: 'Inter',
  fontBody: 'Inter',
  fontMono: 'JetBrains Mono',

  // Display options
  showHealthBars: true,
  showConditionTags: true,
  showImages: true,

  // Title
  appTitle: 'DMCP Game Viewer',
}

const config = ref<ThemeConfig>({ ...defaultConfig })
const currentSessionId = ref<string | null>(null)
const loadedFonts = ref<Set<string>>(new Set())
let pollingInterval: ReturnType<typeof setInterval> | null = null

// Track which fonts are currently loading
const loadingFonts = new Set<string>()

/**
 * Load a Google Font dynamically
 */
async function loadGoogleFont(fontName: string): Promise<void> {
  if (!fontName || loadedFonts.value.has(fontName) || loadingFonts.has(fontName)) {
    return
  }

  // Skip system fonts
  const systemFonts = ['system-ui', 'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy']
  if (systemFonts.some(sf => fontName.toLowerCase().includes(sf))) {
    return
  }

  loadingFonts.add(fontName)

  try {
    // Create link element for Google Fonts
    const encodedFont = encodeURIComponent(fontName)
    const linkId = `google-font-${encodedFont}`

    // Check if already added
    if (document.getElementById(linkId)) {
      loadedFonts.value.add(fontName)
      loadingFonts.delete(fontName)
      return
    }

    const link = document.createElement('link')
    link.id = linkId
    link.rel = 'stylesheet'
    // Load multiple weights for better typography
    link.href = `https://fonts.googleapis.com/css2?family=${encodedFont.replace(/%20/g, '+')}:wght@400;500;600;700&display=swap`

    await new Promise<void>((resolve, reject) => {
      link.onload = () => resolve()
      link.onerror = () => reject(new Error(`Failed to load font: ${fontName}`))
      document.head.appendChild(link)
    })

    loadedFonts.value.add(fontName)
  } catch (error) {
    console.warn(`Could not load Google Font "${fontName}":`, error)
  } finally {
    loadingFonts.delete(fontName)
  }
}

/**
 * Load all fonts from theme config
 */
async function loadThemeFonts(theme: ThemeConfig): Promise<void> {
  const fonts = [theme.fontDisplay, theme.fontBody, theme.fontMono].filter(Boolean)
  await Promise.all(fonts.map(loadGoogleFont))
}

/**
 * Apply theme to CSS custom properties
 */
function applyTheme(theme: ThemeConfig): void {
  const root = document.documentElement

  // Colors
  root.style.setProperty('--bg', theme.bgColor)
  root.style.setProperty('--bg-secondary', theme.bgSecondary)
  root.style.setProperty('--bg-elevated', theme.bgElevated)
  root.style.setProperty('--text', theme.textColor)
  root.style.setProperty('--text-muted', theme.textMuted)
  root.style.setProperty('--accent', theme.accentColor)
  root.style.setProperty('--accent-hover', theme.accentHover)
  root.style.setProperty('--border', theme.borderColor)
  root.style.setProperty('--success', theme.successColor)
  root.style.setProperty('--warning', theme.warningColor)
  root.style.setProperty('--danger', theme.dangerColor)
  root.style.setProperty('--code-bg', theme.codeBackground)
  root.style.setProperty('--code-text', theme.codeText)

  // RGB variants for alpha operations
  const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (result && result[1] && result[2] && result[3]) {
      return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    }
    return '124, 58, 237'
  }
  root.style.setProperty('--accent-rgb', hexToRgb(theme.accentColor))
  root.style.setProperty('--bg-rgb', hexToRgb(theme.bgColor))

  // Visual style
  root.style.setProperty('--border-radius', BORDER_RADIUS_MAP[theme.borderRadius] || '12px')
  root.style.setProperty('--border-radius-sm', theme.borderRadius === 'sharp' ? '0px' : '6px')
  root.style.setProperty('--border-radius-lg', theme.borderRadius === 'sharp' ? '0px' : theme.borderRadius === 'soft' ? '32px' : '16px')

  // Card style data attribute for CSS targeting
  root.setAttribute('data-card-style', theme.cardStyle)

  // Fonts
  const fontDisplay = theme.fontDisplay ? `'${theme.fontDisplay}', system-ui, sans-serif` : 'system-ui, sans-serif'
  const fontBody = theme.fontBody ? `'${theme.fontBody}', system-ui, sans-serif` : 'system-ui, sans-serif'
  const fontMono = theme.fontMono ? `'${theme.fontMono}', 'Fira Code', monospace` : "'JetBrains Mono', 'Fira Code', monospace"

  root.style.setProperty('--font-display', fontDisplay)
  root.style.setProperty('--font-body', fontBody)
  root.style.setProperty('--font-mono', fontMono)

  // Legacy compatibility
  root.style.setProperty('--font-family', fontBody)
  root.style.setProperty('--ascii-font', fontMono)
  root.style.setProperty('--ascii-bg', theme.codeBackground)
  root.style.setProperty('--ascii-text', theme.codeText)

  // Apply body font
  document.body.style.fontFamily = fontBody

  // Display options as data attributes for conditional CSS
  root.setAttribute('data-show-health-bars', String(theme.showHealthBars))
  root.setAttribute('data-show-condition-tags', String(theme.showConditionTags))
  root.setAttribute('data-show-images', String(theme.showImages))

  // Update page title
  if (theme.appTitle) {
    document.title = theme.appTitle
  }
}

/**
 * Fetch theme from server
 */
async function fetchTheme(gameId?: string | null): Promise<ThemeConfig | null> {
  try {
    const url = gameId ? `/api/games/${gameId}/theme` : '/api/theme'
    const response = await fetch(url)
    if (response.ok) {
      return await response.json()
    }
  } catch {
    // API not available, use defaults
  }
  return null
}

/**
 * Load and apply theme
 */
async function loadTheme(gameId?: string | null): Promise<void> {
  // Try game-specific theme first, fall back to global
  let serverTheme: ThemeConfig | null = null

  if (gameId) {
    serverTheme = await fetchTheme(gameId)
  }

  // Fall back to global theme if no game theme
  if (!serverTheme) {
    serverTheme = await fetchTheme(null)
  }

  if (serverTheme) {
    config.value = { ...defaultConfig, ...serverTheme }
  } else {
    config.value = { ...defaultConfig }
  }

  // Load fonts first, then apply theme
  await loadThemeFonts(config.value)
  applyTheme(config.value)
}

/**
 * Start polling for theme updates
 */
function startPolling(intervalMs = 5000): void {
  if (pollingInterval) return

  pollingInterval = setInterval(async () => {
    const serverTheme = await fetchTheme(currentSessionId.value)
    if (serverTheme) {
      const newConfig = { ...defaultConfig, ...serverTheme }
      // Only update if changed
      if (JSON.stringify(newConfig) !== JSON.stringify(config.value)) {
        config.value = newConfig
        await loadThemeFonts(config.value)
        applyTheme(config.value)
      }
    }
  }, intervalMs)
}

/**
 * Stop polling for theme updates
 */
function stopPolling(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

/**
 * Set the current game for theme and favicon loading.
 * This is the single function entity views should call to set game context.
 */
function setGameContext(gameId: string | null): void {
  if (gameId !== currentSessionId.value) {
    currentSessionId.value = gameId
    loadTheme(gameId)
    setFaviconContext(gameId)
  }
}

/**
 * Main composable hook
 */
export function useTheme() {
  const route = useRoute()

  // Computed game ID from route
  const gameId = computed(() => {
    // Get gameId from route params
    if (route.params.gameId) {
      return route.params.gameId as string
    }
    return null
  })

  onMounted(() => {
    // Initial load with current game
    currentSessionId.value = gameId.value
    loadTheme(gameId.value)
    startPolling()
  })

  onUnmounted(() => {
    stopPolling()
  })

  // Watch for game changes
  watch(gameId, (newGameId) => {
    setGameContext(newGameId)
  })

  // Watch config for external changes
  watch(config, async (newConfig) => {
    await loadThemeFonts(newConfig)
    applyTheme(newConfig)
  }, { deep: true })

  return {
    config,
    loadTheme: () => loadTheme(currentSessionId.value),
    setGameContext,
    startPolling,
    stopPolling,
    defaultConfig,
    loadedFonts,
    gameId,
  }
}
