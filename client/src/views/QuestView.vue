<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { Quest, Breadcrumb } from '../types'
import Breadcrumbs from '../components/Breadcrumbs.vue'

const route = useRoute()
const { getQuest, loading } = useApi()

const quest = ref<Quest | null>(null)

const questId = computed(() => route.params.questId as string)

const breadcrumbs = computed<Breadcrumb[]>(() => {
  if (!quest.value) return []
  return [
    { label: 'Games', href: '/' },
    { label: 'Session', href: `/sessions/${quest.value.sessionId}` },
    { label: quest.value.name },
  ]
})

onMounted(async () => {
  quest.value = await getQuest(questId.value)
})
</script>

<template>
  <div v-if="loading" class="loading">Loading...</div>
  <div v-else-if="quest">
    <Breadcrumbs :items="breadcrumbs" />
    <h2>
      {{ quest.name }}
      <span class="tag">{{ quest.status }}</span>
    </h2>

    <div class="card">
      <h3>Description</h3>
      <p>{{ quest.description }}</p>
    </div>

    <div class="card">
      <h3>Objectives</h3>
      <div v-for="obj in quest.objectives" :key="obj.id" class="stat">
        <span>
          {{ obj.completed ? '✅' : '⬜' }} {{ obj.description }}
        </span>
        <span v-if="obj.optional" class="tag">Optional</span>
      </div>
    </div>

    <div v-if="quest.rewards" class="card">
      <h3>Rewards</h3>
      <p>{{ quest.rewards }}</p>
    </div>
  </div>
  <p v-else class="empty">Quest not found.</p>
</template>
