<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { GameState, Relationship } from '../types'
import GameTabs from '../components/GameTabs.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'
import RelationshipGraph from '../components/RelationshipGraph.vue'

const route = useRoute()
const { getGame, getRelationships, loading } = useApi()
const state = ref<GameState | null>(null)
const relationships = ref<Relationship[]>([])

const gameId = computed(() => route.params.gameId as string)

onMounted(async () => {
  const [gameResult, relationshipsResult] = await Promise.all([
    getGame(gameId.value),
    getRelationships(gameId.value),
  ])
  state.value = gameResult
  relationships.value = relationshipsResult
})
</script>

<template>
  <!-- Loading State -->
  <div v-if="loading" class="loading">
    <SkeletonLoader variant="title" width="200px" />
    <div class="tabs-skeleton">
      <SkeletonLoader variant="button" v-for="i in 5" :key="i" width="80px" />
    </div>
    <SkeletonLoader variant="card" height="500px" class="mt-4" />
  </div>

  <!-- Content -->
  <div v-else-if="state" class="animate-fade-in relationships-page">
    <h2>Relationships</h2>

    <GameTabs :game-id="gameId" active="relationships" :counts="state.counts" />

    <template v-if="relationships.length > 0">
      <p class="text-muted mb-4">
        Click and drag nodes to rearrange. Scroll to zoom. Click a node to view details.
      </p>
      <div class="graph-wrapper">
        <RelationshipGraph :relationships="relationships" />
      </div>
    </template>
    <p v-else class="empty">
      No relationships found. Relationships between characters and factions will appear here.
    </p>
  </div>
  <p v-else class="empty">Game not found.</p>
</template>

<style scoped>
.relationships-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 180px);
}

.graph-wrapper {
  flex: 1;
  min-height: 500px;
}

.tabs-skeleton {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.mb-4 {
  margin-bottom: 16px;
}

.mt-4 {
  margin-top: 16px;
}
</style>
