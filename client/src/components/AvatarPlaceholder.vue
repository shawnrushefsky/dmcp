<script setup lang="ts">
/**
 * AvatarPlaceholder - Shows initials when no image is available
 *
 * Generates a gradient background based on the name for visual variety
 */

interface Props {
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  imageUrl?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
})

// Get initials from name (up to 2 characters)
const initials = computed(() => {
  if (!props.name) return '?'
  const parts = props.name.trim().split(/\s+/).filter(p => p.length > 0)
  if (parts.length === 0) return '?'
  const firstPart = parts[0]
  if (parts.length === 1 || !firstPart) {
    return (firstPart ?? '?').substring(0, 2).toUpperCase()
  }
  const lastPart = parts[parts.length - 1]
  const firstInitial = firstPart[0] ?? ''
  const lastInitial = lastPart?.[0] ?? ''
  return (firstInitial + lastInitial).toUpperCase()
})

// Generate a consistent color based on name
const gradientColors = computed((): [string, string] => {
  const colors: [string, string][] = [
    ['#7c3aed', '#a855f7'], // Purple
    ['#2563eb', '#3b82f6'], // Blue
    ['#059669', '#10b981'], // Green
    ['#dc2626', '#f87171'], // Red
    ['#d97706', '#fbbf24'], // Orange
    ['#0891b2', '#22d3ee'], // Cyan
    ['#7c2d12', '#c2410c'], // Brown
    ['#4f46e5', '#818cf8'], // Indigo
  ]

  // Simple hash from name
  let hash = 0
  const name = props.name || ''
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % colors.length
  return colors[index] ?? ['#7c3aed', '#a855f7']
})

import { computed } from 'vue'
</script>

<template>
  <div
    class="avatar"
    :class="[`avatar-${size}`]"
    :style="{
      background: imageUrl
        ? `url(${imageUrl}) center/cover`
        : `linear-gradient(135deg, ${gradientColors[0]}, ${gradientColors[1]})`,
    }"
  >
    <span v-if="!imageUrl" class="avatar-initials">{{ initials }}</span>
  </div>
</template>

<style scoped>
.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius-full);
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.avatar-sm {
  width: 32px;
  height: 32px;
  font-size: var(--text-xs);
}

.avatar-md {
  width: 48px;
  height: 48px;
  font-size: var(--text-sm);
}

.avatar-lg {
  width: 64px;
  height: 64px;
  font-size: var(--text-lg);
}

.avatar-xl {
  width: 96px;
  height: 96px;
  font-size: var(--text-2xl);
}

.avatar-initials {
  line-height: 1;
}
</style>
