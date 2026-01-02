<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { StoredImage, SessionState } from '../types'
import SessionTabs from '../components/SessionTabs.vue'
import ImageCard from '../components/ImageCard.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const route = useRoute()
const { getSession, getSessionImages, loading } = useApi()
const state = ref<SessionState | null>(null)
const images = ref<StoredImage[]>([])

const sessionId = computed(() => route.params.sessionId as string)

onMounted(async () => {
  const [sessionResult, imagesResult] = await Promise.all([
    getSession(sessionId.value),
    getSessionImages(sessionId.value),
  ])
  state.value = sessionResult
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

    <SessionTabs :session-id="sessionId" active="images" />

    <div v-if="images.length" class="image-grid">
      <ImageCard v-for="img in images" :key="img.id" :image="img" />
    </div>
    <p v-else class="empty">No images stored yet.</p>
  </div>
  <p v-else class="empty">Session not found.</p>
</template>
