<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '../composables/useApi'
import type { Game } from '../types'
import GameCard from '../components/GameCard.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const { getGames, loading } = useApi()
const games = ref<Game[]>([])

onMounted(async () => {
  games.value = await getGames()
})
</script>

<template>
  <div class="home-view">
    <h2>Games</h2>

    <!-- Loading State -->
    <div v-if="loading" class="grid">
      <SkeletonLoader v-for="i in 3" :key="i" variant="card" />
    </div>

    <!-- Games Grid -->
    <div v-else-if="games.length" class="grid animate-fade-in">
      <GameCard v-for="game in games" :key="game.id" :game="game" />
    </div>

    <!-- Empty State -->
    <div v-else class="empty">
      <div class="empty-icon">🎮</div>
      <div class="empty-title">No Games</div>
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
