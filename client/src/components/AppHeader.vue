<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { Breadcrumb } from '../types'

const route = useRoute()

const breadcrumbs = computed<Breadcrumb[]>(() => {
  const crumbs: Breadcrumb[] = [{ label: 'Home', href: '/' }]

  if (route.meta.breadcrumbs) {
    return route.meta.breadcrumbs as Breadcrumb[]
  }

  // Build breadcrumbs based on route
  const name = route.name as string
  const params = route.params

  if (name === 'session' || name?.startsWith('session-')) {
    if (params.sessionId) {
      crumbs.push({
        label: 'Session',
        href: name === 'session' ? undefined : `/sessions/${params.sessionId}`,
      })
    }
    if (name === 'session-map') crumbs.push({ label: 'Map' })
    if (name === 'session-images') crumbs.push({ label: 'Images' })
    if (name === 'session-history') crumbs.push({ label: 'History' })
  }

  return crumbs
})
</script>

<template>
  <header>
    <h1>
      <router-link to="/">DMCP Game Viewer</router-link>
    </h1>
    <nav v-if="breadcrumbs.length > 1" class="breadcrumbs">
      <template v-for="(crumb, index) in breadcrumbs" :key="index">
        <router-link v-if="crumb.href && index < breadcrumbs.length - 1" :to="crumb.href">
          {{ crumb.label }}
        </router-link>
        <span v-else>{{ crumb.label }}</span>
        <span v-if="index < breadcrumbs.length - 1"> / </span>
      </template>
    </nav>
  </header>
</template>

<style scoped>
header {
  background: var(--bg-secondary);
  padding: 15px 20px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 20px;
}

header h1 {
  font-size: 1.5rem;
}

header h1 a {
  color: var(--accent);
  text-decoration: none;
}

.breadcrumbs {
  margin-top: 10px;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.breadcrumbs a {
  color: var(--accent);
  text-decoration: none;
}

.breadcrumbs a:hover {
  text-decoration: underline;
}
</style>
