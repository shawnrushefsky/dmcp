<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import { useGameEvents } from '../composables/useGameEvents'
import type { GameState, Breadcrumb } from '../types'
import GameTabs from '../components/GameTabs.vue'
import LocationCard from '../components/LocationCard.vue'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const route = useRoute()
const { getGame, loading } = useApi()
const state = ref<GameState | null>(null)

const gameId = computed(() => route.params.gameId as string)
const { on } = useGameEvents(gameId)

const breadcrumbs = computed<Breadcrumb[]>(() => [
  { label: 'Games', href: '/' },
  { label: state.value?.game.name || 'Loading...', href: `/games/${gameId.value}` },
  { label: 'Locations' },
])

async function refresh() {
  state.value = await getGame(gameId.value)
}

onMounted(async () => {
  state.value = await getGame(gameId.value)
  on('location:updated', refresh)
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
    <SkeletonLoader variant="title" width="180px" class="mt-6" />
    <div class="two-col">
      <div>
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="card" class="mt-4" />
      </div>
      <div>
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="card" class="mt-4" />
      </div>
    </div>
  </div>

  <!-- Content -->
  <div v-else-if="state" class="animate-fade-in">
    <Breadcrumbs :items="breadcrumbs" />
    <h2>{{ state.game.name }}</h2>
    <p class="mb-20">{{ state.game.setting }}</p>

    <GameTabs :game-id="gameId" active="locations" :counts="state.counts" />

    <h3>All Locations ({{ state.locations.length }})</h3>
    <div class="two-col">
      <div>
        <template v-for="(loc, i) in state.locations" :key="loc.id">
          <LocationCard v-if="i % 2 === 0" :location="loc" />
        </template>
      </div>
      <div>
        <template v-for="(loc, i) in state.locations" :key="loc.id">
          <LocationCard v-if="i % 2 === 1" :location="loc" />
        </template>
      </div>
    </div>
    <p v-if="!state.locations.length" class="empty">No locations.</p>
  </div>
  <p v-else class="empty">Game not found.</p>
</template>
