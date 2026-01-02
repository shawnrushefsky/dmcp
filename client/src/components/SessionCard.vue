<script setup lang="ts">
import type { Session } from '../types'

defineProps<{
  session: Session
}>()

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}
</script>

<template>
  <div class="card session-card">
    <img
      v-if="session.titleImageId"
      :src="`/images/${session.titleImageId}/file?width=400`"
      :alt="session.name"
      class="session-title-image"
    />
    <h3>
      <router-link :to="`/sessions/${session.id}`">{{ session.name }}</router-link>
    </h3>
    <p class="muted">{{ truncate(session.setting, 150) }}</p>
    <div class="stat">
      <span class="stat-label">Style</span>
      <span>{{ session.style }}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Created</span>
      <span>{{ formatDate(session.createdAt) }}</span>
    </div>
  </div>
</template>

<style scoped>
.session-card {
  overflow: hidden;
}
.session-title-image {
  width: 100%;
  height: 150px;
  object-fit: cover;
  margin: -15px -15px 15px -15px;
  width: calc(100% + 30px);
  border-radius: 8px 8px 0 0;
}
</style>
