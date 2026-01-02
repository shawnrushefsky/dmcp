<script setup lang="ts">
/**
 * SkeletonLoader - Shimmer loading placeholder component
 *
 * Variants:
 * - text: Line of text
 * - title: Larger heading text
 * - avatar: Circular avatar
 * - image: Image placeholder
 * - card: Full card placeholder
 * - button: Button placeholder
 */

interface Props {
  variant?: 'text' | 'title' | 'avatar' | 'image' | 'card' | 'button'
  width?: string
  height?: string
  lines?: number
  avatarSize?: 'sm' | 'md' | 'lg' | 'xl'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'text',
  lines: 1,
  avatarSize: 'md',
})

const avatarSizes = {
  sm: '32px',
  md: '48px',
  lg: '64px',
  xl: '96px',
}
</script>

<template>
  <!-- Text variant -->
  <div v-if="variant === 'text'" class="skeleton-wrapper">
    <div
      v-for="i in lines"
      :key="i"
      class="skeleton skeleton-text"
      :style="{
        width: i === lines && lines > 1 ? '60%' : width || '100%',
        height: height || '1em',
      }"
    />
  </div>

  <!-- Title variant -->
  <div
    v-else-if="variant === 'title'"
    class="skeleton skeleton-title"
    :style="{
      width: width || '50%',
      height: height || '1.5em',
    }"
  />

  <!-- Avatar variant -->
  <div
    v-else-if="variant === 'avatar'"
    class="skeleton skeleton-avatar"
    :style="{
      width: width || avatarSizes[avatarSize],
      height: height || avatarSizes[avatarSize],
    }"
  />

  <!-- Image variant -->
  <div
    v-else-if="variant === 'image'"
    class="skeleton skeleton-image"
    :style="{
      width: width || '100%',
      height: height || '180px',
    }"
  />

  <!-- Button variant -->
  <div
    v-else-if="variant === 'button'"
    class="skeleton skeleton-button"
    :style="{
      width: width || '100px',
      height: height || '36px',
    }"
  />

  <!-- Card variant - full card skeleton -->
  <div v-else-if="variant === 'card'" class="skeleton-card">
    <div class="skeleton skeleton-image" />
    <div class="skeleton-card-content">
      <div class="skeleton skeleton-title" />
      <div class="skeleton skeleton-text" />
      <div class="skeleton skeleton-text" style="width: 70%" />
    </div>
  </div>
</template>

<style scoped>
.skeleton-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-secondary) 25%,
    var(--bg-elevated) 50%,
    var(--bg-secondary) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: var(--border-radius-sm);
}

.skeleton-text {
  height: 1em;
}

.skeleton-title {
  height: 1.5em;
  width: 50%;
  margin-bottom: var(--space-4);
}

.skeleton-avatar {
  border-radius: var(--border-radius-full);
  flex-shrink: 0;
}

.skeleton-image {
  width: 100%;
  height: 180px;
  border-radius: var(--border-radius);
}

.skeleton-button {
  border-radius: var(--border-radius-sm);
}

.skeleton-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  overflow: hidden;
}

.skeleton-card .skeleton-image {
  border-radius: 0;
  margin-bottom: 0;
}

.skeleton-card-content {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.skeleton-card-content .skeleton-title {
  margin-bottom: var(--space-2);
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
