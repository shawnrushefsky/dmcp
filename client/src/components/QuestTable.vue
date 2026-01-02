<script setup lang="ts">
import type { Quest } from '../types'

defineProps<{
  quests: Quest[]
}>()

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
          <router-link :to="`/quests/${quest.id}`">{{ quest.name }}</router-link>
        </td>
        <td><span class="tag">{{ quest.status }}</span></td>
        <td>{{ completedCount(quest) }}</td>
      </tr>
    </tbody>
  </table>
</template>
