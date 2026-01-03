import { ref, computed, type ComputedRef } from 'vue'
import type { GameState, Item } from '../types'

export interface LinkableEntity {
  id: string
  name: string
  type: 'character' | 'location' | 'quest' | 'faction' | 'item'
  url: string
}

export interface EntityLinkerResult {
  entities: ComputedRef<LinkableEntity[]>
  linkText: (text: string) => string
  setGameState: (state: GameState | null) => void
  setItems: (items: Item[]) => void
}

/**
 * Composable for wiki-style auto-linking of entity names in text.
 *
 * Usage:
 * ```ts
 * const { linkText, setGameState } = useEntityLinker()
 * setGameState(gameState)
 * const linkedHtml = linkText(someDescription)
 * ```
 */
export function useEntityLinker(): EntityLinkerResult {
  const gameState = ref<GameState | null>(null)
  const items = ref<Item[]>([])

  // Build a sorted list of linkable entities (longest names first to avoid partial matches)
  const entities = computed<LinkableEntity[]>(() => {
    if (!gameState.value) return []

    const result: LinkableEntity[] = []

    // Characters
    for (const char of gameState.value.characters) {
      result.push({
        id: char.id,
        name: char.name,
        type: 'character',
        url: `/characters/${char.id}`,
      })
    }

    // Locations
    for (const loc of gameState.value.locations) {
      result.push({
        id: loc.id,
        name: loc.name,
        type: 'location',
        url: `/locations/${loc.id}`,
      })
    }

    // Quests
    for (const quest of gameState.value.quests) {
      result.push({
        id: quest.id,
        name: quest.name,
        type: 'quest',
        url: `/quests/${quest.id}`,
      })
    }

    // Factions
    for (const faction of gameState.value.factions) {
      result.push({
        id: faction.id,
        name: faction.name,
        type: 'faction',
        url: `/factions/${faction.id}`,
      })
    }

    // Items (if provided)
    for (const item of items.value) {
      result.push({
        id: item.id,
        name: item.name,
        type: 'item',
        url: `/items/${item.id}`,
      })
    }

    // Sort by name length descending to match longest names first
    // This prevents "John" from matching before "John Smith"
    result.sort((a, b) => b.name.length - a.name.length)

    return result
  })

  /**
   * Convert plain text to HTML with entity names linked.
   * Handles:
   * - Case-insensitive matching
   * - Word boundaries to avoid partial matches
   * - HTML escaping for security
   * - Markdown-style formatting (bold, italic, line breaks)
   */
  function linkText(text: string): string {
    if (!text || entities.value.length === 0) {
      return escapeHtml(text).replace(/\n/g, '<br>')
    }

    // First, escape HTML to prevent XSS
    let html = escapeHtml(text)

    // Track which positions have been linked to avoid overlapping
    const linked = new Set<number>()

    // Process each entity
    for (const entity of entities.value) {
      // Escape special regex characters in entity name
      const escapedName = escapeRegex(entity.name)

      // Match whole words only (with word boundaries)
      // Also match possessive forms like "John's"
      const regex = new RegExp(
        `\\b(${escapedName})('s)?\\b`,
        'gi'
      )

      const newHtml = html.replace(regex, (fullMatch, name, possessive, offset) => {
        // Check if this position overlaps with an already-linked region
        for (let i = offset; i < offset + fullMatch.length; i++) {
          if (linked.has(i)) {
            return fullMatch // Skip - already part of a link
          }
        }

        // Mark positions as linked
        for (let i = offset; i < offset + fullMatch.length; i++) {
          linked.add(i)
        }

        // Create the link with appropriate styling class
        const link = `<a href="${entity.url}" class="entity-link entity-${entity.type}" data-entity-type="${entity.type}" data-entity-id="${entity.id}">${name}</a>`
        return possessive ? link + possessive : link
      })

      html = newHtml
    }

    // Apply markdown-style formatting
    // Bold: **text**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic: *text*
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Line breaks
    html = html.replace(/\n/g, '<br>')

    return html
  }

  function setGameState(state: GameState | null) {
    gameState.value = state
  }

  function setItems(newItems: Item[]) {
    items.value = newItems
  }

  return {
    entities,
    linkText,
    setGameState,
    setItems,
  }
}

// Helper: Escape HTML special characters
function escapeHtml(text: string): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Helper: Escape special regex characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Provide entity linker at app level for reuse across components.
 * Call this in a parent component and inject in children.
 */
export const ENTITY_LINKER_KEY = Symbol('entityLinker')
