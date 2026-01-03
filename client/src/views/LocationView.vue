<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import { useEntityLinker } from '../composables/useEntityLinker'
import { useTheme } from '../composables/useTheme'
import { useGameEvents, type GameEvent } from '../composables/useGameEvents'
import type { Location, Character, Item, EntityImages, Breadcrumb, GameState } from '../types'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const route = useRoute()
const { getLocation, getGame, getCharactersAtLocation, getInventory, getEntityImages, loading } = useApi()
const { linkText, setGameState, setItems } = useEntityLinker()
const { setGameContext } = useTheme()

const location = ref<Location | null>(null)
const gameState = ref<GameState | null>(null)
const characters = ref<Character[]>([])
const items = ref<Item[]>([])
const images = ref<EntityImages>({ images: [], primaryImage: null })

const locationId = computed(() => route.params.locationId as string)
const currentGameId = computed(() => location.value?.gameId || '')

// Subscribe to realtime updates (will connect when gameId becomes available)
const { on } = useGameEvents(currentGameId)

const breadcrumbs = computed<Breadcrumb[]>(() => {
  if (!location.value) return []
  return [
    { label: 'Games', href: '/' },
    { label: gameState.value?.game.name || 'Loading...', href: `/games/${location.value.gameId}` },
    { label: location.value.name },
  ]
})

// Update entity linker when game state changes
watch(gameState, (newState) => setGameState(newState))
watch(items, (newItems) => setItems(newItems))

async function refreshLocationData() {
  if (!location.value) return
  const [chars, inv] = await Promise.all([
    getCharactersAtLocation(location.value.gameId, locationId.value),
    getInventory(locationId.value, 'location'),
  ])
  characters.value = chars
  items.value = inv
}

function handleRelevantEvent(event: GameEvent) {
  // Refresh when characters move or inventory changes
  if (event.type === 'character:updated' || event.type === 'inventory:updated') {
    refreshLocationData()
  }
  // Refresh location details if this location was updated
  if (event.type === 'location:updated' && event.entityId === locationId.value) {
    getLocation(locationId.value).then(loc => {
      if (loc) location.value = loc
    })
  }
}

onMounted(async () => {
  const loc = await getLocation(locationId.value)
  location.value = loc
  if (loc) {
    setGameContext(loc.gameId)
    const [state, chars, inv, imgs] = await Promise.all([
      getGame(loc.gameId),
      getCharactersAtLocation(loc.gameId, locationId.value),
      getInventory(locationId.value, 'location'),
      getEntityImages(locationId.value, 'location'),
    ])
    gameState.value = state
    characters.value = chars
    items.value = inv
    images.value = imgs
  }

  // Listen for relevant updates
  on('character:updated', handleRelevantEvent)
  on('inventory:updated', handleRelevantEvent)
  on('location:updated', handleRelevantEvent)
})
</script>

<template>
  <!-- Loading State -->
  <div v-if="loading" class="location-loading">
    <SkeletonLoader variant="text" width="200px" />
    <SkeletonLoader variant="title" width="300px" />
    <SkeletonLoader variant="image" height="300px" />
    <SkeletonLoader variant="card" class="mt-4" />
    <SkeletonLoader variant="card" class="mt-4" />
  </div>

  <!-- Content -->
  <div v-else-if="location" class="animate-fade-in">
    <Breadcrumbs :items="breadcrumbs" />
    <h2>{{ location.name }}</h2>

    <img
      v-if="images.primaryImage"
      :src="`/images/${images.primaryImage.id}/file`"
      :alt="location.name"
      class="location-image"
    />

    <div class="card">
      <h3>Description</h3>
      <p class="linked-content" v-html="linkText(location.description)"></p>
      <p v-if="location.properties.atmosphere" class="muted mt-20 linked-content">
        <em v-html="linkText(location.properties.atmosphere)"></em>
      </p>
    </div>

    <div v-if="location.properties.exits.length" class="card">
      <h3>Exits</h3>
      <router-link
        v-for="exit in location.properties.exits"
        :key="exit.direction"
        :to="`/locations/${exit.destinationId}`"
        class="btn"
      >
        {{ exit.direction }}
      </router-link>
    </div>

    <template v-if="characters.length">
      <h3>Characters Here</h3>
      <div class="grid">
        <div v-for="char in characters" :key="char.id" class="card">
          <h3>
            <router-link :to="`/characters/${char.id}`">{{ char.name }}</router-link>
          </h3>
          <span class="tag">{{ char.isPlayer ? 'PC' : 'NPC' }}</span>
        </div>
      </div>
    </template>

    <div v-if="items.length" class="card">
      <h3>Items Here</h3>
      <ul>
        <li v-for="item in items" :key="item.id">
          <router-link :to="`/items/${item.id}`">{{ item.name }}</router-link>
        </li>
      </ul>
    </div>
  </div>
  <p v-else class="empty">Location not found.</p>
</template>

<style scoped>
.location-image {
  width: 100%;
  border-radius: 8px;
  margin-bottom: 20px;
}
</style>
