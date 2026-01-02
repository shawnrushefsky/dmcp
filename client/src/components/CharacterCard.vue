<script setup lang="ts">
import type { Character } from '../types'
import { useTheme } from '../composables/useTheme'
import HealthBar from './HealthBar.vue'

defineProps<{
  character: Character
  compact?: boolean
}>()

const { config } = useTheme()
</script>

<template>
  <div class="card character-card">
    <img
      v-if="character.primaryImageId && config.showImages"
      :src="`/images/${character.primaryImageId}/file?width=200&height=200`"
      :alt="character.name"
      class="entity-thumb"
    />
    <div class="card-content">
      <h3>
        <router-link :to="`/characters/${character.id}`">{{ character.name }}</router-link>
      </h3>
      <HealthBar
        v-if="config.showHealthBars && !compact"
        :current="character.status.health"
        :max="character.status.maxHealth"
      />
      <div class="stat">
        <span class="stat-label">HP</span>
        <span>{{ character.status.health }}/{{ character.status.maxHealth }}</span>
      </div>
      <div v-if="!compact" class="stat">
        <span class="stat-label">Level</span>
        <span>{{ character.status.level }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.character-card {
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
