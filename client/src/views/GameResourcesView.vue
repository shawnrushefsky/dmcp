<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { GameState, Resource, Breadcrumb } from '../types'
import GameTabs from '../components/GameTabs.vue'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const route = useRoute()
const { getGame, loading } = useApi()
const state = ref<GameState | null>(null)

const gameId = computed(() => route.params.gameId as string)

const breadcrumbs = computed<Breadcrumb[]>(() => [
  { label: 'Games', href: '/' },
  { label: state.value?.game.name || 'Loading...', href: `/games/${gameId.value}` },
  { label: 'Resources' },
])

const gameResources = computed(() =>
  state.value?.resources.filter((r: Resource) => r.ownerType === 'game') || []
)

const characterResources = computed(() =>
  state.value?.resources.filter((r: Resource) => r.ownerType === 'character') || []
)

function getProgressPercent(resource: Resource): number {
  if (resource.maxValue === undefined || resource.maxValue === null) return 100
  if (resource.minValue !== undefined && resource.minValue !== null) {
    const range = resource.maxValue - resource.minValue
    return ((resource.value - resource.minValue) / range) * 100
  }
  return (resource.value / resource.maxValue) * 100
}

function getProgressColor(resource: Resource): string {
  const percent = getProgressPercent(resource)
  if (percent <= 25) return 'var(--danger)'
  if (percent <= 50) return 'var(--warning)'
  return 'var(--success)'
}

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
    <SkeletonLoader variant="card" class="mt-6" />
    <SkeletonLoader variant="card" class="mt-4" />
  </div>

  <!-- Content -->
  <div v-else-if="state" class="animate-fade-in">
    <Breadcrumbs :items="breadcrumbs" />
    <h2>{{ state.game.name }}</h2>
    <p class="mb-20">{{ state.game.setting }}</p>

    <GameTabs :game-id="gameId" active="resources" :counts="state.counts" />

    <!-- Party/Session Resources -->
    <h3>Party Resources ({{ gameResources.length }})</h3>
    <div v-if="gameResources.length" class="resource-grid">
      <div v-for="resource in gameResources" :key="resource.id" class="card resource-card">
        <div class="resource-header">
          <h4>{{ resource.name }}</h4>
          <span v-if="resource.category" class="resource-category">{{ resource.category }}</span>
        </div>

        <p v-if="resource.description" class="resource-description">{{ resource.description }}</p>

        <div class="resource-value-row">
          <span class="resource-value">{{ resource.value }}</span>
          <span v-if="resource.maxValue !== undefined" class="resource-max">
            / {{ resource.maxValue }}
          </span>
        </div>

        <div v-if="resource.maxValue !== undefined" class="resource-bar">
          <div
            class="resource-bar-fill"
            :style="{
              width: `${Math.min(100, Math.max(0, getProgressPercent(resource)))}%`,
              backgroundColor: getProgressColor(resource)
            }"
          />
        </div>
      </div>
    </div>
    <p v-else class="empty">No party resources.</p>

    <!-- Character Resources -->
    <template v-if="characterResources.length">
      <h3 class="mt-30">Character Resources ({{ characterResources.length }})</h3>
      <div class="resource-grid">
        <div v-for="resource in characterResources" :key="resource.id" class="card resource-card">
          <div class="resource-header">
            <h4>{{ resource.name }}</h4>
            <span v-if="resource.category" class="resource-category">{{ resource.category }}</span>
          </div>

          <p v-if="resource.description" class="resource-description">{{ resource.description }}</p>

          <div class="resource-value-row">
            <span class="resource-value">{{ resource.value }}</span>
            <span v-if="resource.maxValue !== undefined" class="resource-max">
              / {{ resource.maxValue }}
            </span>
          </div>

          <div v-if="resource.maxValue !== undefined" class="resource-bar">
            <div
              class="resource-bar-fill"
              :style="{
                width: `${Math.min(100, Math.max(0, getProgressPercent(resource)))}%`,
                backgroundColor: getProgressColor(resource)
              }"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
  <p v-else class="empty">Game not found.</p>
</template>

<style scoped>
.resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-4);
}

.resource-card {
  padding: var(--space-4);
}

.resource-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-2);
}

.resource-header h4 {
  margin: 0;
  color: var(--text);
}

.resource-category {
  font-size: var(--text-xs);
  padding: 2px 8px;
  border-radius: 12px;
  background: var(--bg-elevated);
  color: var(--text-muted);
}

.resource-description {
  color: var(--text-muted);
  font-size: var(--text-sm);
  margin-bottom: var(--space-3);
}

.resource-value-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-1);
  margin-bottom: var(--space-2);
}

.resource-value {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--accent);
}

.resource-max {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.resource-bar {
  height: 8px;
  background: var(--bg-elevated);
  border-radius: 4px;
  overflow: hidden;
}

.resource-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.game-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.tabs-skeleton {
  display: flex;
  gap: var(--space-2);
}
</style>
