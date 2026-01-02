<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { SessionState, Breadcrumb } from '../types'
import SessionTabs from '../components/SessionTabs.vue'
import LocationCard from '../components/LocationCard.vue'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

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
  <!-- Loading State -->
  <div v-if="loading" class="session-loading">
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
    <h2>{{ state.session.name }}</h2>
    <p class="mb-20">{{ state.session.setting }}</p>

    <SessionTabs :session-id="sessionId" active="locations" :counts="state.counts" />

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
