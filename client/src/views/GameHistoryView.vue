<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import { useEntityLinker } from '../composables/useEntityLinker'
import type { NarrativeEvent, GameState } from '../types'
import GameTabs from '../components/GameTabs.vue'
import EventCard from '../components/EventCard.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const route = useRoute()
const { getGame, getHistory, loading } = useApi()
const { linkText, setGameState } = useEntityLinker()
const state = ref<GameState | null>(null)
const events = ref<NarrativeEvent[]>([])

const gameId = computed(() => route.params.gameId as string)

// Update entity linker when game state changes
watch(state, (newState) => setGameState(newState))

onMounted(async () => {
  const [gameResult, historyResult] = await Promise.all([
    getGame(gameId.value),
    getHistory(gameId.value, 50),
  ])
  state.value = gameResult
  events.value = historyResult
})
</script>

<template>
  <!-- Loading State -->
  <div v-if="loading" class="history-loading">
    <SkeletonLoader variant="title" width="250px" />
    <div class="tabs-skeleton">
      <SkeletonLoader variant="button" v-for="i in 5" :key="i" width="80px" />
    </div>
    <SkeletonLoader variant="card" class="mt-4" />
    <SkeletonLoader variant="card" class="mt-4" />
    <SkeletonLoader variant="card" class="mt-4" />
    <SkeletonLoader variant="card" class="mt-4" />
  </div>

  <!-- Content -->
  <div v-else-if="state" class="animate-fade-in">
    <h2>Narrative History</h2>

    <GameTabs :game-id="gameId" active="history" :counts="state.counts" />

    <template v-if="events.length">
      <EventCard v-for="event in events" :key="event.id" :event="event" :link-text="linkText" />
    </template>
    <p v-else class="empty">No events recorded yet.</p>
  </div>
  <p v-else class="empty">Game not found.</p>
</template>
