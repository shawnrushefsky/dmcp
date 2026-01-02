<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { MapData, SessionState } from '../types'
import SessionTabs from '../components/SessionTabs.vue'
import AsciiBox from '../components/AsciiBox.vue'

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
  <div v-if="loading" class="loading">Loading...</div>
  <div v-else-if="state">
    <h2>World Map</h2>

    <SessionTabs :session-id="sessionId" active="map" />

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
