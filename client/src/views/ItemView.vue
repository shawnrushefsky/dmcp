<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import { useEntityLinker } from '../composables/useEntityLinker'
import { useTheme } from '../composables/useTheme'
import type { Item, Breadcrumb, GameState, EntityImages, Character, Location } from '../types'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const route = useRoute()
const { getItem, getGame, getEntityImages, getCharacter, getLocation, loading } = useApi()
const { linkText, setGameState } = useEntityLinker()
const { setSession } = useTheme()

const item = ref<Item | null>(null)
const gameState = ref<GameState | null>(null)
const images = ref<EntityImages>({ images: [], primaryImage: null })
const owner = ref<Character | Location | null>(null)

const itemId = computed(() => route.params.itemId as string)

const breadcrumbs = computed<Breadcrumb[]>(() => {
  if (!item.value) return []
  return [
    { label: 'Games', href: '/' },
    { label: gameState.value?.game.name || 'Loading...', href: `/games/${item.value.gameId}` },
    { label: item.value.name },
  ]
})

const ownerLink = computed(() => {
  if (!item.value || !owner.value) return null
  const type = item.value.ownerType === 'character' ? 'characters' : 'locations'
  return `/${type}/${owner.value.id}`
})

const ownerLabel = computed(() => {
  if (!item.value) return ''
  return item.value.ownerType === 'character' ? 'Held by' : 'Located at'
})

// Filter out internal/technical properties for display
const displayProperties = computed(() => {
  if (!item.value?.properties) return {}
  const props = { ...item.value.properties }
  // Remove any properties that are just IDs or internal markers
  delete props.id
  delete props.gameId
  delete props.ownerId
  delete props.ownerType
  return props
})

// Update entity linker when game state changes
watch(gameState, (newState) => setGameState(newState))

onMounted(async () => {
  const i = await getItem(itemId.value)
  item.value = i

  if (i) {
    setSession(i.gameId)
    const [state, imgs] = await Promise.all([
      getGame(i.gameId),
      getEntityImages(itemId.value, 'item'),
    ])
    gameState.value = state
    images.value = imgs

    // Fetch owner
    if (i.ownerType === 'character') {
      owner.value = await getCharacter(i.ownerId)
    } else {
      owner.value = await getLocation(i.ownerId)
    }
  }
})
</script>

<template>
  <!-- Loading State -->
  <div v-if="loading" class="item-loading">
    <SkeletonLoader variant="text" width="200px" />
    <SkeletonLoader variant="title" width="250px" />
    <SkeletonLoader variant="card" class="mt-4" />
  </div>

  <!-- Content -->
  <div v-else-if="item" class="animate-fade-in">
    <Breadcrumbs :items="breadcrumbs" />
    <h2>
      {{ item.name }}
      <span v-if="item.type" class="tag">{{ item.type }}</span>
    </h2>

    <!-- Primary Image -->
    <img
      v-if="images.primaryImage"
      :src="`/images/${images.primaryImage.id}/file`"
      :alt="item.name"
      class="item-image"
    />

    <!-- Owner Info -->
    <div class="card">
      <h3>Details</h3>
      <div v-if="item.type" class="stat">
        <span class="stat-label">Type</span>
        <span>{{ item.type }}</span>
      </div>
      <div v-if="owner" class="stat">
        <span class="stat-label">{{ ownerLabel }}</span>
        <router-link :to="ownerLink!">{{ owner.name }}</router-link>
      </div>
    </div>

    <!-- Properties -->
    <div v-if="Object.keys(displayProperties).length" class="card">
      <h3>Properties</h3>
      <div v-for="(value, key) in displayProperties" :key="key" class="stat">
        <span class="stat-label">{{ key }}</span>
        <span v-if="typeof value === 'string'" class="linked-content" v-html="linkText(value)"></span>
        <span v-else-if="typeof value === 'object'">{{ JSON.stringify(value) }}</span>
        <span v-else>{{ value }}</span>
      </div>
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
  <p v-else class="empty">Item not found.</p>
</template>

<style scoped>
.item-image {
  width: 100%;
  max-width: 300px;
  border-radius: 8px;
  margin-bottom: 20px;
}
</style>
