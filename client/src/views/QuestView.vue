<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import { useEntityLinker } from '../composables/useEntityLinker'
import { useTheme } from '../composables/useTheme'
import type { Quest, Breadcrumb, SessionState } from '../types'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const route = useRoute()
const { getQuest, getSession, loading } = useApi()
const { linkText, setSessionState } = useEntityLinker()
const { setSession } = useTheme()

const quest = ref<Quest | null>(null)
const sessionState = ref<SessionState | null>(null)

const questId = computed(() => route.params.questId as string)

const breadcrumbs = computed<Breadcrumb[]>(() => {
  if (!quest.value) return []
  return [
    { label: 'Games', href: '/' },
    { label: sessionState.value?.session.name || 'Loading...', href: `/sessions/${quest.value.sessionId}` },
    { label: quest.value.name },
  ]
})

// Update entity linker when session state changes
watch(sessionState, (newState) => setSessionState(newState))

onMounted(async () => {
  const q = await getQuest(questId.value)
  quest.value = q

  // Fetch session state for entity linking and theming
  if (q) {
    setSession(q.sessionId)
    sessionState.value = await getSession(q.sessionId)
  }
})
</script>

<template>
  <!-- Loading State -->
  <div v-if="loading" class="quest-loading">
    <SkeletonLoader variant="text" width="200px" />
    <SkeletonLoader variant="title" width="300px" />
    <SkeletonLoader variant="card" class="mt-4" />
    <SkeletonLoader variant="card" class="mt-4" />
  </div>

  <!-- Content -->
  <div v-else-if="quest" class="animate-fade-in">
    <Breadcrumbs :items="breadcrumbs" />
    <h2>
      {{ quest.name }}
      <span class="tag">{{ quest.status }}</span>
    </h2>

    <div class="card">
      <h3>Description</h3>
      <p class="linked-content" v-html="linkText(quest.description)"></p>
    </div>

    <div class="card">
      <h3>Objectives</h3>
      <div v-for="obj in quest.objectives" :key="obj.id" class="stat">
        <span class="linked-content">
          {{ obj.completed ? '✅' : '⬜' }} <span v-html="linkText(obj.description)"></span>
        </span>
        <span v-if="obj.optional" class="tag">Optional</span>
      </div>
    </div>

    <div v-if="quest.rewards" class="card">
      <h3>Rewards</h3>
      <p class="linked-content" v-html="linkText(quest.rewards)"></p>
    </div>
  </div>
  <p v-else class="empty">Quest not found.</p>
</template>
