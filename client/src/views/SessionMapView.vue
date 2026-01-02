<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { MapData, SessionState } from '../types'
import SessionTabs from '../components/SessionTabs.vue'
import AsciiBox from '../components/AsciiBox.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const route = useRoute()
const { getSession, getMap, loading } = useApi()
const state = ref<SessionState | null>(null)
const mapData = ref<MapData | null>(null)

const sessionId = computed(() => route.params.sessionId as string)

onMounted(async () => {
  const [sessionResult, mapResult] = await Promise.all([
    getSession(sessionId.value),
    getMap(sessionId.value),
  ])
  state.value = sessionResult
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

    <SessionTabs :session-id="sessionId" active="map" :counts="state.counts" />

    <div class="map-container">
      <AsciiBox v-if="mapData?.ascii" :content="mapData.ascii" />
      <p v-else class="empty">No map data available. Create some locations first.</p>
    </div>

    <template v-if="mapData">
      <h3 class="mt-30">Locations</h3>
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
  </div>
  <p v-else class="empty">Session not found.</p>
</template>
