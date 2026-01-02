<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { SessionState, Character, Breadcrumb } from '../types'
import SessionTabs from '../components/SessionTabs.vue'
import CharacterCard from '../components/CharacterCard.vue'
import Breadcrumbs from '../components/Breadcrumbs.vue'

const route = useRoute()
const { getSession, loading } = useApi()
const state = ref<SessionState | null>(null)

const sessionId = computed(() => route.params.sessionId as string)

const breadcrumbs = computed<Breadcrumb[]>(() => [
  { label: 'Games', href: '/' },
  { label: state.value?.session.name || 'Session', href: `/sessions/${sessionId.value}` },
  { label: 'Characters' },
])

const playerCharacters = computed(() =>
  state.value?.characters.filter((c: Character) => c.isPlayer) || []
)

const npcs = computed(() =>
  state.value?.characters.filter((c: Character) => !c.isPlayer) || []
)

onMounted(async () => {
  state.value = await getSession(sessionId.value)
})
</script>

<template>
  <div v-if="loading" class="loading">Loading...</div>
  <div v-else-if="state">
    <Breadcrumbs :items="breadcrumbs" />
    <h2>{{ state.session.name }}</h2>
    <p class="mb-20">{{ state.session.setting }}</p>

    <SessionTabs :session-id="sessionId" active="characters" />

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
  <p v-else class="empty">Session not found.</p>
</template>
