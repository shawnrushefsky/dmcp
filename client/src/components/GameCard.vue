<script setup lang="ts">
import type { Game } from '../types'

defineProps<{
  game: Game
}>()

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}
</script>

<template>
  <div class="card game-card">
    <img
      v-if="game.titleImageId"
      :src="`/images/${game.titleImageId}/file?width=400`"
      :alt="game.name"
      class="game-title-image"
    />
    <h3>
      <router-link :to="`/games/${game.id}`">{{ game.name }}</router-link>
    </h3>
    <p class="muted">{{ truncate(game.setting, 150) }}</p>
    <div class="stat">
      <span class="stat-label">Style</span>
      <span>{{ game.style }}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Created</span>
      <span>{{ formatDate(game.createdAt) }}</span>
    </div>
  </div>
</template>

<style scoped>
.game-card {
  overflow: hidden;
}
.game-title-image {
  width: 100%;
  height: 150px;
  object-fit: cover;
  margin: -15px -15px 15px -15px;
  width: calc(100% + 30px);
  border-radius: 8px 8px 0 0;
}
</style>
