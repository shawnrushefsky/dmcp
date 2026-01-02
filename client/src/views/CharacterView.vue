<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import { useEntityLinker } from '../composables/useEntityLinker'
import { useTheme } from '../composables/useTheme'
import type { CharacterSheet, EntityImages, Breadcrumb, SessionState } from '../types'
import HealthBar from '../components/HealthBar.vue'
import AsciiBox from '../components/AsciiBox.vue'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const route = useRoute()
const { getCharacterSheet, getSession, getEntityImages, loading } = useApi()
const { linkText, setSessionState, setItems } = useEntityLinker()
const { config } = useTheme()

const sheet = ref<CharacterSheet | null>(null)
const sessionState = ref<SessionState | null>(null)
const images = ref<EntityImages>({ images: [], primaryImage: null })

const characterId = computed(() => route.params.characterId as string)

const breadcrumbs = computed<Breadcrumb[]>(() => {
  if (!sheet.value) return []
  return [
    { label: 'Games', href: '/' },
    { label: sessionState.value?.session.name || 'Session', href: `/sessions/${sheet.value.character.sessionId}` },
    { label: sheet.value.character.name },
  ]
})

// Update entity linker when session state changes
watch(sessionState, (newState) => setSessionState(newState))
// Also include inventory items as linkable
watch(() => sheet.value?.inventory, (inv) => setItems(inv || []))

onMounted(async () => {
  const [sheetResult, imagesResult] = await Promise.all([
    getCharacterSheet(characterId.value),
    getEntityImages(characterId.value, 'character'),
  ])
  sheet.value = sheetResult
  images.value = imagesResult

  // Fetch session state for entity linking
  if (sheetResult) {
    sessionState.value = await getSession(sheetResult.character.sessionId)
  }
})
</script>

<template>
  <!-- Loading State -->
  <div v-if="loading" class="character-loading">
    <SkeletonLoader variant="text" width="200px" />
    <SkeletonLoader variant="title" width="250px" />
    <div class="two-col">
      <div>
        <SkeletonLoader variant="image" height="250px" />
        <SkeletonLoader variant="card" class="mt-4" />
        <SkeletonLoader variant="card" class="mt-4" />
      </div>
      <div>
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="card" class="mt-4" />
      </div>
    </div>
  </div>

  <!-- Content -->
  <div v-else-if="sheet" class="animate-fade-in">
    <Breadcrumbs :items="breadcrumbs" />
    <h2>
      {{ sheet.character.name }}
      <span class="tag">{{ sheet.character.isPlayer ? 'PC' : 'NPC' }}</span>
    </h2>

    <div class="two-col">
      <div>
        <img
          v-if="images.primaryImage"
          :src="`/images/${images.primaryImage.id}/file`"
          :alt="sheet.character.name"
          class="character-image"
        />

        <div class="card">
          <h3>Status</h3>
          <HealthBar
            v-if="config.showHealthBars"
            :current="sheet.character.status.health"
            :max="sheet.character.status.maxHealth"
          />
          <div class="stat">
            <span class="stat-label">HP</span>
            <span>{{ sheet.character.status.health }}/{{ sheet.character.status.maxHealth }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Level</span>
            <span>{{ sheet.character.status.level }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">XP</span>
            <span>{{ sheet.character.status.experience }}</span>
          </div>
          <div v-if="sheet.locationName" class="stat">
            <span class="stat-label">Location</span>
            <span>{{ sheet.locationName }}</span>
          </div>
          <div v-if="sheet.character.status.conditions.length" class="mt-20">
            <strong>Conditions:</strong><br />
            <span
              v-for="condition in sheet.character.status.conditions"
              :key="condition"
              class="tag condition"
            >
              {{ condition }}
            </span>
          </div>
        </div>

        <div v-if="Object.keys(sheet.character.attributes).length" class="card">
          <h3>Attributes</h3>
          <div
            v-for="(value, key) in sheet.character.attributes"
            :key="key"
            class="stat"
          >
            <span class="stat-label">{{ key }}</span>
            <span>{{ value }}</span>
          </div>
        </div>

        <div v-if="Object.keys(sheet.character.skills).length" class="card">
          <h3>Skills</h3>
          <div
            v-for="(value, key) in sheet.character.skills"
            :key="key"
            class="stat"
          >
            <span class="stat-label">{{ key }}</span>
            <span>{{ value }}</span>
          </div>
        </div>
      </div>

      <div>
        <div v-if="config.showAsciiSheets" class="card">
          <h3>ASCII Character Sheet</h3>
          <AsciiBox :content="sheet.ascii" />
        </div>

        <div v-if="sheet.inventory.length" class="card">
          <h3>Inventory</h3>
          <ul>
            <li v-for="item in sheet.inventory" :key="item.id">
              {{ item.name }}
              <span v-if="item.type">({{ item.type }})</span>
            </li>
          </ul>
        </div>

        <div v-if="sheet.character.notes" class="card">
          <h3>Notes</h3>
          <p class="linked-content" v-html="linkText(sheet.character.notes)"></p>
        </div>

        <div v-if="images.images.length" class="card">
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
    </div>
  </div>
  <p v-else class="empty">Character not found.</p>
</template>

<style scoped>
.character-image {
  width: 100%;
  max-width: 300px;
  border-radius: 8px;
  margin-bottom: 20px;
}
</style>
