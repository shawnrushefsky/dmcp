<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import { useEntityLinker } from '../composables/useEntityLinker'
import { useTheme } from '../composables/useTheme'
import { useGameEvents, type GameEvent } from '../composables/useGameEvents'
import type { Quest, Breadcrumb, GameState } from '../types'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const route = useRoute()
const { getQuest, getGame, loading } = useApi()
const { linkText, setGameState } = useEntityLinker()
const { setSession } = useTheme()

const quest = ref<Quest | null>(null)
const gameState = ref<GameState | null>(null)

const questId = computed(() => route.params.questId as string)
const currentGameId = computed(() => quest.value?.gameId || '')

// Subscribe to realtime updates (will connect when gameId becomes available)
const { on } = useGameEvents(currentGameId)

const breadcrumbs = computed<Breadcrumb[]>(() => {
  if (!quest.value) return []
  return [
    { label: 'Games', href: '/' },
    { label: gameState.value?.game.name || 'Loading...', href: `/games/${quest.value.gameId}` },
    { label: quest.value.name },
  ]
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

  // Fetch game state for entity linking and theming
  if (q) {
    setSession(q.gameId)
    gameState.value = await getGame(q.gameId)
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
      <span class="tag">{{ quest.status }}</span>
    </h2>

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
  </div>
  <p v-else class="empty">Quest not found.</p>
</template>
