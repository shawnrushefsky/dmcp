<script setup lang="ts">
import type { StoredImage } from '../types'

defineProps<{
  image: StoredImage
}>()
</script>

<template>
  <div class="image-card">
    <router-link :to="`/images/${image.id}`">
      <img
        :src="`/images/${image.id}/file`"
        :alt="image.label || 'Image'"
        loading="lazy"
      />
    </router-link>
    <div class="label">{{ image.label || image.entityType }}</div>
  </div>
</template>
