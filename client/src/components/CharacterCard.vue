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
  <div class="card">
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
</template>
