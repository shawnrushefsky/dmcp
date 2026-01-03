<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { GameState, Character, Breadcrumb } from '../types'
import GameTabs from '../components/GameTabs.vue'
import CharacterCard from '../components/CharacterCard.vue'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const route = useRoute()
const { getGame, loading } = useApi()
const state = ref<GameState | null>(null)

const gameId = computed(() => route.params.gameId as string)

const breadcrumbs = computed<Breadcrumb[]>(() => [
  { label: 'Games', href: '/' },
  { label: state.value?.game.name || 'Loading...', href: `/games/${gameId.value}` },
  { label: 'Characters' },
])

const playerCharacters = computed(() =>
  state.value?.characters.filter((c: Character) => c.isPlayer) || []
)

const npcs = computed(() =>
  state.value?.characters.filter((c: Character) => !c.isPlayer) || []
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
    <div class="two-col mt-6">
      <div>
        <SkeletonLoader variant="title" width="180px" />
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
    <h2>{{ state.game.name }}</h2>
    <p class="mb-20">{{ state.game.setting }}</p>

    <GameTabs :game-id="gameId" active="characters" :counts="state.counts" />

    <div class="two-col">
      <div>
        <h3>Player Characters ({{ playerCharacters.length }})</h3>
        <template v-if="playerCharacters.length">
          <CharacterCard
            v-for="char in playerCharacters"
            :key="char.id"
            :character="char"
          />
        </template>
        <p v-else class="empty">No player characters.</p>
      </div>
      <div>
        <h3>NPCs ({{ npcs.length }})</h3>
        <template v-if="npcs.length">
          <CharacterCard
            v-for="char in npcs"
            :key="char.id"
            :character="char"
          />
        </template>
        <p v-else class="empty">No NPCs.</p>
      </div>
    </div>
  </div>
  <p v-else class="empty">Game not found.</p>
</template>
