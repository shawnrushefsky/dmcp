<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Game } from '../types'

const props = defineProps<{
  game: Game
}>()

// Track loaded fonts for this card
const fontsLoaded = ref(false)

// Border radius mapping
const BORDER_RADIUS_MAP = {
  sharp: '0px',
  rounded: '12px',
  soft: '24px',
} as const

// Compute inline styles from game theme
const cardStyle = computed(() => {
  const theme = props.game.theme
  if (!theme) return {}

  const borderRadius = BORDER_RADIUS_MAP[theme.borderRadius] || '12px'

  return {
    '--card-bg': theme.bgElevated,
    '--card-bg-secondary': theme.bgSecondary,
    '--card-text': theme.textColor,
    '--card-text-muted': theme.textMuted,
    '--card-accent': theme.accentColor,
    '--card-accent-hover': theme.accentHover,
    '--card-border': theme.borderColor,
    '--card-border-radius': borderRadius,
    '--card-font-display': theme.fontDisplay ? `'${theme.fontDisplay}', system-ui, sans-serif` : undefined,
    '--card-font-body': theme.fontBody ? `'${theme.fontBody}', system-ui, sans-serif` : undefined,
  } as Record<string, string | undefined>
})

// Load Google fonts for this card's theme
async function loadFont(fontName: string): Promise<void> {
  if (!fontName) return

  const systemFonts = ['system-ui', 'sans-serif', 'serif', 'monospace']
  if (systemFonts.some(sf => fontName.toLowerCase().includes(sf))) return

  const encodedFont = encodeURIComponent(fontName)
  const linkId = `google-font-${encodedFont}`

  if (document.getElementById(linkId)) return

  const link = document.createElement('link')
  link.id = linkId
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${encodedFont.replace(/%20/g, '+')}:wght@400;600;700&display=swap`
  document.head.appendChild(link)
}

onMounted(async () => {
  const theme = props.game.theme
  if (theme) {
    await Promise.all([
      loadFont(theme.fontDisplay),
      loadFont(theme.fontBody),
    ])
    fontsLoaded.value = true
  }
})

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}
</script>

<template>
  <div
    class="card game-card"
    :class="{ 'has-theme': game.theme }"
    :style="cardStyle"
    :data-card-style="game.theme?.cardStyle"
  >
    <img
      v-if="game.titleImageId"
      :src="`/images/${game.titleImageId}/file?width=400`"
      :alt="game.name"
      class="game-title-image"
    />
    <h3>
      <router-link :to="`/games/${game.id}`">{{ game.name }}</router-link>
    </h3>
    <p class="muted">{{ truncate(game.setting, 150) }}</p>
    <div class="stat">
      <span class="stat-label">Style</span>
      <span>{{ game.style }}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Created</span>
      <span>{{ formatDate(game.createdAt) }}</span>
    </div>
  </div>
</template>

<style scoped>
.game-card {
  overflow: hidden;
}

/* When card has a custom theme, use its CSS variables */
.game-card.has-theme {
  background: var(--card-bg);
  border-color: var(--card-border);
  border-radius: var(--card-border-radius);
  color: var(--card-text);
  font-family: var(--card-font-body);
}

.game-card.has-theme h3 {
  font-family: var(--card-font-display);
}

.game-card.has-theme h3 a {
  color: var(--card-accent);
}

.game-card.has-theme h3 a:hover {
  color: var(--card-accent-hover);
}

.game-card.has-theme .muted {
  color: var(--card-text-muted);
}

.game-card.has-theme .stat-label {
  color: var(--card-text-muted);
}

.game-title-image {
  width: 100%;
  height: 150px;
  object-fit: cover;
  margin: -15px -15px 15px -15px;
  width: calc(100% + 30px);
  border-radius: 8px 8px 0 0;
}

.game-card.has-theme .game-title-image {
  border-radius: var(--card-border-radius) var(--card-border-radius) 0 0;
}
</style>
