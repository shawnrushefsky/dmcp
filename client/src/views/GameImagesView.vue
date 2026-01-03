<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { StoredImage, GameState } from '../types'
import GameTabs from '../components/GameTabs.vue'
import ImageCard from '../components/ImageCard.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const route = useRoute()
const { getGame, getGameImages, loading } = useApi()
const state = ref<GameState | null>(null)
const images = ref<StoredImage[]>([])

const gameId = computed(() => route.params.gameId as string)

onMounted(async () => {
  const [gameResult, imagesResult] = await Promise.all([
    getGame(gameId.value),
    getGameImages(gameId.value),
  ])
  state.value = gameResult
  images.value = imagesResult
})
</script>

<template>
  <!-- Loading State -->
  <div v-if="loading" class="images-loading">
    <SkeletonLoader variant="title" width="200px" />
    <div class="tabs-skeleton">
      <SkeletonLoader variant="button" v-for="i in 5" :key="i" width="80px" />
    </div>
    <div class="image-grid-skeleton">
      <SkeletonLoader variant="image" v-for="i in 6" :key="i" height="200px" />
    </div>
  </div>

  <!-- Content -->
  <div v-else-if="state" class="animate-fade-in">
    <h2>Images</h2>

    <GameTabs :game-id="gameId" active="images" :counts="state.counts" />

    <div v-if="images.length" class="image-grid">
      <ImageCard v-for="img in images" :key="img.id" :image="img" />
    </div>
    <p v-else class="empty">No images stored yet.</p>
  </div>
  <p v-else class="empty">Game not found.</p>
</template>
