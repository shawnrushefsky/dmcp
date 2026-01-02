<script setup lang="ts">
import { computed } from 'vue'
import type { Character } from '../types'
import { useTheme } from '../composables/useTheme'
import HealthBar from './HealthBar.vue'
import AvatarPlaceholder from './AvatarPlaceholder.vue'

const props = defineProps<{
  character: Character
  compact?: boolean
}>()

const { config } = useTheme()

// Show up to 2 conditions, with "+N more" indicator
const visibleConditions = computed(() => {
  const conditions = props.character.status.conditions || []
  return conditions.slice(0, 2)
})

const remainingConditionsCount = computed(() => {
  const conditions = props.character.status.conditions || []
  return Math.max(0, conditions.length - 2)
})

const hasImage = computed(() => props.character.primaryImageId && config.value.showImages)
</script>

<template>
  <router-link
    :to="`/characters/${character.id}`"
    class="card character-card clickable"
    :class="{ compact }"
  >
    <!-- Image or Avatar Placeholder -->
    <div class="avatar-container">
      <img
        v-if="hasImage"
        :src="`/images/${character.primaryImageId}/file?width=200&height=200`"
        :alt="character.name"
        class="entity-thumb"
      />
      <AvatarPlaceholder
        v-else
        :name="character.name"
        :size="compact ? 'sm' : 'md'"
      />
      <!-- PC/NPC Badge -->
      <span class="type-badge" :class="{ pc: character.isPlayer }">
        {{ character.isPlayer ? 'PC' : 'NPC' }}
      </span>
    </div>

    <div class="card-content">
      <h3>{{ character.name }}</h3>

      <HealthBar
        v-if="config.showHealthBars && !compact"
        :current="character.status.health"
        :max="character.status.maxHealth"
        show-text
      />

      <div v-if="compact" class="stat">
        <span class="stat-label">HP</span>
        <span>{{ character.status.health }}/{{ character.status.maxHealth }}</span>
      </div>

      <div v-if="!compact" class="stat">
        <span class="stat-label">Level</span>
        <span>{{ character.status.level }}</span>
      </div>

      <!-- Condition Tags -->
      <div v-if="config.showConditionTags && visibleConditions.length" class="conditions">
        <span
          v-for="condition in visibleConditions"
          :key="condition"
          class="condition-tag"
        >
          {{ condition }}
        </span>
        <span v-if="remainingConditionsCount > 0" class="condition-more">
          +{{ remainingConditionsCount }}
        </span>
      </div>
    </div>
  </router-link>
</template>

<style scoped>
.character-card {
  display: flex;
  gap: 15px;
  text-decoration: none;
  color: inherit;
}

.character-card.compact {
  gap: 10px;
}

.avatar-container {
  position: relative;
  flex-shrink: 0;
}

.entity-thumb {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
}

.compact .entity-thumb {
  width: 50px;
  height: 50px;
}

.type-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--bg-elevated, #252545);
  border: 1px solid var(--border, #3a3a5c);
  color: var(--text-muted, #9090a0);
  text-transform: uppercase;
}

.type-badge.pc {
  background: var(--accent, #7c3aed);
  border-color: var(--accent, #7c3aed);
  color: white;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-content h3 {
  margin-top: 0;
  margin-bottom: 8px;
}

.conditions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.condition-tag {
  font-size: var(--text-xs, 0.75rem);
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb, 124, 58, 237), 0.2);
  color: var(--accent, #7c3aed);
  border: 1px solid rgba(var(--accent-rgb, 124, 58, 237), 0.3);
}

.condition-more {
  font-size: var(--text-xs, 0.75rem);
  padding: 2px 8px;
  border-radius: 12px;
  background: var(--bg-elevated, #252545);
  color: var(--text-muted, #9090a0);
}
</style>
