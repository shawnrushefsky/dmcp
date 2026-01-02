<script setup lang="ts">
import type { Location } from '../types'

defineProps<{
  location: Location
}>()

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}
</script>

<template>
  <div class="card">
    <h3>
      <router-link :to="`/locations/${location.id}`">{{ location.name }}</router-link>
    </h3>
    <p class="muted text-sm">{{ truncate(location.description, 100) }}</p>
  </div>
</template>
