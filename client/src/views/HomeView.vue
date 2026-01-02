<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '../composables/useApi'
import type { Session } from '../types'
import SessionCard from '../components/SessionCard.vue'

const { getSessions, loading } = useApi()
const sessions = ref<Session[]>([])

onMounted(async () => {
  sessions.value = await getSessions()
})
</script>

<template>
  <div>
    <h2>Game Sessions</h2>
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="sessions.length" class="grid">
      <SessionCard v-for="session in sessions" :key="session.id" :session="session" />
    </div>
    <p v-else class="empty">No game sessions yet.</p>
  </div>
</template>
