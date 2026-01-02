<script setup lang="ts">
import { computed } from 'vue'
import type { Breadcrumb } from '../types'

const props = defineProps<{
  items: Breadcrumb[]
}>()

// Icon paths for entity types
const iconPaths: Record<string, string> = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  session: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  character: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  location: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
  quest: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  image: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
}

const processedItems = computed(() =>
  props.items.map((item) => ({
    ...item,
    truncatedLabel: truncate(item.label, 30),
    iconPath: item.icon ? iconPaths[item.icon] : undefined,
  }))
)

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}
</script>

<template>
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <ol>
      <li v-for="(item, index) in processedItems" :key="index">
        <router-link
          v-if="item.href && index < items.length - 1"
          :to="item.href"
          class="breadcrumb-link"
          :title="item.label"
        >
          <svg
            v-if="item.iconPath"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            class="breadcrumb-icon"
          >
            <path :d="item.iconPath" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="breadcrumb-label">{{ item.truncatedLabel }}</span>
        </router-link>
        <span v-else class="breadcrumb-current" :title="item.label">
          <svg
            v-if="item.iconPath"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            class="breadcrumb-icon"
          >
            <path :d="item.iconPath" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="breadcrumb-label">{{ item.truncatedLabel }}</span>
        </span>

        <!-- Chevron separator -->
        <svg
          v-if="index < items.length - 1"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="breadcrumb-separator"
        >
          <path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.breadcrumbs {
  margin-bottom: 20px;
  font-size: var(--text-sm, 0.875rem);
}

.breadcrumbs ol {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.breadcrumbs li {
  display: flex;
  align-items: center;
  gap: 4px;
}

.breadcrumb-link,
.breadcrumb-current {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background-color var(--transition-fast, 150ms ease);
}

.breadcrumb-link {
  color: var(--accent, #7c3aed);
  text-decoration: none;
}

.breadcrumb-link:hover {
  background: var(--bg-elevated, #252545);
  text-decoration: none;
}

.breadcrumb-current {
  color: var(--text, #f0f0f5);
  font-weight: 500;
}

.breadcrumb-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  opacity: 0.7;
}

.breadcrumb-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.breadcrumb-separator {
  width: 14px;
  height: 14px;
  color: var(--text-muted, #9090a0);
  flex-shrink: 0;
  margin: 0 2px;
}

/* Responsive: smaller on mobile */
@media (max-width: 640px) {
  .breadcrumb-label {
    max-width: 100px;
  }
}
</style>
