import { z } from 'zod';

/**
 * Verbosity levels for tool responses:
 * - minimal: Just IDs and names - for quick lookups and references
 * - standard: Common fields needed for most operations (default)
 * - full: All fields including metadata - for detailed inspection
 */
export type VerbosityLevel = 'minimal' | 'standard' | 'full';

export const verbositySchema = z
  .enum(['minimal', 'standard', 'full'])
  .default('standard')
  .describe('Response verbosity: minimal (IDs/names only), standard (common fields), full (all fields)');

/**
 * Field sets for each entity type by verbosity level
 */
export const VERBOSITY_FIELDS = {
  character: {
    minimal: ['id', 'name', 'isPlayer'] as const,
    standard: ['id', 'name', 'isPlayer', 'status', 'locationId'] as const,
    full: null, // null means include all fields
  },
  location: {
    minimal: ['id', 'name'] as const,
    standard: ['id', 'name', 'description', 'properties'] as const,
    full: null,
  },
  quest: {
    minimal: ['id', 'name', 'status'] as const,
    standard: ['id', 'name', 'description', 'status', 'objectives'] as const,
    full: null,
  },
  item: {
    minimal: ['id', 'name'] as const,
    standard: ['id', 'name', 'description', 'quantity', 'ownerId', 'ownerType'] as const,
    full: null,
  },
  faction: {
    minimal: ['id', 'name'] as const,
    standard: ['id', 'name', 'description', 'goals', 'resources'] as const,
    full: null,
  },
  resource: {
    minimal: ['id', 'name', 'currentValue'] as const,
    standard: ['id', 'name', 'description', 'currentValue', 'minValue', 'maxValue'] as const,
    full: null,
  },
  note: {
    minimal: ['id', 'title', 'isPinned'] as const,
    standard: ['id', 'title', 'content', 'category', 'isPinned', 'createdAt'] as const,
    full: null,
  },
} as const;

/**
 * Filter an object to include only specified fields
 */
export function filterFields<T extends object>(
  obj: T,
  fields: readonly string[] | null
): Partial<T> {
  if (fields === null) {
    return obj; // Return full object
  }
  const result: Partial<T> = {};
  for (const field of fields) {
    if (field in obj) {
      (result as Record<string, unknown>)[field] = (obj as Record<string, unknown>)[field];
    }
  }
  return result;
}

/**
 * Apply verbosity filtering to an array of entities
 */
export function applyVerbosity<T extends object>(
  entities: T[],
  entityType: keyof typeof VERBOSITY_FIELDS,
  verbosity: VerbosityLevel
): Partial<T>[] {
  const fields = VERBOSITY_FIELDS[entityType][verbosity];
  return entities.map((entity) => filterFields(entity, fields));
}
