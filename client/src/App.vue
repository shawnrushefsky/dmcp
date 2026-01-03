<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import AppFooter from './components/AppFooter.vue'
import CommandPalette from './components/CommandPalette.vue'
import { useTheme } from './composables/useTheme'
import { useFavicon } from './composables/useFavicon'
import { useKeyboardShortcuts, isCommandPaletteOpen } from './composables/useKeyboardShortcuts'

// Initialize theme at app level
useTheme()

// Initialize favicon at app level
useFavicon()

// Get game ID from route for keyboard shortcuts
const route = useRoute()
const gameId = computed(() => route.params.gameId as string | undefined)

// Initialize keyboard shortcuts
useKeyboardShortcuts(gameId.value)

function openSearch() {
  isCommandPaletteOpen.value = true
}
</script>

<template>
  <div id="app">
    <AppHeader v-if="!gameId" />

    <!-- Global Search Button (top right) -->
    <button v-if="gameId" class="global-search-button" @click="openSearch" title="Search (Cmd+K)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="search-icon">
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="search-text">Search</span>
      <kbd class="search-shortcut">/</kbd>
    </button>

    <main class="container">
      <router-view v-slot="{ Component, route }">
        <Transition :name="route.meta.transition || 'page-fade'" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </router-view>
    </main>
    <AppFooter />

    <!-- Global Components -->
    <CommandPalette />
  </div>
</template>

<style scoped>
#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

main {
  flex: 1;
}

/* Global Search Button - Fixed top right */
.global-search-button {
  position: fixed;
  top: 8px;
  right: 24px;
  z-index: 100;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 20px;
  font-size: var(--text-sm, 0.875rem);
  font-weight: 500;
  color: var(--text-muted, #9090a0);
  background: var(--bg-elevated, #252545);
  border: 1px solid var(--border, #3a3a5c);
  cursor: pointer;
  transition: all var(--transition-fast, 150ms ease);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.global-search-button:hover {
  color: var(--text, #f0f0f5);
  border-color: var(--accent, #7c3aed);
}

.global-search-button .search-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.global-search-button .search-text {
  white-space: nowrap;
}

.global-search-button .search-shortcut {
  font-size: 11px;
  padding: 2px 6px;
  background: var(--bg-secondary, #1a1a2e);
  border-radius: 4px;
  font-family: var(--font-mono, monospace);
}

@media (max-width: 768px) {
  .global-search-button {
    top: 8px;
    right: 16px;
    padding: 10px 12px;
  }

  .global-search-button .search-text,
  .global-search-button .search-shortcut {
    display: none;
  }
}

/* Page fade transition (default) */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.2s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}

/* Page slide transition (for drill-down navigation) */
.page-slide-enter-active,
.page-slide-leave-active {
  transition: all 0.25s ease;
}

.page-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.page-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* Page slide back transition (for going back) */
.page-slide-back-enter-active,
.page-slide-back-leave-active {
  transition: all 0.25s ease;
}

.page-slide-back-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.page-slide-back-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
