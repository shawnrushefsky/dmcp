<script setup lang="ts">
defineProps<{
  sessionId: string
  active: 'overview' | 'map' | 'images' | 'history'
}>()
</script>

<template>
  <div class="tabs">
    <router-link
      :to="`/sessions/${sessionId}`"
      :class="{ active: active === 'overview' }"
    >
      Overview
    </router-link>
    <router-link
      :to="`/sessions/${sessionId}/map`"
      :class="{ active: active === 'map' }"
    >
      Map
    </router-link>
    <router-link
      :to="`/sessions/${sessionId}/images`"
      :class="{ active: active === 'images' }"
    >
      Images
    </router-link>
    <router-link
      :to="`/sessions/${sessionId}/history`"
      :class="{ active: active === 'history' }"
    >
      History
    </router-link>
  </div>
</template>
