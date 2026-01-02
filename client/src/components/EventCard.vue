<script setup lang="ts">
import { computed } from 'vue'
import type { NarrativeEvent } from '../types'

const props = defineProps<{
  event: NarrativeEvent
  linkText?: (text: string) => string
}>()

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString()
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

// Escape HTML for plain text display
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const formattedContent = computed(() => {
  const truncated = truncate(props.event.content, 500)
  if (props.linkText) {
    return props.linkText(truncated)
  }
  // Fall back to plain text with line breaks
  return escapeHtml(truncated).replace(/\n/g, '<br>')
})
</script>

<template>
  <div class="card">
    <div class="event-header">
      <span class="tag">{{ event.eventType }}</span>
      <span class="muted text-sm">{{ formatDate(event.timestamp) }}</span>
    </div>
    <p class="linked-content" v-html="formattedContent"></p>
  </div>
</template>

<style scoped>
.event-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}
</style>
