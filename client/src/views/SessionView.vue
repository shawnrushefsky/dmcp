<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { SessionState, Character, Breadcrumb } from '../types'
import SessionTabs from '../components/SessionTabs.vue'
import CharacterCard from '../components/CharacterCard.vue'
import LocationCard from '../components/LocationCard.vue'
import QuestTable from '../components/QuestTable.vue'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const route = useRoute()
const { getSession, loading } = useApi()
const state = ref<SessionState | null>(null)

const sessionId = computed(() => route.params.sessionId as string)

const breadcrumbs = computed<Breadcrumb[]>(() => [
  { label: 'Games', href: '/' },
  { label: state.value?.session.name || 'Session' },
])

const playerCharacters = computed(() =>
  state.value?.characters.filter((c: Character) => c.isPlayer) || []
)

const npcs = computed(() =>
  state.value?.characters.filter((c: Character) => !c.isPlayer).slice(0, 6) || []
)

const locations = computed(() => state.value?.locations.slice(0, 6) || [])

const quests = computed(() => state.value?.quests.slice(0, 5) || [])

onMounted(async () => {
  state.value = await getSession(sessionId.value)
})
</script>

<template>
  <!-- Loading State -->
  <div v-if="loading" class="session-loading">
    <div class="breadcrumb-skeleton">
      <SkeletonLoader variant="text" width="200px" />
    </div>
    <SkeletonLoader variant="title" width="300px" />
    <SkeletonLoader variant="text" width="80%" :lines="2" />

    <div class="tabs-skeleton">
      <SkeletonLoader variant="button" v-for="i in 5" :key="i" width="80px" />
    </div>

    <div class="two-col mt-6">
      <div>
        <SkeletonLoader variant="title" width="150px" />
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="card" class="mt-4" />
      </div>
      <div>
        <SkeletonLoader variant="title" width="120px" />
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="card" class="mt-4" />
      </div>
    </div>
  </div>

  <!-- Content -->
  <div v-else-if="state" class="animate-fade-in">
    <Breadcrumbs :items="breadcrumbs" />
    <h2>{{ state.session.name }}</h2>
    <p class="setting-description">{{ state.session.setting }}</p>

    <SessionTabs :session-id="sessionId" active="overview" />

    <div class="two-col">
      <div>
        <h3>Player Characters</h3>
        <template v-if="playerCharacters.length">
          <CharacterCard
            v-for="char in playerCharacters"
            :key="char.id"
            :character="char"
          />
        </template>
        <div v-else class="empty-inline">
          <span class="empty-inline-icon">🎭</span>
          <span>No player characters yet</span>
        </div>

        <h3 class="mt-8">NPCs</h3>
        <template v-if="npcs.length">
          <CharacterCard
            v-for="char in npcs"
            :key="char.id"
            :character="char"
            compact
          />
        </template>
        <div v-else class="empty-inline">
          <span class="empty-inline-icon">👥</span>
          <span>No NPCs yet</span>
        </div>
        <router-link
          v-if="state.characters.filter(c => !c.isPlayer).length > 6"
          :to="`/sessions/${sessionId}/characters`"
          class="btn btn-secondary mt-4"
        >
          View all NPCs
        </router-link>
      </div>

      <div>
        <h3>Locations</h3>
        <template v-if="locations.length">
          <LocationCard
            v-for="loc in locations"
            :key="loc.id"
            :location="loc"
          />
        </template>
        <div v-else class="empty-inline">
          <span class="empty-inline-icon">🗺️</span>
          <span>No locations yet</span>
        </div>
        <router-link
          v-if="state.locations.length > 6"
          :to="`/sessions/${sessionId}/locations`"
          class="btn btn-secondary mt-4"
        >
          View all locations
        </router-link>

        <h3 class="mt-8">Active Quests</h3>
        <QuestTable v-if="quests.length" :quests="quests" />
        <div v-else class="empty-inline">
          <span class="empty-inline-icon">📜</span>
          <span>No active quests</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Not Found State -->
  <div v-else class="empty">
    <div class="empty-icon">❓</div>
    <div class="empty-title">Session Not Found</div>
    <div class="empty-description">
      This game session doesn't exist or may have been deleted.
    </div>
    <router-link to="/" class="btn mt-4">Back to Games</router-link>
  </div>
</template>

<style scoped>
.session-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.breadcrumb-skeleton {
  margin-bottom: var(--space-2);
}

.tabs-skeleton {
  display: flex;
  gap: var(--space-2);
  margin: var(--space-4) 0;
}

.setting-description {
  color: var(--text-muted);
  margin-bottom: var(--space-6);
  font-size: var(--text-lg);
}

.empty-inline {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--bg-secondary);
  border-radius: var(--border-radius);
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.empty-inline-icon {
  font-size: var(--text-xl);
  opacity: 0.7;
}
</style>
