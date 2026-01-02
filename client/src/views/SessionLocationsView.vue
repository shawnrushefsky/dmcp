<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { SessionState, Breadcrumb } from '../types'
import SessionTabs from '../components/SessionTabs.vue'
import LocationCard from '../components/LocationCard.vue'
import Breadcrumbs from '../components/Breadcrumbs.vue'

const route = useRoute()
const { getSession, loading } = useApi()
const state = ref<SessionState | null>(null)

const sessionId = computed(() => route.params.sessionId as string)

const breadcrumbs = computed<Breadcrumb[]>(() => [
  { label: 'Games', href: '/' },
  { label: state.value?.session.name || 'Session', href: `/sessions/${sessionId.value}` },
  { label: 'Locations' },
])

onMounted(async () => {
  state.value = await getSession(sessionId.value)
})
</script>

<template>
  <div v-if="loading" class="loading">Loading...</div>
  <div v-else-if="state">
    <Breadcrumbs :items="breadcrumbs" />
    <h2>{{ state.session.name }}</h2>
    <p class="mb-20">{{ state.session.setting }}</p>

    <SessionTabs :session-id="sessionId" active="locations" />

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
  <p v-else class="empty">Session not found.</p>
</template>
