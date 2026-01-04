<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import { useEntityLinker } from '../composables/useEntityLinker'
import { useGameEvents } from '../composables/useGameEvents'
import { useTheme } from '../composables/useTheme'
import type { GameState, Note, Breadcrumb } from '../types'
import GameTabs from '../components/GameTabs.vue'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const route = useRoute()
const { getGame, loading } = useApi()
const { linkText, setGameState } = useEntityLinker()
const { config } = useTheme()
const state = ref<GameState | null>(null)

const gameId = computed(() => route.params.gameId as string)
const { on } = useGameEvents(gameId)

const breadcrumbs = computed<Breadcrumb[]>(() => [
  { label: 'Games', href: '/' },
  { label: state.value?.game.name || 'Loading...', href: `/games/${gameId.value}` },
  { label: 'Notes' },
])

const pinnedNotes = computed(() =>
  state.value?.notes.filter((n: Note) => n.pinned) || []
)

const unpinnedNotes = computed(() =>
  state.value?.notes.filter((n: Note) => !n.pinned) || []
)

// Group notes by category
const notesByCategory = computed(() => {
  const grouped: Record<string, Note[]> = {}
  for (const note of unpinnedNotes.value) {
    const category = note.category || 'Uncategorized'
    if (!grouped[category]) {
      grouped[category] = []
    }
    grouped[category].push(note)
  }
  return grouped
})

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

async function refresh() {
  state.value = await getGame(gameId.value)
}

// Update entity linker when game state changes
watch(state, (newState) => setGameState(newState))

onMounted(async () => {
  state.value = await getGame(gameId.value)
  on('*', refresh)
})
</script>

<template>
  <!-- Loading State -->
  <div v-if="loading" class="game-loading">
    <SkeletonLoader variant="text" width="200px" />
    <SkeletonLoader variant="title" width="300px" />
    <SkeletonLoader variant="text" width="80%" />
    <div class="tabs-skeleton">
      <SkeletonLoader variant="button" v-for="i in 5" :key="i" width="80px" />
    </div>
    <SkeletonLoader variant="card" class="mt-6" />
    <SkeletonLoader variant="card" class="mt-4" />
  </div>

  <!-- Content -->
  <div v-else-if="state" class="animate-fade-in">
    <Breadcrumbs :items="breadcrumbs" />
    <h2>{{ state.game.name }}</h2>
    <p class="mb-20">{{ state.game.setting }}</p>

    <GameTabs :game-id="gameId" active="notes" :counts="state.counts" />

    <!-- Pinned Notes -->
    <template v-if="pinnedNotes.length">
      <h3>Pinned Notes</h3>
      <div class="notes-grid">
        <div v-for="note in pinnedNotes" :key="note.id" class="card note-card pinned">
          <img
            v-if="note.primaryImageId && config.showImages"
            :src="`/images/${note.primaryImageId}/file?width=300`"
            :alt="note.title"
            class="note-image"
            loading="lazy"
          />
          <div class="note-header">
            <span class="pin-icon">📌</span>
            <h4>{{ note.title }}</h4>
          </div>
          <span v-if="note.category" class="note-category">{{ note.category }}</span>
          <div class="note-content linked-content" v-html="linkText(note.content)" />
          <div v-if="note.tags.length" class="note-tags">
            <span v-for="tag in note.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
          <div class="note-meta">
            {{ formatDate(note.updatedAt) }}
          </div>
        </div>
      </div>
    </template>

    <!-- Notes by Category -->
    <template v-for="(notes, category) in notesByCategory" :key="category">
      <h3 :class="{ 'mt-30': pinnedNotes.length || Object.keys(notesByCategory).indexOf(category) > 0 }">
        {{ category }} ({{ notes.length }})
      </h3>
      <div class="notes-grid">
        <div v-for="note in notes" :key="note.id" class="card note-card">
          <img
            v-if="note.primaryImageId && config.showImages"
            :src="`/images/${note.primaryImageId}/file?width=300`"
            :alt="note.title"
            class="note-image"
            loading="lazy"
          />
          <div class="note-header">
            <h4>{{ note.title }}</h4>
          </div>
          <div class="note-content linked-content" v-html="linkText(note.content)" />
          <div v-if="note.tags.length" class="note-tags">
            <span v-for="tag in note.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
          <div class="note-meta">
            {{ formatDate(note.updatedAt) }}
          </div>
        </div>
      </div>
    </template>

    <p v-if="!pinnedNotes.length && !unpinnedNotes.length" class="empty">No notes yet.</p>
  </div>
  <p v-else class="empty">Game not found.</p>
</template>


<style scoped>
.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);
}

.note-card {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.note-image {
  width: 100%;
  max-height: 150px;
  object-fit: cover;
  border-radius: 4px;
  margin-bottom: var(--space-2);
}

.note-card.pinned {
  border-left: 3px solid var(--accent);
}

.note-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.note-header h4 {
  margin: 0;
  color: var(--text);
}

.pin-icon {
  font-size: var(--text-sm);
}

.note-category {
  font-size: var(--text-xs);
  padding: 2px 8px;
  border-radius: 12px;
  background: var(--accent);
  color: white;
  align-self: flex-start;
}

.note-content {
  color: var(--text-muted);
  font-size: var(--text-sm);
  line-height: 1.6;
  flex-grow: 1;
  /* Limit height with overflow */
  max-height: 150px;
  overflow: hidden;
  position: relative;
}

.note-content::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 30px;
  background: linear-gradient(transparent, var(--bg-secondary));
}

.note-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.tag {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: var(--text-xs);
  background: var(--bg-elevated);
  color: var(--text-muted);
}

.note-meta {
  font-size: var(--text-xs);
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  padding-top: var(--space-2);
  margin-top: var(--space-2);
}

.game-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.tabs-skeleton {
  display: flex;
  gap: var(--space-2);
}
</style>
