<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { SessionState, Character } from '../types'
import SessionTabs from '../components/SessionTabs.vue'
import CharacterCard from '../components/CharacterCard.vue'
import LocationCard from '../components/LocationCard.vue'
import QuestTable from '../components/QuestTable.vue'

const route = useRoute()
const { getSession, loading } = useApi()
const state = ref<SessionState | null>(null)

const sessionId = computed(() => route.params.sessionId as string)

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
  <div v-if="loading" class="loading">Loading...</div>
  <div v-else-if="state">
    <h2>{{ state.session.name }}</h2>
    <p class="mb-20">{{ state.session.setting }}</p>

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
        <p v-else class="empty">No player characters.</p>

        <h3 class="mt-30">NPCs</h3>
        <template v-if="npcs.length">
          <CharacterCard
            v-for="char in npcs"
            :key="char.id"
            :character="char"
            compact
          />
        </template>
        <p v-else class="empty">No NPCs.</p>
        <router-link
          v-if="state.characters.filter(c => !c.isPlayer).length > 6"
          :to="`/sessions/${sessionId}/characters`"
          class="btn"
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
        <p v-else class="empty">No locations.</p>
        <router-link
          v-if="state.locations.length > 6"
          :to="`/sessions/${sessionId}/locations`"
          class="btn"
        >
          View all locations
        </router-link>

        <h3 class="mt-30">Active Quests</h3>
        <QuestTable v-if="quests.length" :quests="quests" />
        <p v-else class="empty">No quests.</p>
      </div>
    </div>
  </div>
  <p v-else class="empty">Session not found.</p>
</template>
