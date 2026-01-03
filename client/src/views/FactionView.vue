<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import { useEntityLinker } from '../composables/useEntityLinker'
import { useTheme } from '../composables/useTheme'
import { useGameEvents } from '../composables/useGameEvents'
import type { Faction, Breadcrumb, GameState, EntityImages, Character, Location } from '../types'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const route = useRoute()
const { getFaction, getGame, getEntityImages, getCharacter, getLocation, loading } = useApi()
const { linkText, setGameState } = useEntityLinker()
const { setSession } = useTheme()

const faction = ref<Faction | null>(null)
const gameState = ref<GameState | null>(null)
const images = ref<EntityImages>({ images: [], primaryImage: null })
const leader = ref<Character | null>(null)
const headquarters = ref<Location | null>(null)

const factionId = computed(() => route.params.factionId as string)
const currentGameId = computed(() => faction.value?.gameId || '')
const { on } = useGameEvents(currentGameId)

const breadcrumbs = computed<Breadcrumb[]>(() => {
  if (!faction.value) return []
  return [
    { label: 'Games', href: '/' },
    { label: gameState.value?.game.name || 'Loading...', href: `/games/${faction.value.gameId}` },
    { label: 'Factions', href: `/games/${faction.value.gameId}/factions` },
    { label: faction.value.name },
  ]
})

const statusClass = computed(() => {
  if (!faction.value) return ''
  switch (faction.value.status) {
    case 'active': return 'tag-success'
    case 'disbanded': return 'tag-danger'
    case 'hidden': return 'tag-muted'
    default: return ''
  }
})

// Update entity linker when game state changes
watch(gameState, (newState) => setGameState(newState))

async function refreshFaction() {
  const f = await getFaction(factionId.value)
  if (f) faction.value = f
}

onMounted(async () => {
  const f = await getFaction(factionId.value)
  faction.value = f

  if (f) {
    setSession(f.gameId)
    const [state, imgs] = await Promise.all([
      getGame(f.gameId),
      getEntityImages(factionId.value, 'faction'),
    ])
    gameState.value = state
    images.value = imgs

    // Fetch leader and headquarters if set
    if (f.leaderId) {
      leader.value = await getCharacter(f.leaderId)
    }
    if (f.headquartersId) {
      headquarters.value = await getLocation(f.headquartersId)
    }
  }

  // Listen for faction updates
  on('*', refreshFaction)
})
</script>

<template>
  <!-- Loading State -->
  <div v-if="loading" class="faction-loading">
    <SkeletonLoader variant="text" width="200px" />
    <SkeletonLoader variant="title" width="300px" />
    <SkeletonLoader variant="card" class="mt-4" />
    <SkeletonLoader variant="card" class="mt-4" />
  </div>

  <!-- Content -->
  <div v-else-if="faction" class="animate-fade-in">
    <Breadcrumbs :items="breadcrumbs" />
    <h2>
      {{ faction.name }}
      <span class="tag" :class="statusClass">{{ faction.status }}</span>
    </h2>

    <!-- Primary Image -->
    <img
      v-if="images.primaryImage"
      :src="`/images/${images.primaryImage.id}/file`"
      :alt="faction.name"
      class="faction-image"
    />

    <!-- Description -->
    <div v-if="faction.description" class="card">
      <h3>Description</h3>
      <p class="linked-content" v-html="linkText(faction.description)"></p>
    </div>

    <!-- Leadership & HQ -->
    <div v-if="leader || headquarters" class="card">
      <h3>Organization</h3>
      <div v-if="leader" class="stat">
        <span class="stat-label">Leader</span>
        <router-link :to="`/characters/${leader.id}`">{{ leader.name }}</router-link>
      </div>
      <div v-if="headquarters" class="stat">
        <span class="stat-label">Headquarters</span>
        <router-link :to="`/locations/${headquarters.id}`">{{ headquarters.name }}</router-link>
      </div>
    </div>

    <!-- Traits -->
    <div v-if="faction.traits.length" class="card">
      <h3>Traits</h3>
      <div class="trait-list">
        <span v-for="trait in faction.traits" :key="trait" class="tag">{{ trait }}</span>
      </div>
    </div>

    <!-- Resources -->
    <div v-if="Object.keys(faction.resources).length" class="card">
      <h3>Resources</h3>
      <div v-for="(value, key) in faction.resources" :key="key" class="stat">
        <span class="stat-label">{{ key }}</span>
        <span>{{ value }}</span>
      </div>
    </div>

    <!-- Goals -->
    <div v-if="faction.goals.length" class="card">
      <h3>Goals</h3>
      <ul class="goals-list">
        <li v-for="(goal, idx) in faction.goals" :key="idx" class="linked-content" v-html="linkText(goal)"></li>
      </ul>
    </div>

    <!-- Image Gallery -->
    <div v-if="images.images.length > 1" class="card">
      <h3>Gallery</h3>
      <div class="image-grid">
        <div v-for="img in images.images" :key="img.id" class="image-card">
          <router-link :to="`/images/${img.id}`">
            <img
              :src="`/images/${img.id}/file?width=200`"
              :alt="img.label || 'Image'"
              loading="lazy"
            />
          </router-link>
        </div>
      </div>
    </div>
  </div>
  <p v-else class="empty">Faction not found.</p>
</template>

<style scoped>
.faction-image {
  width: 100%;
  max-width: 400px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.trait-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.goals-list {
  margin: 0;
  padding-left: var(--space-5);
}

.goals-list li {
  margin-bottom: var(--space-2);
  color: var(--text-muted);
}

.tag-success {
  background: var(--success);
  color: white;
}

.tag-danger {
  background: var(--danger);
  color: white;
}

.tag-muted {
  background: var(--bg-elevated);
  color: var(--text-muted);
}
</style>
