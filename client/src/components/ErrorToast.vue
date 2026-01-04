<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="visible" class="toast-container" :class="type">
        <div class="toast-content">
          <span class="toast-icon">{{ icon }}</span>
          <div class="toast-message">
            <strong v-if="title">{{ title }}</strong>
            <p>{{ message }}</p>
          </div>
          <button class="toast-close" @click="dismiss" aria-label="Dismiss">
            &times;
          </button>
        </div>
        <div v-if="duration > 0" class="toast-progress" :style="{ animationDuration: `${duration}ms` }"></div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

export type ToastType = 'error' | 'warning' | 'success' | 'info'

const props = withDefaults(
  defineProps<{
    message: string
    title?: string
    type?: ToastType
    duration?: number
    visible?: boolean
  }>(),
  {
    type: 'error',
    duration: 5000,
    visible: false,
  }
)

const emit = defineEmits<{
  dismiss: []
}>()

const visible = ref(props.visible)
let timeoutId: ReturnType<typeof setTimeout> | null = null

const icon = computed(() => {
  switch (props.type) {
    case 'error':
      return '!'
    case 'warning':
      return '?'
    case 'success':
      return '\u2713'
    case 'info':
      return 'i'
    default:
      return '!'
  }
})

function dismiss() {
  visible.value = false
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
  emit('dismiss')
}

function startTimer() {
  if (props.duration > 0) {
    timeoutId = setTimeout(dismiss, props.duration)
  }
}

watch(
  () => props.visible,
  (newVal) => {
    visible.value = newVal
    if (newVal) {
      startTimer()
    }
  }
)

onMounted(() => {
  if (props.visible) {
    startTimer()
  }
})
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  min-width: 300px;
  max-width: 450px;
  background: var(--card-bg, #1a1a2e);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  z-index: 10000;
}

.toast-container.error {
  border-left: 4px solid #dc3545;
}

.toast-container.warning {
  border-left: 4px solid #ffc107;
}

.toast-container.success {
  border-left: 4px solid #28a745;
}

.toast-container.info {
  border-left: 4px solid #17a2b8;
}

.toast-content {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  gap: 12px;
}

.toast-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
}

.error .toast-icon {
  background: rgba(220, 53, 69, 0.2);
  color: #dc3545;
}

.warning .toast-icon {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

.success .toast-icon {
  background: rgba(40, 167, 69, 0.2);
  color: #28a745;
}

.info .toast-icon {
  background: rgba(23, 162, 184, 0.2);
  color: #17a2b8;
}

.toast-message {
  flex: 1;
  color: var(--text-primary, #eee);
}

.toast-message strong {
  display: block;
  margin-bottom: 4px;
}

.toast-message p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary, #aaa);
}

.toast-close {
  background: none;
  border: none;
  color: var(--text-secondary, #aaa);
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  padding: 0;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.toast-close:hover {
  opacity: 1;
}

.toast-progress {
  height: 3px;
  background: currentColor;
  opacity: 0.3;
  animation: shrink linear forwards;
}

@keyframes shrink {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

/* Transitions */
.toast-enter-active {
  animation: slideIn 0.3s ease-out;
}

.toast-leave-active {
  animation: slideOut 0.2s ease-in;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}
</style>
