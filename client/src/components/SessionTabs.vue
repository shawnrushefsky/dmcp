<script setup lang="ts">
import { computed } from 'vue'

interface TabCounts {
  characters?: number
  locations?: number
  quests?: number
  images?: number
  events?: number
}

const props = withDefaults(
  defineProps<{
    sessionId: string
    active: 'overview' | 'characters' | 'locations' | 'quests' | 'map' | 'images' | 'history'
    counts?: TabCounts
  }>(),
  {
    counts: () => ({}),
  }
)

// Tab configuration with icons (SVG paths), shortcuts, and count keys
const tabs = computed(() => [
  {
    id: 'overview',
    label: 'Overview',
    to: `/sessions/${props.sessionId}`,
    shortcut: 'g o',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    id: 'characters',
    label: 'Characters',
    to: `/sessions/${props.sessionId}/characters`,
    shortcut: 'g c',
    count: props.counts?.characters,
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  },
  {
    id: 'locations',
    label: 'Locations',
    to: `/sessions/${props.sessionId}/locations`,
    shortcut: 'g l',
    count: props.counts?.locations,
    icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    id: 'quests',
    label: 'Quests',
    to: `/sessions/${props.sessionId}/quests`,
    shortcut: 'g q',
    count: props.counts?.quests,
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  },
  {
    id: 'map',
    label: 'Map',
    to: `/sessions/${props.sessionId}/map`,
    shortcut: 'g m',
    icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  },
  {
    id: 'images',
    label: 'Images',
    to: `/sessions/${props.sessionId}/images`,
    shortcut: 'g i',
    count: props.counts?.images,
    icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    id: 'history',
    label: 'History',
    to: `/sessions/${props.sessionId}/history`,
    shortcut: 'g h',
    count: props.counts?.events,
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
])
</script>

<template>
  <nav class="session-tabs" role="tablist">
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
.session-tabs {
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
