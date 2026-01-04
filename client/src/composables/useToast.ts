import { ref, readonly } from 'vue'

export type ToastType = 'error' | 'warning' | 'success' | 'info'

export interface Toast {
  id: number
  message: string
  title?: string
  type: ToastType
  duration: number
}

const toasts = ref<Toast[]>([])
let nextId = 0

function addToast(options: Omit<Toast, 'id'>) {
  const id = nextId++
  toasts.value.push({ ...options, id })
  return id
}

function removeToast(id: number) {
  const index = toasts.value.findIndex((t) => t.id === id)
  if (index !== -1) {
    toasts.value.splice(index, 1)
  }
}

export function useToast() {
  function showError(message: string, title?: string, duration = 5000) {
    return addToast({ message, title, type: 'error', duration })
  }

  function showWarning(message: string, title?: string, duration = 4000) {
    return addToast({ message, title, type: 'warning', duration })
  }

  function showSuccess(message: string, title?: string, duration = 3000) {
    return addToast({ message, title, type: 'success', duration })
  }

  function showInfo(message: string, title?: string, duration = 4000) {
    return addToast({ message, title, type: 'info', duration })
  }

  function dismiss(id: number) {
    removeToast(id)
  }

  function dismissAll() {
    toasts.value = []
  }

  return {
    toasts: readonly(toasts),
    showError,
    showWarning,
    showSuccess,
    showInfo,
    dismiss,
    dismissAll,
  }
}
