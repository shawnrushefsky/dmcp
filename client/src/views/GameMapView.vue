<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { MapData, GameState } from '../types'
import GameTabs from '../components/GameTabs.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const route = useRoute()
const { getGame, getMap, loading } = useApi()
const state = ref<GameState | null>(null)
const mapData = ref<MapData | null>(null)

const gameId = computed(() => route.params.gameId as string)

onMounted(async () => {
  const [gameResult, mapResult] = await Promise.all([
    getGame(gameId.value),
    getMap(gameId.value),
  ])
  state.value = gameResult
  mapData.value = mapResult
})
</script>

<template>
  <!-- Loading State -->
  <div v-if="loading" class="map-loading">
    <SkeletonLoader variant="title" width="200px" />
    <div class="tabs-skeleton">
      <SkeletonLoader variant="button" v-for="i in 5" :key="i" width="80px" />
    </div>
    <SkeletonLoader variant="card" height="300px" class="mt-4" />
    <SkeletonLoader variant="title" width="150px" class="mt-6" />
    <div class="grid">
      <SkeletonLoader variant="card" v-for="i in 4" :key="i" />
    </div>
  </div>

  <!-- Content -->
  <div v-else-if="state" class="animate-fade-in">
    <h2>World Map</h2>

    <GameTabs :game-id="gameId" active="map" :counts="state.counts" />

    <template v-if="mapData && mapData.nodes.length > 0">
      <h3>Locations</h3>
      <div class="grid">
        <div v-for="node in mapData.nodes" :key="node.id" class="card">
          <h3>
            <router-link :to="`/locations/${node.id}`">{{ node.name }}</router-link>
          </h3>
          <span v-if="node.hasPlayer" class="tag">Player Here</span>
          <p v-if="node.exits.length" class="muted text-sm">
            Exits: {{ node.exits.map((e) => e.direction).join(', ') }}
          </p>
        </div>
      </div>
    </template>
    <p v-else class="empty">No locations found. Create some locations first.</p>
  </div>
  <p v-else class="empty">Game not found.</p>
</template>
