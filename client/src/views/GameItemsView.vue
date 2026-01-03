<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { GameState, Item, Character, Location, Breadcrumb } from '../types'
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
  { label: 'Items' },
])

// Group items by owner
const characterItems = computed(() =>
  state.value?.items.filter((i: Item) => i.ownerType === 'character') || []
)

const locationItems = computed(() =>
  state.value?.items.filter((i: Item) => i.ownerType === 'location') || []
)

// Group items by owner for better display
const itemsByCharacter = computed(() => {
  const groups: Record<string, { owner: Character; items: Item[] }> = {}
  const characters = state.value?.characters || []
  for (const item of characterItems.value) {
    const char = characters.find((c: Character) => c.id === item.ownerId)
    if (char) {
      const group = groups[char.id] ?? { owner: char, items: [] }
      group.items.push(item)
      groups[char.id] = group
    }
  }
  return Object.values(groups)
})

const itemsByLocation = computed(() => {
  const groups: Record<string, { owner: Location; items: Item[] }> = {}
  const locations = state.value?.locations || []
  for (const item of locationItems.value) {
    const loc = locations.find((l: Location) => l.id === item.ownerId)
    if (loc) {
      const group = groups[loc.id] ?? { owner: loc, items: [] }
      group.items.push(item)
      groups[loc.id] = group
    }
  }
  return Object.values(groups)
})

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

    <GameTabs :game-id="gameId" active="items" :counts="state.counts" />

    <!-- Character Inventories -->
    <h3>Character Inventories ({{ characterItems.length }} items)</h3>
    <div v-if="itemsByCharacter.length" class="owner-groups">
      <div v-for="group in itemsByCharacter" :key="group.owner.id" class="card owner-group">
        <div class="owner-header">
          <router-link :to="`/characters/${group.owner.id}`" class="owner-name">
            {{ group.owner.name }}
          </router-link>
          <span class="item-count">{{ group.items.length }} item{{ group.items.length !== 1 ? 's' : '' }}</span>
        </div>
        <div class="items-list">
          <router-link
            v-for="item in group.items"
            :key="item.id"
            :to="`/items/${item.id}`"
            class="item-row"
          >
            <span class="item-name">{{ item.name }}</span>
            <span v-if="item.type" class="item-type">{{ item.type }}</span>
          </router-link>
        </div>
      </div>
    </div>
    <p v-else class="empty">No items held by characters.</p>

    <!-- Location Items -->
    <template v-if="locationItems.length">
      <h3 class="mt-30">Location Items ({{ locationItems.length }} items)</h3>
      <div class="owner-groups">
        <div v-for="group in itemsByLocation" :key="group.owner.id" class="card owner-group">
          <div class="owner-header">
            <router-link :to="`/locations/${group.owner.id}`" class="owner-name">
              {{ group.owner.name }}
            </router-link>
            <span class="item-count">{{ group.items.length }} item{{ group.items.length !== 1 ? 's' : '' }}</span>
          </div>
          <div class="items-list">
            <router-link
              v-for="item in group.items"
              :key="item.id"
              :to="`/items/${item.id}`"
              class="item-row"
            >
              <span class="item-name">{{ item.name }}</span>
              <span v-if="item.type" class="item-type">{{ item.type }}</span>
            </router-link>
          </div>
        </div>
      </div>
    </template>
  </div>
  <p v-else class="empty">Game not found.</p>
</template>

<style scoped>
.owner-groups {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);
}

.owner-group {
  padding: var(--space-4);
}

.owner-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--border);
}

.owner-name {
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
}

.owner-name:hover {
  text-decoration: underline;
}

.item-count {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: var(--text);
  transition: background-color var(--transition-fast);
}

.item-row:hover {
  background: var(--bg-secondary);
}

.item-name {
  font-weight: 500;
}

.item-type {
  font-size: var(--text-xs);
  padding: 2px 8px;
  border-radius: 12px;
  background: var(--bg-secondary);
  color: var(--text-muted);
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
