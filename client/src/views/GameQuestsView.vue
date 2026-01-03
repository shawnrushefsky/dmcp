<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { GameState, Quest, Breadcrumb } from '../types'
import GameTabs from '../components/GameTabs.vue'
import QuestTable from '../components/QuestTable.vue'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const route = useRoute()
const { getGame, loading } = useApi()
const state = ref<GameState | null>(null)

const gameId = computed(() => route.params.gameId as string)

const breadcrumbs = computed<Breadcrumb[]>(() => [
  { label: 'Games', href: '/' },
  { label: state.value?.game.name || 'Loading...', href: `/games/${gameId.value}` },
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
  state.value = await getGame(gameId.value)
})
</script>

<template>
  <!-- Loading State -->
  <div v-if="loading" class="game-loading">
    <SkeletonLoader variant="text" width="200px" />
    <SkeletonLoader variant="title" width="300px" />
    <SkeletonLoader variant="text" width="80%" />
    <div class="tabs-skeleton">
      <SkeletonLoader variant="button" v-for="i in 5" :key="i" width="80px" />
    </div>
    <SkeletonLoader variant="title" width="180px" class="mt-6" />
    <SkeletonLoader variant="card" />
    <SkeletonLoader variant="title" width="180px" class="mt-6" />
    <SkeletonLoader variant="card" />
  </div>

  <!-- Content -->
  <div v-else-if="state" class="animate-fade-in">
    <Breadcrumbs :items="breadcrumbs" />
    <h2>{{ state.game.name }}</h2>
    <p class="mb-20">{{ state.game.setting }}</p>

    <GameTabs :game-id="gameId" active="quests" :counts="state.counts" />

    <h3>Active Quests ({{ activeQuests.length }})</h3>
    <QuestTable v-if="activeQuests.length" :quests="activeQuests" />
    <p v-else class="empty">No active quests.</p>

    <h3 class="mt-30">Completed Quests ({{ completedQuests.length }})</h3>
    <QuestTable v-if="completedQuests.length" :quests="completedQuests" />
    <p v-else class="empty">No completed quests.</p>

    <h3 v-if="failedQuests.length" class="mt-30">Failed/Abandoned ({{ failedQuests.length }})</h3>
    <QuestTable v-if="failedQuests.length" :quests="failedQuests" />
  </div>
  <p v-else class="empty">Game not found.</p>
</template>
