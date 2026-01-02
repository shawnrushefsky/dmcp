<script setup lang="ts">
defineProps<{
  content: string
}>()
</script>

<template>
  <pre class="ascii-box">{{ content }}</pre>
</template>
