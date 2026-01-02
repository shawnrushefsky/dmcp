<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '../composables/useApi'
import type { Session } from '../types'
import SessionCard from '../components/SessionCard.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const { getSessions, loading } = useApi()
const sessions = ref<Session[]>([])

onMounted(async () => {
  sessions.value = await getSessions()
})
</script>

<template>
  <div class="home-view">
    <h2>Game Sessions</h2>

    <!-- Loading State -->
    <div v-if="loading" class="grid">
      <SkeletonLoader v-for="i in 3" :key="i" variant="card" />
    </div>

    <!-- Sessions Grid -->
    <div v-else-if="sessions.length" class="grid animate-fade-in">
      <SessionCard v-for="session in sessions" :key="session.id" :session="session" />
    </div>

    <!-- Empty State -->
    <div v-else class="empty">
      <div class="empty-icon">🎮</div>
      <div class="empty-title">No Game Sessions</div>
      <div class="empty-description">
        Start a new game with the AI dungeon master to see it here.
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-view h2 {
  font-family: var(--font-display);
}
</style>
