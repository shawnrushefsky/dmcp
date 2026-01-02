import { ref, watch, onMounted } from 'vue'

export interface ThemeConfig {
  // Colors
  bgColor: string
  bgSecondary: string
  textColor: string
  textMuted: string
  accentColor: string
  borderColor: string
  successColor: string
  warningColor: string

  // ASCII box colors
  asciiBackground: string
  asciiText: string

  // Display options
  showHealthBars: boolean
  showAsciiSheets: boolean
  showConditionTags: boolean
  showImages: boolean

  // Fonts
  fontFamily: string
  asciiFontFamily: string

  // Custom title
  appTitle: string
}

const defaultConfig: ThemeConfig = {
  bgColor: '#1a1a2e',
  bgSecondary: '#16213e',
  textColor: '#eee',
  textMuted: '#888',
  accentColor: '#e94560',
  borderColor: '#333',
  successColor: '#4ade80',
  warningColor: '#fbbf24',
  asciiBackground: '#000',
  asciiText: '#0f0',
  showHealthBars: true,
  showAsciiSheets: true,
  showConditionTags: true,
  showImages: true,
  fontFamily: "'Segoe UI', system-ui, sans-serif",
  asciiFontFamily: "'Courier New', monospace",
  appTitle: 'DMCP Game Viewer',
}

const config = ref<ThemeConfig>({ ...defaultConfig })
let pollingInterval: ReturnType<typeof setInterval> | null = null

function applyTheme(theme: ThemeConfig) {
  const root = document.documentElement
  root.style.setProperty('--bg', theme.bgColor)
  root.style.setProperty('--bg-secondary', theme.bgSecondary)
  root.style.setProperty('--text', theme.textColor)
  root.style.setProperty('--text-muted', theme.textMuted)
  root.style.setProperty('--accent', theme.accentColor)
  root.style.setProperty('--border', theme.borderColor)
  root.style.setProperty('--success', theme.successColor)
  root.style.setProperty('--warning', theme.warningColor)
  root.style.setProperty('--ascii-bg', theme.asciiBackground)
  root.style.setProperty('--ascii-text', theme.asciiText)
  root.style.setProperty('--font-family', theme.fontFamily)
  root.style.setProperty('--ascii-font', theme.asciiFontFamily)

  document.body.style.fontFamily = theme.fontFamily
}

async function fetchTheme(): Promise<ThemeConfig | null> {
  try {
    const response = await fetch('/api/theme')
    if (response.ok) {
      return await response.json()
    }
  } catch {
    // API not available, use defaults
  }
  return null
}

async function loadTheme() {
  const serverTheme = await fetchTheme()
  if (serverTheme) {
    config.value = { ...defaultConfig, ...serverTheme }
  }
  applyTheme(config.value)
}

function startPolling(intervalMs = 5000) {
  if (pollingInterval) return
  pollingInterval = setInterval(async () => {
    const serverTheme = await fetchTheme()
    if (serverTheme) {
      const newConfig = { ...defaultConfig, ...serverTheme }
      // Only update if changed
      if (JSON.stringify(newConfig) !== JSON.stringify(config.value)) {
        config.value = newConfig
        applyTheme(config.value)
      }
    }
  }, intervalMs)
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

export function useTheme() {
  onMounted(() => {
    loadTheme()
    startPolling()
  })

  watch(config, (newConfig) => {
    applyTheme(newConfig)
  }, { deep: true })

  return {
    config,
    loadTheme,
    startPolling,
    stopPolling,
    defaultConfig,
  }
}
