<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { NarrativeEvent, SessionState } from '../types'
import SessionTabs from '../components/SessionTabs.vue'
import EventCard from '../components/EventCard.vue'

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
  <div v-if="loading" class="loading">Loading...</div>
  <div v-else-if="state">
    <h2>Narrative History</h2>

    <SessionTabs :session-id="sessionId" active="history" />

    <template v-if="events.length">
      <EventCard v-for="event in events" :key="event.id" :event="event" />
    </template>
    <p v-else class="empty">No events recorded yet.</p>
  </div>
  <p v-else class="empty">Session not found.</p>
</template>
