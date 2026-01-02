<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import { isCommandPaletteOpen } from '../composables/useKeyboardShortcuts'
import AvatarPlaceholder from './AvatarPlaceholder.vue'

const router = useRouter()
const route = useRoute()
const { search } = useApi()

const query = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const selectedIndex = ref(0)

interface SearchItem {
  id: string
  name: string
  type: 'character' | 'location' | 'quest'
  isPlayer?: boolean
  primaryImageId?: string | null
  status?: string
}

const searchResults = ref<SearchItem[]>([])
const isSearching = ref(false)

// Get session ID from current route
const sessionId = computed(() => {
  return route.params.sessionId as string | undefined
})

// Debounced search
let searchTimeout: ReturnType<typeof setTimeout> | null = null

watch(query, (newQuery) => {
  if (searchTimeout) clearTimeout(searchTimeout)

  if (!newQuery || newQuery.length < 2 || !sessionId.value) {
    searchResults.value = []
    return
  }

  isSearching.value = true
  searchTimeout = setTimeout(async () => {
    const results = await search(sessionId.value!, newQuery)
    searchResults.value = [
      ...results.characters,
      ...results.locations,
      ...results.quests,
    ] as SearchItem[]
    isSearching.value = false
    selectedIndex.value = 0
  }, 150)
})

// Focus input when palette opens
watch(isCommandPaletteOpen, (open) => {
  if (open) {
    query.value = ''
    searchResults.value = []
    selectedIndex.value = 0
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
})

function close() {
  isCommandPaletteOpen.value = false
}

function navigateTo(item: SearchItem) {
  const paths: Record<string, string> = {
    character: `/characters/${item.id}`,
    location: `/locations/${item.id}`,
    quest: `/quests/${item.id}`,
  }
  const path = paths[item.type]
  if (path) {
    router.push(path)
  }
  close()
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, searchResults.value.length - 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
  } else if (event.key === 'Enter' && searchResults.value.length > 0) {
    event.preventDefault()
    const item = searchResults.value[selectedIndex.value]
    if (item) {
      navigateTo(item)
    }
  }
}

function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    character: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    location: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
    quest: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  }
  return icons[type] || ''
}
</script>

<template>
  <Teleport to="body">
    <Transition name="palette">
      <div v-if="isCommandPaletteOpen" class="command-palette-overlay" @click="close">
        <div class="command-palette" @click.stop @keydown="handleKeyDown">
          <div class="search-input-container">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <input
              ref="inputRef"
              v-model="query"
              type="text"
              placeholder="Search characters, locations, quests..."
              class="search-input"
            />
            <kbd class="escape-hint">esc</kbd>
          </div>

          <div v-if="!sessionId" class="no-session">
            <p class="empty-message">Navigate to a game session to search</p>
          </div>

          <div v-else-if="isSearching" class="searching">
            <span class="spinner"></span>
            Searching...
          </div>

          <div v-else-if="searchResults.length === 0 && query.length >= 2" class="no-results">
            No results found for "{{ query }}"
          </div>

          <ul v-else-if="searchResults.length > 0" class="results-list">
            <li
              v-for="(item, index) in searchResults"
              :key="`${item.type}-${item.id}`"
              class="result-item"
              :class="{ selected: index === selectedIndex }"
              @click="navigateTo(item)"
              @mouseenter="selectedIndex = index"
            >
              <div class="result-icon">
                <img
                  v-if="item.primaryImageId"
                  :src="`/images/${item.primaryImageId}/file?width=80&height=80`"
                  :alt="item.name"
                  class="result-thumb"
                />
                <AvatarPlaceholder
                  v-else-if="item.type === 'character'"
                  :name="item.name"
                  size="sm"
                />
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path :d="getTypeIcon(item.type)" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
              <div class="result-content">
                <span class="result-name">{{ item.name }}</span>
                <span class="result-type">
                  {{ item.type }}
                  <span v-if="item.isPlayer" class="pc-badge">PC</span>
                  <span v-if="item.status" class="status-badge" :class="item.status">{{ item.status }}</span>
                </span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="arrow-icon">
                <path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </li>
          </ul>

          <div v-else class="hint">
            <span>Type to search</span>
            <span class="hint-shortcut"><kbd>/</kbd> or <kbd>Cmd+K</kbd> to open</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.command-palette-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
  z-index: var(--z-modal, 200);
}

.command-palette {
  width: 100%;
  max-width: 560px;
  background: var(--bg-secondary, #1a1a2e);
  border: 1px solid var(--border, #3a3a5c);
  border-radius: 12px;
  box-shadow: var(--shadow-lg, 0 8px 24px rgba(0,0,0,0.5));
  overflow: hidden;
}

.search-input-container {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--border, #3a3a5c);
}

.search-icon {
  width: 20px;
  height: 20px;
  color: var(--text-muted, #9090a0);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 16px;
  color: var(--text, #f0f0f5);
}

.search-input::placeholder {
  color: var(--text-muted, #9090a0);
}

.escape-hint {
  font-size: 11px;
  padding: 3px 6px;
  background: var(--bg-elevated, #252545);
  border-radius: 4px;
  color: var(--text-muted, #9090a0);
  font-family: var(--font-mono, monospace);
}

.no-session,
.searching,
.no-results,
.hint {
  padding: 24px;
  text-align: center;
  color: var(--text-muted, #9090a0);
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid var(--border, #3a3a5c);
  border-top-color: var(--accent, #7c3aed);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.results-list {
  list-style: none;
  padding: 8px;
  margin: 0;
  max-height: 400px;
  overflow-y: auto;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color var(--transition-fast, 150ms ease);
}

.result-item:hover,
.result-item.selected {
  background: var(--bg-elevated, #252545);
}

.result-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 6px;
  background: var(--bg-elevated, #252545);
  color: var(--text-muted, #9090a0);
}

.result-icon svg {
  width: 18px;
  height: 18px;
}

.result-thumb {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 6px;
}

.result-content {
  flex: 1;
  min-width: 0;
}

.result-name {
  display: block;
  font-weight: 500;
  color: var(--text, #f0f0f5);
}

.result-type {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm, 0.875rem);
  color: var(--text-muted, #9090a0);
  text-transform: capitalize;
}

.pc-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  background: var(--accent, #7c3aed);
  color: white;
  border-radius: 3px;
}

.status-badge {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--bg-elevated, #252545);
}

.status-badge.active {
  color: var(--success, #22c55e);
}

.status-badge.completed {
  color: var(--text-muted, #9090a0);
}

.arrow-icon {
  width: 16px;
  height: 16px;
  color: var(--text-muted, #9090a0);
  opacity: 0;
  transition: opacity var(--transition-fast, 150ms ease);
}

.result-item.selected .arrow-icon,
.result-item:hover .arrow-icon {
  opacity: 1;
}

.hint {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
}

.hint-shortcut {
  font-size: var(--text-sm, 0.875rem);
}

.hint-shortcut kbd {
  font-size: 11px;
  padding: 2px 6px;
  background: var(--bg-elevated, #252545);
  border-radius: 4px;
  margin: 0 2px;
  font-family: var(--font-mono, monospace);
}

/* Transitions */
.palette-enter-active,
.palette-leave-active {
  transition: opacity 0.15s ease;
}

.palette-enter-active .command-palette,
.palette-leave-active .command-palette {
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.palette-enter-from,
.palette-leave-to {
  opacity: 0;
}

.palette-enter-from .command-palette {
  transform: scale(0.95) translateY(-10px);
  opacity: 0;
}

.palette-leave-to .command-palette {
  transform: scale(0.95) translateY(-10px);
  opacity: 0;
}
</style>
