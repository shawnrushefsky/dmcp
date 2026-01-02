<script setup lang="ts">
defineProps<{
  sessionId: string
  active: 'overview' | 'characters' | 'locations' | 'quests' | 'map' | 'images' | 'history'
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
      :to="`/sessions/${sessionId}/characters`"
      :class="{ active: active === 'characters' }"
    >
      Characters
    </router-link>
    <router-link
      :to="`/sessions/${sessionId}/locations`"
      :class="{ active: active === 'locations' }"
    >
      Locations
    </router-link>
    <router-link
      :to="`/sessions/${sessionId}/quests`"
      :class="{ active: active === 'quests' }"
    >
      Quests
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
