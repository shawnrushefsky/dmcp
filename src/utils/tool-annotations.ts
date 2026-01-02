import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

/**
 * Pre-defined tool annotation sets for common patterns.
 * These follow MCP best practices for describing tool behavior.
 *
 * Per the MCP spec:
 * - readOnlyHint: If true, the tool does not modify its environment (default: false)
 * - destructiveHint: If true, the tool may perform destructive updates (default: true when readOnlyHint is false)
 * - idempotentHint: If true, calling the tool multiple times with same args has same effect as calling once
 * - openWorldHint: If true, the tool may interact with an "open world" of external entities
 */

/**
 * Read-only operations that don't modify state.
 * Examples: get_character, list_locations, render_map
 */
export const READ_ONLY: ToolAnnotations = {
  readOnlyHint: true,
};

/**
 * Operations that create new entities.
 * Examples: create_session, create_character, create_location
 */
export const CREATE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,  // Additive, not destructive
  idempotentHint: false,   // Creates new entity each time
};

/**
 * Operations that update existing entities.
 * Examples: update_character, move_character, apply_damage
 */
export const UPDATE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,  // Updates, not deletes
  idempotentHint: false,   // State changes with each call
};

/**
 * Idempotent update operations where repeated calls have the same effect.
 * Examples: set_rules, set_time (setting to same value)
 */
export const IDEMPOTENT_UPDATE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
};

/**
 * Operations that delete or remove entities permanently.
 * These should trigger human-in-the-loop confirmation in MCP clients.
 * Examples: delete_session, delete_character, remove_combatant
 */
export const DESTRUCTIVE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,  // Deleting twice has same effect as deleting once
};

/**
 * Operations that connect to external systems.
 * Examples: store_image with URL fetching
 */
export const EXTERNAL: ToolAnnotations = {
  readOnlyHint: false,
  openWorldHint: true,
};

/**
 * Read-only operations that connect to external systems.
 * Examples: fetching external images for display
 */
export const EXTERNAL_READ: ToolAnnotations = {
  readOnlyHint: true,
  openWorldHint: true,
};

/**
 * Helper to merge annotation sets with custom overrides.
 */
export function withAnnotations(
  base: ToolAnnotations,
  overrides: Partial<ToolAnnotations>
): ToolAnnotations {
  return { ...base, ...overrides };
}

/**
 * Annotation sets organized by tool category for easy reference.
 */
export const ANNOTATIONS = {
  // Read operations
  READ_ONLY,

  // Write operations
  CREATE,
  UPDATE,
  IDEMPOTENT_UPDATE,
  DESTRUCTIVE,

  // External operations
  EXTERNAL,
  EXTERNAL_READ,

  // Convenience aliases
  GET: READ_ONLY,
  LIST: READ_ONLY,
  RENDER: READ_ONLY,
  DELETE: DESTRUCTIVE,
  REMOVE: DESTRUCTIVE,
  SET: IDEMPOTENT_UPDATE,
} as const;
