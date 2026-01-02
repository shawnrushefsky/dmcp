<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import { useEntityLinker } from '../composables/useEntityLinker'
import type { SessionState, Faction, Breadcrumb } from '../types'
import SessionTabs from '../components/SessionTabs.vue'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const route = useRoute()
const { getSession, loading } = useApi()
const { linkText, setSessionState } = useEntityLinker()
const state = ref<SessionState | null>(null)

const sessionId = computed(() => route.params.sessionId as string)

const breadcrumbs = computed<Breadcrumb[]>(() => [
  { label: 'Games', href: '/' },
  { label: state.value?.session.name || 'Session', href: `/sessions/${sessionId.value}` },
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

// Update entity linker when session state changes
watch(state, (newState) => setSessionState(newState))

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
      <div v-for="faction in activeFactions" :key="faction.id" class="card faction-card">
        <h4>{{ faction.name }}</h4>
        <p v-if="faction.description" class="faction-description linked-content" v-html="linkText(faction.description)"></p>

        <div v-if="faction.traits.length" class="faction-traits">
          <span v-for="trait in faction.traits" :key="trait" class="tag">{{ trait }}</span>
        </div>

        <div v-if="Object.keys(faction.resources).length" class="faction-resources">
          <div v-for="(value, key) in faction.resources" :key="key" class="stat">
            <span class="stat-label">{{ key }}</span>
            <span>{{ value }}</span>
          </div>
        </div>

        <div v-if="faction.goals.length" class="faction-goals">
          <div class="stat-label">Goals</div>
          <ul>
            <li v-for="(goal, idx) in faction.goals" :key="idx" class="linked-content" v-html="linkText(goal)"></li>
          </ul>
        </div>
      </div>
    </div>
    <p v-else class="empty">No active factions.</p>

    <template v-if="hiddenFactions.length">
      <h3 class="mt-30">Hidden Factions ({{ hiddenFactions.length }})</h3>
      <div class="faction-grid">
        <div v-for="faction in hiddenFactions" :key="faction.id" class="card faction-card muted">
          <h4>{{ faction.name }}</h4>
          <p v-if="faction.description" class="faction-description linked-content" v-html="linkText(faction.description)"></p>
          <span class="tag tag-muted">Hidden</span>
        </div>
      </div>
    </template>

    <template v-if="disbandedFactions.length">
      <h3 class="mt-30">Disbanded ({{ disbandedFactions.length }})</h3>
      <div class="faction-grid">
        <div v-for="faction in disbandedFactions" :key="faction.id" class="card faction-card muted">
          <h4>{{ faction.name }}</h4>
          <span class="tag tag-danger">Disbanded</span>
        </div>
      </div>
    </template>
  </div>
  <p v-else class="empty">Session not found.</p>
</template>

<style scoped>
.faction-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);
}

.faction-card h4 {
  margin: 0 0 var(--space-2);
  color: var(--text);
}

.faction-card.muted {
  opacity: 0.7;
}

.faction-description {
  color: var(--text-muted);
  font-size: var(--text-sm);
  margin-bottom: var(--space-3);
}

.faction-traits {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.faction-resources {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
}

.faction-goals ul {
  margin: var(--space-2) 0 0;
  padding-left: var(--space-5);
  font-size: var(--text-sm);
  color: var(--text-muted);
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
