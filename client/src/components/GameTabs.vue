<script setup lang="ts">
import { computed } from 'vue'
import type { GameCounts } from '../types'

const props = withDefaults(
  defineProps<{
    gameId: string
    active: 'overview' | 'characters' | 'locations' | 'quests' | 'map' | 'images' | 'history' | 'factions' | 'resources' | 'notes' | 'items' | 'settings'
    counts?: Partial<GameCounts>
  }>(),
  {
    counts: () => ({}),
  }
)

// Core tabs (always shown)
const coreTabs = computed(() => [
  {
    id: 'overview',
    label: 'Overview',
    to: `/games/${props.gameId}`,
    shortcut: 'g o',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    id: 'characters',
    label: 'Characters',
    to: `/games/${props.gameId}/characters`,
    shortcut: 'g c',
    count: props.counts?.characters,
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  },
  {
    id: 'locations',
    label: 'Locations',
    to: `/games/${props.gameId}/locations`,
    shortcut: 'g l',
    count: props.counts?.locations,
    icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    id: 'quests',
    label: 'Quests',
    to: `/games/${props.gameId}/quests`,
    shortcut: 'g q',
    count: props.counts?.quests,
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  },
])

// Conditional tabs (only shown when count > 0)
const conditionalTabs = computed(() => {
  const tabs = []

  if ((props.counts?.factions ?? 0) > 0) {
    tabs.push({
      id: 'factions',
      label: 'Factions',
      to: `/games/${props.gameId}/factions`,
      shortcut: 'g f',
      count: props.counts?.factions,
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    })
  }

  if ((props.counts?.resources ?? 0) > 0) {
    tabs.push({
      id: 'resources',
      label: 'Resources',
      to: `/games/${props.gameId}/resources`,
      shortcut: 'g r',
      count: props.counts?.resources,
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    })
  }

  if ((props.counts?.notes ?? 0) > 0) {
    tabs.push({
      id: 'notes',
      label: 'Notes',
      to: `/games/${props.gameId}/notes`,
      shortcut: 'g n',
      count: props.counts?.notes,
      icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    })
  }

  if ((props.counts?.items ?? 0) > 0) {
    tabs.push({
      id: 'items',
      label: 'Items',
      to: `/games/${props.gameId}/items`,
      shortcut: 'g t',
      count: props.counts?.items,
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    })
  }

  return tabs
})

// Utility tabs (always at end)
const utilityTabs = computed(() => [
  {
    id: 'map',
    label: 'Map',
    to: `/games/${props.gameId}/map`,
    shortcut: 'g m',
    icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  },
  {
    id: 'images',
    label: 'Images',
    to: `/games/${props.gameId}/images`,
    shortcut: 'g i',
    count: props.counts?.images,
    icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    id: 'history',
    label: 'History',
    to: `/games/${props.gameId}/history`,
    shortcut: 'g h',
    count: props.counts?.events,
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    id: 'settings',
    label: 'Settings',
    to: `/games/${props.gameId}/settings`,
    shortcut: 'g s',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  },
])

// Combined tabs: core + conditional + utility
const tabs = computed(() => [
  ...coreTabs.value,
  ...conditionalTabs.value,
  ...utilityTabs.value,
])
</script>

<template>
  <nav class="game-tabs" role="tablist">
    <router-link
      v-for="tab in tabs"
      :key="tab.id"
      :to="tab.to"
      class="tab"
      :class="{ active: active === tab.id }"
      role="tab"
      :aria-selected="active === tab.id"
      :title="`${tab.label}${tab.shortcut ? ` (${tab.shortcut})` : ''}`"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="tab-icon">
        <path :d="tab.icon" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="tab-label">{{ tab.label }}</span>
      <span v-if="tab.count !== undefined && tab.count > 0" class="tab-count">
        {{ tab.count }}
      </span>
      <span class="tab-shortcut">{{ tab.shortcut }}</span>
    </router-link>
  </nav>
</template>

<style scoped>
.game-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border, #3a3a5c);
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 20px;
  font-size: var(--text-sm, 0.875rem);
  font-weight: 500;
  color: var(--text-muted, #9090a0);
  text-decoration: none;
  background: transparent;
  border: 1px solid transparent;
  transition: all var(--transition-fast, 150ms ease);
  position: relative;
}

.tab:hover {
  color: var(--text, #f0f0f5);
  background: var(--bg-elevated, #252545);
  border-color: var(--border, #3a3a5c);
}

.tab:hover .tab-shortcut {
  opacity: 1;
}

.tab.active {
  color: white;
  background: var(--accent, #7c3aed);
  border-color: var(--accent, #7c3aed);
}

.tab-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.tab-label {
  white-space: nowrap;
}

.tab-count {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.15);
}

.tab:not(.active) .tab-count {
  background: var(--bg-elevated, #252545);
}

.tab-shortcut {
  position: absolute;
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  font-family: var(--font-mono, monospace);
  color: var(--text-muted, #9090a0);
  background: var(--bg-elevated, #252545);
  padding: 2px 6px;
  border-radius: 4px;
  opacity: 0;
  transition: opacity var(--transition-fast, 150ms ease);
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
}

/* Responsive: hide labels on small screens */
@media (max-width: 768px) {
  .tab-label {
    display: none;
  }

  .tab {
    padding: 10px 12px;
  }

  .tab-icon {
    width: 18px;
    height: 18px;
  }

  .tab-shortcut {
    display: none;
  }
}
</style>
