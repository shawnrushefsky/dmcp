<script setup lang="ts">
import { computed } from 'vue'
import type { Location } from '../types'
import { useTheme } from '../composables/useTheme'

const props = defineProps<{
  location: Location
  isPlayerHere?: boolean
}>()

const { config } = useTheme()

const hasImage = computed(() => props.location.primaryImageId && config.value.showImages)

const exitCount = computed(() => {
  // Exits are in location.properties.exits
  const exits = props.location.properties?.exits
  if (exits && Array.isArray(exits)) {
    return exits.length
  }
  return 0
})

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}
</script>

<template>
  <router-link
    :to="`/locations/${location.id}`"
    class="card location-card clickable"
    :class="{ 'player-here': isPlayerHere }"
  >
    <!-- Image or Location Placeholder -->
    <div class="image-container">
      <img
        v-if="hasImage"
        :src="`/images/${location.primaryImageId}/file?width=200&height=200`"
        :alt="location.name"
        class="entity-thumb"
      />
      <div v-else class="location-placeholder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </div>

      <!-- You Are Here Indicator -->
      <span v-if="isPlayerHere" class="here-badge">
        <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        You are here
      </span>

      <!-- Exit Count Badge -->
      <span v-if="exitCount > 0" class="exit-badge">
        {{ exitCount }} {{ exitCount === 1 ? 'exit' : 'exits' }}
      </span>
    </div>

    <div class="card-content">
      <h3>{{ location.name }}</h3>
      <p class="muted text-sm">{{ truncate(location.description, 100) }}</p>
    </div>
  </router-link>
</template>

<style scoped>
.location-card {
  display: flex;
  gap: 15px;
  text-decoration: none;
  color: inherit;
}

.location-card.player-here {
  border-color: var(--accent, #7c3aed);
  box-shadow: 0 0 0 1px var(--accent, #7c3aed), var(--shadow-glow, 0 0 20px rgba(124, 58, 237, 0.3));
}

.image-container {
  position: relative;
  flex-shrink: 0;
}

.entity-thumb {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
}

.location-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--bg-elevated, #252545) 0%, var(--bg-secondary, #1a1a2e) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border, #3a3a5c);
}

.location-placeholder svg {
  width: 32px;
  height: 32px;
  color: var(--text-muted, #9090a0);
}

.here-badge {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--accent, #7c3aed);
  color: white;
  white-space: nowrap;
}

.exit-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--bg-elevated, #252545);
  border: 1px solid var(--border, #3a3a5c);
  color: var(--text-muted, #9090a0);
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-content h3 {
  margin-top: 0;
  margin-bottom: 8px;
}
</style>
