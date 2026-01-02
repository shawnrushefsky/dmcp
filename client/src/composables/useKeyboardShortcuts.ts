import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

interface ShortcutHandler {
  key: string
  handler: () => void
  description: string
}

// Global state for command palette visibility
export const isCommandPaletteOpen = ref(false)
export const isKeyboardHelpOpen = ref(false)

// Key sequence tracking (for vim-style shortcuts like "g c")
let keySequence = ''
let keySequenceTimeout: ReturnType<typeof setTimeout> | null = null

export function useKeyboardShortcuts(sessionId?: string) {
  const router = useRouter()

  const shortcuts: ShortcutHandler[] = [
    {
      key: '/',
      handler: () => { isCommandPaletteOpen.value = true },
      description: 'Open search',
    },
    {
      key: 'Escape',
      handler: () => {
        isCommandPaletteOpen.value = false
        isKeyboardHelpOpen.value = false
      },
      description: 'Close modals',
    },
    {
      key: '?',
      handler: () => { isKeyboardHelpOpen.value = !isKeyboardHelpOpen.value },
      description: 'Toggle keyboard shortcuts help',
    },
  ]

  // Vim-style "g + key" navigation shortcuts
  const gShortcuts: Record<string, { path: string; description: string }> = {
    h: { path: '/', description: 'Go home' },
    o: { path: sessionId ? `/sessions/${sessionId}` : '/', description: 'Go to overview' },
    c: { path: sessionId ? `/sessions/${sessionId}/characters` : '/', description: 'Go to characters' },
    l: { path: sessionId ? `/sessions/${sessionId}/locations` : '/', description: 'Go to locations' },
    q: { path: sessionId ? `/sessions/${sessionId}/quests` : '/', description: 'Go to quests' },
    m: { path: sessionId ? `/sessions/${sessionId}/map` : '/', description: 'Go to map' },
    i: { path: sessionId ? `/sessions/${sessionId}/images` : '/', description: 'Go to images' },
  }

  function handleKeyDown(event: KeyboardEvent) {
    // Ignore if typing in an input
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      (event.target as HTMLElement).isContentEditable
    ) {
      // Allow Escape to close modals even when in inputs
      if (event.key === 'Escape') {
        isCommandPaletteOpen.value = false
        isKeyboardHelpOpen.value = false
      }
      return
    }

    // Handle Cmd/Ctrl+K for search
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault()
      isCommandPaletteOpen.value = true
      return
    }

    // Check simple shortcuts
    for (const shortcut of shortcuts) {
      if (event.key === shortcut.key && !event.metaKey && !event.ctrlKey) {
        // Don't prevent default for ? to allow typing
        if (event.key !== '?') {
          event.preventDefault()
        }
        shortcut.handler()
        return
      }
    }

    // Handle vim-style key sequences (g + key)
    const key = event.key.toLowerCase()

    // Clear previous timeout
    if (keySequenceTimeout) {
      clearTimeout(keySequenceTimeout)
      keySequenceTimeout = null
    }

    // If first key is 'g', start sequence
    if (key === 'g' && keySequence === '') {
      keySequence = 'g'
      keySequenceTimeout = setTimeout(() => {
        keySequence = ''
      }, 500)
      return
    }

    // If we have 'g' and get a second key
    if (keySequence === 'g' && gShortcuts[key]) {
      event.preventDefault()
      router.push(gShortcuts[key].path)
      keySequence = ''
      return
    }

    // Reset sequence on any other key
    keySequence = ''
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  return {
    isCommandPaletteOpen,
    isKeyboardHelpOpen,
    shortcuts: [
      ...shortcuts,
      ...Object.entries(gShortcuts).map(([key, { description }]) => ({
        key: `g ${key}`,
        handler: () => {},
        description,
      })),
    ],
  }
}
