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
  <div class="card">
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
