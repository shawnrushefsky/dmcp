<script setup lang="ts">
import type { Quest } from '../types'
import { useTheme } from '../composables/useTheme'

defineProps<{
  quests: Quest[]
}>()

const { config } = useTheme()

function completedCount(quest: Quest): string {
  const completed = quest.objectives.filter((o) => o.completed).length
  return `${completed}/${quest.objectives.length}`
}
</script>

<template>
  <table>
    <thead>
      <tr>
        <th>Quest</th>
        <th>Status</th>
        <th>Progress</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="quest in quests" :key="quest.id">
        <td>
          <div class="quest-cell">
            <img
              v-if="quest.primaryImageId && config.showImages"
              :src="`/images/${quest.primaryImageId}/file?width=40&height=40`"
              :alt="quest.name"
              class="quest-thumb"
              loading="lazy"
            />
            <router-link :to="`/quests/${quest.id}`">{{ quest.name }}</router-link>
          </div>
        </td>
        <td><span class="tag">{{ quest.status }}</span></td>
        <td>{{ completedCount(quest) }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.quest-cell {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.quest-thumb {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}
</style>
