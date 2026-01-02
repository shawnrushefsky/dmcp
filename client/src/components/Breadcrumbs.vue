<script setup lang="ts">
import type { Breadcrumb } from '../types'

defineProps<{
  items: Breadcrumb[]
}>()
</script>

<template>
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <ol>
      <li v-for="(item, index) in items" :key="index">
        <router-link v-if="item.href && index < items.length - 1" :to="item.href">
          {{ item.label }}
        </router-link>
        <span v-else class="current">{{ item.label }}</span>
        <span v-if="index < items.length - 1" class="separator">/</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.breadcrumbs {
  margin-bottom: 20px;
  font-size: 0.9em;
}

.breadcrumbs ol {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25em;
}

.breadcrumbs li {
  display: flex;
  align-items: center;
  gap: 0.25em;
}

.breadcrumbs a {
  color: var(--accent-color);
  text-decoration: none;
}

.breadcrumbs a:hover {
  text-decoration: underline;
}

.breadcrumbs .current {
  color: var(--text-secondary);
}

.breadcrumbs .separator {
  color: var(--text-secondary);
  margin: 0 0.25em;
}
</style>
