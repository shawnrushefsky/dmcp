<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    current: number
    max: number
    mini?: boolean
    showText?: boolean
  }>(),
  {
    mini: false,
    showText: false,
  }
)

const percent = computed(() => {
  return props.max ? (props.current / props.max) * 100 : 0
})

const colorState = computed(() => {
  if (percent.value > 60) return 'healthy'
  if (percent.value > 30) return 'warning'
  return 'critical'
})

const isCritical = computed(() => percent.value <= 30 && props.current > 0)
</script>

<template>
  <div
    class="health-bar"
    :class="{
      mini,
      [colorState]: true,
      pulsing: isCritical
    }"
  >
    <div class="health-bar-fill" :style="{ width: `${percent}%` }"></div>
    <span v-if="showText" class="health-text">{{ current }}/{{ max }}</span>
  </div>
</template>

<style scoped>
.health-bar {
  height: 12px;
  background: var(--bg-elevated, #252545);
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}

.health-bar.mini {
  height: 6px;
  border-radius: 3px;
}

.health-bar-fill {
  height: 100%;
  border-radius: inherit;
  transition: width 0.3s ease, background-color 0.3s ease;
}

/* Color states */
.health-bar.healthy .health-bar-fill {
  background: linear-gradient(90deg, #16a34a, #22c55e);
}

.health-bar.warning .health-bar-fill {
  background: linear-gradient(90deg, #d97706, #f59e0b);
}

.health-bar.critical .health-bar-fill {
  background: linear-gradient(90deg, #dc2626, #ef4444);
}

/* Pulse animation for critical health */
.health-bar.pulsing .health-bar-fill {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

/* Text overlay */
.health-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs, 0.75rem);
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.health-bar.mini .health-text {
  display: none;
}
</style>
