<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import { useEntityLinker } from '../composables/useEntityLinker'
import { useTheme } from '../composables/useTheme'
import { useGameEvents, type GameEvent } from '../composables/useGameEvents'
import type { Quest, Breadcrumb, GameState, EntityImages } from '../types'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const route = useRoute()
const { getQuest, getGame, getEntityImages, loading } = useApi()
const { linkText, setGameState } = useEntityLinker()
const { setGameContext } = useTheme()

const quest = ref<Quest | null>(null)
const gameState = ref<GameState | null>(null)
const images = ref<EntityImages>({ images: [], primaryImage: null })

const questId = computed(() => route.params.questId as string)
const currentGameId = computed(() => quest.value?.gameId || '')

// Subscribe to realtime updates (will connect when gameId becomes available)
const { on } = useGameEvents(currentGameId)

const breadcrumbs = computed<Breadcrumb[]>(() => {
  if (!quest.value) return []
  return [
    { label: 'Games', href: '/' },
    { label: gameState.value?.game.name || 'Loading...', href: `/games/${quest.value.gameId}` },
    { label: 'Quests', href: `/games/${quest.value.gameId}/quests` },
    { label: quest.value.name },
  ]
})

const statusClass = computed(() => {
  if (!quest.value) return ''
  switch (quest.value.status) {
    case 'active': return 'tag-active'
    case 'completed': return 'tag-success'
    case 'failed': return 'tag-danger'
    case 'abandoned': return 'tag-muted'
    default: return ''
  }
})

// Update entity linker when game state changes
watch(gameState, (newState) => setGameState(newState))

function handleQuestEvent(event: GameEvent) {
  // Only refresh if this event is for our quest
  if (event.entityId === questId.value) {
    getQuest(questId.value).then(q => {
      if (q) quest.value = q
    })
  }
}

onMounted(async () => {
  const q = await getQuest(questId.value)
  quest.value = q

  // Fetch game state for entity linking, theming, and favicon
  if (q) {
    setGameContext(q.gameId)
    const [state, imgs] = await Promise.all([
      getGame(q.gameId),
      getEntityImages(questId.value, 'quest'),
    ])
    gameState.value = state
    images.value = imgs
  }

  // Listen for quest updates
  on('quest:updated', handleQuestEvent)
})
</script>

<template>
  <!-- Loading State -->
  <div v-if="loading" class="quest-loading">
    <SkeletonLoader variant="text" width="200px" />
    <SkeletonLoader variant="title" width="300px" />
    <SkeletonLoader variant="card" class="mt-4" />
    <SkeletonLoader variant="card" class="mt-4" />
  </div>

  <!-- Content -->
  <div v-else-if="quest" class="animate-fade-in">
    <Breadcrumbs :items="breadcrumbs" />
    <h2>
      {{ quest.name }}
      <span class="tag" :class="statusClass">{{ quest.status }}</span>
    </h2>

    <!-- Primary Image -->
    <img
      v-if="images.primaryImage"
      :src="`/images/${images.primaryImage.id}/file`"
      :alt="quest.name"
      class="quest-image"
    />

    <div class="card">
      <h3>Description</h3>
      <p class="linked-content" v-html="linkText(quest.description)"></p>
    </div>

    <div class="card">
      <h3>Objectives</h3>
      <div v-for="obj in quest.objectives" :key="obj.id" class="stat">
        <span class="linked-content">
          {{ obj.completed ? '✅' : '⬜' }} <span v-html="linkText(obj.description)"></span>
        </span>
        <span v-if="obj.optional" class="tag">Optional</span>
      </div>
    </div>

    <div v-if="quest.rewards" class="card">
      <h3>Rewards</h3>
      <p class="linked-content" v-html="linkText(quest.rewards)"></p>
    </div>

    <!-- Image Gallery -->
    <div v-if="images.images.length > 1" class="card">
      <h3>Gallery</h3>
      <div class="image-grid">
        <div v-for="img in images.images" :key="img.id" class="image-card">
          <router-link :to="`/images/${img.id}`">
            <img
              :src="`/images/${img.id}/file?width=200`"
              :alt="img.label || 'Image'"
              loading="lazy"
            />
          </router-link>
        </div>
      </div>
    </div>
  </div>
  <p v-else class="empty">Quest not found.</p>
</template>

<style scoped>
.quest-image {
  width: 100%;
  max-width: 400px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.tag-active {
  background: var(--accent);
  color: white;
}

.tag-success {
  background: var(--success);
  color: white;
}

.tag-danger {
  background: var(--danger);
  color: white;
}

.tag-muted {
  background: var(--bg-elevated);
  color: var(--text-muted);
}
</style>
