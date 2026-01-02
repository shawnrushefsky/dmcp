<script setup lang="ts">
import type { NarrativeEvent } from '../types'

defineProps<{
  event: NarrativeEvent
}>()

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString()
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}
</script>

<template>
  <div class="card">
    <div class="event-header">
      <span class="tag">{{ event.eventType }}</span>
      <span class="muted text-sm">{{ formatDate(event.timestamp) }}</span>
    </div>
    <p>{{ truncate(event.content, 500) }}</p>
  </div>
</template>

<style scoped>
.event-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}
</style>
