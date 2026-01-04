/**
 * Structured error response with suggestions for agents
 */
export interface AgentError {
  isError: true;
  errorCode: string;
  message: string;
  entityType?: string;
  entityId?: string;
  suggestions: string[];
}

/**
 * Common error codes and their suggestions
 */
const ERROR_SUGGESTIONS: Record<string, string[]> = {
  GAME_NOT_FOUND: [
    'Use get_game_menu to see available games',
    'Create a new game with create_game',
  ],
  CHARACTER_NOT_FOUND: [
    'Use list_characters to see available characters',
    'Create a character with create_character',
  ],
  LOCATION_NOT_FOUND: [
    'Use list_locations to see available locations',
    'Create a location with create_location',
  ],
  QUEST_NOT_FOUND: [
    'Use list_quests to see available quests',
    'Create a quest with create_quest',
  ],
  ITEM_NOT_FOUND: [
    'Use list_items or get_inventory to see available items',
    'Create an item with create_item',
  ],
  FACTION_NOT_FOUND: [
    'Use list_factions to see available factions',
    'Create a faction with create_faction',
  ],
  ABILITY_NOT_FOUND: [
    'Use list_abilities to see available abilities',
    'Create an ability with create_ability',
  ],
  COMBAT_NOT_ACTIVE: [
    'Start combat with start_combat',
    'Check if combat exists with get_active_combat',
  ],
  INVALID_INPUT: [
    'Check the input schema for required fields',
    'Verify all IDs reference existing entities',
  ],
  PERMISSION_DENIED: [
    'Check if the entity belongs to the current game',
    'Verify the character has permission for this action',
  ],
};

/**
 * Create a structured error response with suggestions
 */
export function createError(
  errorCode: string,
  message: string,
  options?: {
    entityType?: string;
    entityId?: string;
    additionalSuggestions?: string[];
  }
): AgentError {
  const baseSuggestions = ERROR_SUGGESTIONS[errorCode] || [];
  const suggestions = [...baseSuggestions, ...(options?.additionalSuggestions || [])];

  return {
    isError: true,
    errorCode,
    message,
    entityType: options?.entityType,
    entityId: options?.entityId,
    suggestions,
  };
}

/**
 * Format an AgentError for MCP tool response
 */
export function formatErrorResponse(error: AgentError) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(error, null, 2),
      },
    ],
    isError: true,
  };
}

/**
 * Convenience helpers for common error types
 */
export const errors = {
  gameNotFound: (gameId: string) =>
    createError('GAME_NOT_FOUND', `Game '${gameId}' not found`, {
      entityType: 'game',
      entityId: gameId,
    }),

  characterNotFound: (characterId: string) =>
    createError('CHARACTER_NOT_FOUND', `Character '${characterId}' not found`, {
      entityType: 'character',
      entityId: characterId,
    }),

  locationNotFound: (locationId: string) =>
    createError('LOCATION_NOT_FOUND', `Location '${locationId}' not found`, {
      entityType: 'location',
      entityId: locationId,
    }),

  questNotFound: (questId: string) =>
    createError('QUEST_NOT_FOUND', `Quest '${questId}' not found`, {
      entityType: 'quest',
      entityId: questId,
    }),

  itemNotFound: (itemId: string) =>
    createError('ITEM_NOT_FOUND', `Item '${itemId}' not found`, {
      entityType: 'item',
      entityId: itemId,
    }),

  factionNotFound: (factionId: string) =>
    createError('FACTION_NOT_FOUND', `Faction '${factionId}' not found`, {
      entityType: 'faction',
      entityId: factionId,
    }),

  abilityNotFound: (abilityId: string) =>
    createError('ABILITY_NOT_FOUND', `Ability '${abilityId}' not found`, {
      entityType: 'ability',
      entityId: abilityId,
    }),

  combatNotActive: (gameId: string) =>
    createError('COMBAT_NOT_ACTIVE', 'No active combat in this game', {
      entityType: 'game',
      entityId: gameId,
    }),

  invalidInput: (message: string, additionalSuggestions?: string[]) =>
    createError('INVALID_INPUT', message, { additionalSuggestions }),
};
