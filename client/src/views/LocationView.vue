<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { Location, Character, Item, EntityImages, Breadcrumb } from '../types'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const route = useRoute()
const { getLocation, getCharactersAtLocation, getInventory, getEntityImages, loading } = useApi()

const location = ref<Location | null>(null)
const characters = ref<Character[]>([])
const items = ref<Item[]>([])
const images = ref<EntityImages>({ images: [], primaryImage: null })

const locationId = computed(() => route.params.locationId as string)

const breadcrumbs = computed<Breadcrumb[]>(() => {
  if (!location.value) return []
  return [
    { label: 'Games', href: '/' },
    { label: 'Session', href: `/sessions/${location.value.sessionId}` },
    { label: location.value.name },
  ]
})

onMounted(async () => {
  const loc = await getLocation(locationId.value)
  location.value = loc
  if (loc) {
    const [chars, inv, imgs] = await Promise.all([
      getCharactersAtLocation(loc.sessionId, locationId.value),
      getInventory(locationId.value, 'location'),
      getEntityImages(locationId.value, 'location'),
    ])
    characters.value = chars
    items.value = inv
    images.value = imgs
  }
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
      <p>{{ location.description }}</p>
      <p v-if="location.properties.atmosphere" class="muted mt-20">
        <em>{{ location.properties.atmosphere }}</em>
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
        <li v-for="item in items" :key="item.id">{{ item.name }}</li>
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
