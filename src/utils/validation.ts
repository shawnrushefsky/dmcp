import { z } from "zod";

/**
 * Common input length limits for security and performance.
 * These prevent DoS attacks via extremely large inputs.
 */
export const LIMITS = {
  // Short text fields (names, titles)
  NAME_MAX: 200,
  // Medium text fields (descriptions)
  DESCRIPTION_MAX: 5000,
  // Long text fields (notes, content)
  CONTENT_MAX: 50000,
  // Very long text fields (story exports, narrative)
  NARRATIVE_MAX: 200000,
  // Array limits
  ARRAY_MAX: 100,
  // JSON object depth limit (for nested structures)
  MAX_DEPTH: 10,
} as const;

/**
 * Pre-built Zod schemas with length limits
 */
export const validatedSchemas = {
  // Name fields (character names, location names, etc.)
  name: z.string().min(1).max(LIMITS.NAME_MAX),

  // Description fields
  description: z.string().max(LIMITS.DESCRIPTION_MAX),

  // Content fields (notes, large text)
  content: z.string().max(LIMITS.CONTENT_MAX),

  // Narrative content (very large text allowed)
  narrative: z.string().max(LIMITS.NARRATIVE_MAX),

  // ID fields (UUIDs are 36 characters)
  id: z.string().max(100),

  // Tag/category strings
  tag: z.string().min(1).max(100),

  // Array of strings with limits
  stringArray: z.array(z.string().max(LIMITS.NAME_MAX)).max(LIMITS.ARRAY_MAX),

  // Array of tags
  tagArray: z.array(z.string().min(1).max(100)).max(LIMITS.ARRAY_MAX),
} as const;

/**
 * Helper to create a bounded string schema
 */
export function boundedString(maxLength: number = LIMITS.NAME_MAX) {
  return z.string().max(maxLength);
}

/**
 * Helper to create a bounded array schema
 */
export function boundedArray<T extends z.ZodType>(
  schema: T,
  maxItems: number = LIMITS.ARRAY_MAX
) {
  return z.array(schema).max(maxItems);
}
