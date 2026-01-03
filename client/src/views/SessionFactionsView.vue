<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { SessionState, Faction, Breadcrumb } from '../types'
import SessionTabs from '../components/SessionTabs.vue'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const route = useRoute()
const { getSession, loading } = useApi()
const state = ref<SessionState | null>(null)

const sessionId = computed(() => route.params.sessionId as string)

const breadcrumbs = computed<Breadcrumb[]>(() => [
  { label: 'Games', href: '/' },
  { label: state.value?.session.name || 'Loading...', href: `/sessions/${sessionId.value}` },
  { label: 'Factions' },
])

const activeFactions = computed(() =>
  state.value?.factions.filter((f: Faction) => f.status === 'active') || []
)

const hiddenFactions = computed(() =>
  state.value?.factions.filter((f: Faction) => f.status === 'hidden') || []
)

const disbandedFactions = computed(() =>
  state.value?.factions.filter((f: Faction) => f.status === 'disbanded') || []
)

onMounted(async () => {
  state.value = await getSession(sessionId.value)
})
</script>

<template>
  <!-- Loading State -->
  <div v-if="loading" class="session-loading">
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
    <h2>{{ state.session.name }}</h2>
    <p class="mb-20">{{ state.session.setting }}</p>

    <SessionTabs :session-id="sessionId" active="factions" :counts="state.counts" />

    <h3>Active Factions ({{ activeFactions.length }})</h3>
    <div v-if="activeFactions.length" class="faction-grid">
      <router-link
        v-for="faction in activeFactions"
        :key="faction.id"
        :to="`/factions/${faction.id}`"
        class="card faction-card"
      >
        <img
          v-if="faction.primaryImageId"
          :src="`/images/${faction.primaryImageId}/file?width=300`"
          :alt="faction.name"
          class="faction-thumb"
        />
        <h4>{{ faction.name }}</h4>
        <p v-if="faction.description" class="faction-description">{{ faction.description }}</p>

        <div v-if="faction.traits.length" class="faction-traits">
          <span v-for="trait in faction.traits" :key="trait" class="tag">{{ trait }}</span>
        </div>
      </router-link>
    </div>
    <p v-else class="empty">No active factions.</p>

    <template v-if="hiddenFactions.length">
      <h3 class="mt-30">Hidden Factions ({{ hiddenFactions.length }})</h3>
      <div class="faction-grid">
        <router-link
          v-for="faction in hiddenFactions"
          :key="faction.id"
          :to="`/factions/${faction.id}`"
          class="card faction-card muted"
        >
          <img
            v-if="faction.primaryImageId"
            :src="`/images/${faction.primaryImageId}/file?width=300`"
            :alt="faction.name"
            class="faction-thumb"
          />
          <h4>{{ faction.name }}</h4>
          <p v-if="faction.description" class="faction-description">{{ faction.description }}</p>
          <span class="tag tag-muted">Hidden</span>
        </router-link>
      </div>
    </template>

    <template v-if="disbandedFactions.length">
      <h3 class="mt-30">Disbanded ({{ disbandedFactions.length }})</h3>
      <div class="faction-grid">
        <router-link
          v-for="faction in disbandedFactions"
          :key="faction.id"
          :to="`/factions/${faction.id}`"
          class="card faction-card muted"
        >
          <img
            v-if="faction.primaryImageId"
            :src="`/images/${faction.primaryImageId}/file?width=300`"
            :alt="faction.name"
            class="faction-thumb"
          />
          <h4>{{ faction.name }}</h4>
          <span class="tag tag-danger">Disbanded</span>
        </router-link>
      </div>
    </template>
  </div>
  <p v-else class="empty">Game not found.</p>
</template>

<style scoped>
.faction-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);
}

.faction-card {
  display: block;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s, box-shadow 0.2s;
}

.faction-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.faction-card h4 {
  margin: 0 0 var(--space-2);
  color: var(--text);
}

.faction-card.muted {
  opacity: 0.7;
}

.faction-thumb {
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: 4px;
  margin-bottom: var(--space-3);
}

.faction-description {
  color: var(--text-muted);
  font-size: var(--text-sm);
  margin-bottom: var(--space-3);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.faction-traits {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: var(--text-xs);
  background: var(--accent);
  color: white;
}

.tag-muted {
  background: var(--bg-elevated);
  color: var(--text-muted);
}

.tag-danger {
  background: var(--danger);
}

.session-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.tabs-skeleton {
  display: flex;
  gap: var(--space-2);
}
</style>
