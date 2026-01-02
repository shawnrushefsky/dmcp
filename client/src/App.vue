<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import AppFooter from './components/AppFooter.vue'
import CommandPalette from './components/CommandPalette.vue'
import { useTheme } from './composables/useTheme'
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'

// Initialize theme at app level
useTheme()

// Get session ID from route for keyboard shortcuts
const route = useRoute()
const sessionId = computed(() => route.params.sessionId as string | undefined)

// Initialize keyboard shortcuts
useKeyboardShortcuts(sessionId.value)
</script>

<template>
  <div id="app">
    <AppHeader />
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
