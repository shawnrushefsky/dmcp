<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { StoredImage, SessionState } from '../types'
import SessionTabs from '../components/SessionTabs.vue'
import ImageCard from '../components/ImageCard.vue'

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
  <div v-if="loading" class="loading">Loading...</div>
  <div v-else-if="state">
    <h2>Images</h2>

    <SessionTabs :session-id="sessionId" active="images" />

    <div v-if="images.length" class="image-grid">
      <ImageCard v-for="img in images" :key="img.id" :image="img" />
    </div>
    <p v-else class="empty">No images stored yet.</p>
  </div>
  <p v-else class="empty">Session not found.</p>
</template>
