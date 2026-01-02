<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { NarrativeEvent, SessionState } from '../types'
import SessionTabs from '../components/SessionTabs.vue'
import EventCard from '../components/EventCard.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const route = useRoute()
const { getSession, getHistory, loading } = useApi()
const state = ref<SessionState | null>(null)
const events = ref<NarrativeEvent[]>([])

const sessionId = computed(() => route.params.sessionId as string)

onMounted(async () => {
  const [sessionResult, historyResult] = await Promise.all([
    getSession(sessionId.value),
    getHistory(sessionId.value, 50),
  ])
  state.value = sessionResult
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

    <SessionTabs :session-id="sessionId" active="history" />

    <template v-if="events.length">
      <EventCard v-for="event in events" :key="event.id" :event="event" />
    </template>
    <p v-else class="empty">No events recorded yet.</p>
  </div>
  <p v-else class="empty">Session not found.</p>
</template>
