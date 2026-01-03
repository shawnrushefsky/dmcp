import { ref, watch, onMounted, onUnmounted, isRef, type Ref } from 'vue'

export interface GameEvent {
  type: string
  gameId: string
  entityId?: string
  entityType?: string
  timestamp: string
  data?: unknown
}

type EventHandler = (event: GameEvent) => void

export function useGameEvents(gameId: Ref<string> | string) {
  const connected = ref(false)
  const lastEvent = ref<GameEvent | null>(null)

  let eventSource: EventSource | null = null
  let currentGameId: string | null = null
  const handlers = new Map<string, Set<EventHandler>>()

  function getGameId(): string {
    return typeof gameId === 'string' ? gameId : gameId.value
  }

  function connect() {
    const id = getGameId()
    if (!id || id === currentGameId) return

    // Disconnect from previous game if any
    if (eventSource) {
      disconnect()
    }

    currentGameId = id
    const url = `/api/games/${id}/subscribe`
    eventSource = new EventSource(url)

    eventSource.onopen = () => {
      connected.value = true
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as GameEvent
        lastEvent.value = data

        // Skip ping events
        if (data.type === 'ping' || data.type === 'connected') return

        // Notify all handlers for this event type
        const typeHandlers = handlers.get(data.type)
        if (typeHandlers) {
          for (const handler of typeHandlers) {
            handler(data)
          }
        }

        // Notify wildcard handlers
        const wildcardHandlers = handlers.get('*')
        if (wildcardHandlers) {
          for (const handler of wildcardHandlers) {
            handler(data)
          }
        }
      } catch {
        // Ignore parse errors
      }
    }

    eventSource.onerror = () => {
      connected.value = false
      // EventSource will auto-reconnect
    }
  }

  function disconnect() {
    if (eventSource) {
      eventSource.close()
      eventSource = null
      currentGameId = null
      connected.value = false
    }
  }

  function on(eventType: string, handler: EventHandler): void {
    if (!handlers.has(eventType)) {
      handlers.set(eventType, new Set())
    }
    handlers.get(eventType)!.add(handler)
  }

  function off(eventType: string, handler: EventHandler): void {
    const typeHandlers = handlers.get(eventType)
    if (typeHandlers) {
      typeHandlers.delete(handler)
    }
  }

  onMounted(() => {
    connect()
  })

  // Watch for gameId changes (for dynamic gameId refs)
  if (isRef(gameId)) {
    watch(gameId, () => {
      connect()
    })
  }

  onUnmounted(() => {
    disconnect()
    handlers.clear()
  })

  return {
    connected,
    lastEvent,
    on,
    off,
    connect,
    disconnect,
  }
}
