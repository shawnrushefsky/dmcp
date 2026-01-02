<script setup lang="ts">
import type { Location } from '../types'
import { useTheme } from '../composables/useTheme'

defineProps<{
  location: Location
}>()

const { config } = useTheme()

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}
</script>

<template>
  <div class="card location-card">
    <img
      v-if="location.primaryImageId && config.showImages"
      :src="`/images/${location.primaryImageId}/file?width=200&height=200`"
      :alt="location.name"
      class="entity-thumb"
    />
    <div class="card-content">
      <h3>
        <router-link :to="`/locations/${location.id}`">{{ location.name }}</router-link>
      </h3>
      <p class="muted text-sm">{{ truncate(location.description, 100) }}</p>
    </div>
  </div>
</template>

<style scoped>
.location-card {
  display: flex;
  gap: 15px;
}
.entity-thumb {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}
.card-content {
  flex: 1;
  min-width: 0;
}
.card-content h3 {
  margin-top: 0;
}
</style>
