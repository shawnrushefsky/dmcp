<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  current: number
  max: number
}>()

const percent = computed(() => {
  return props.max ? (props.current / props.max) * 100 : 0
})
</script>

<template>
  <div class="health-bar">
    <div class="health-bar-fill" :style="{ width: `${percent}%` }"></div>
  </div>
</template>
