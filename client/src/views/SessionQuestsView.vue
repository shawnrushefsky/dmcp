<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { SessionState, Quest, Breadcrumb } from '../types'
import SessionTabs from '../components/SessionTabs.vue'
import QuestTable from '../components/QuestTable.vue'
import Breadcrumbs from '../components/Breadcrumbs.vue'

const route = useRoute()
const { getSession, loading } = useApi()
const state = ref<SessionState | null>(null)

const sessionId = computed(() => route.params.sessionId as string)

const breadcrumbs = computed<Breadcrumb[]>(() => [
  { label: 'Games', href: '/' },
  { label: state.value?.session.name || 'Session', href: `/sessions/${sessionId.value}` },
  { label: 'Quests' },
])

const activeQuests = computed(() =>
  state.value?.quests.filter((q: Quest) => q.status === 'active') || []
)

const completedQuests = computed(() =>
  state.value?.quests.filter((q: Quest) => q.status === 'completed') || []
)

const failedQuests = computed(() =>
  state.value?.quests.filter((q: Quest) => q.status === 'failed' || q.status === 'abandoned') || []
)

onMounted(async () => {
  state.value = await getSession(sessionId.value)
})
</script>

<template>
  <div v-if="loading" class="loading">Loading...</div>
  <div v-else-if="state">
    <Breadcrumbs :items="breadcrumbs" />
    <h2>{{ state.session.name }}</h2>
    <p class="mb-20">{{ state.session.setting }}</p>

    <SessionTabs :session-id="sessionId" active="quests" />

    <h3>Active Quests ({{ activeQuests.length }})</h3>
    <QuestTable v-if="activeQuests.length" :quests="activeQuests" />
    <p v-else class="empty">No active quests.</p>

    <h3 class="mt-30">Completed Quests ({{ completedQuests.length }})</h3>
    <QuestTable v-if="completedQuests.length" :quests="completedQuests" />
    <p v-else class="empty">No completed quests.</p>

    <h3 v-if="failedQuests.length" class="mt-30">Failed/Abandoned ({{ failedQuests.length }})</h3>
    <QuestTable v-if="failedQuests.length" :quests="failedQuests" />
  </div>
  <p v-else class="empty">Session not found.</p>
</template>
