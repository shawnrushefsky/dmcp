/**
 * Safely parse JSON with a fallback value.
 * Prevents crashes from corrupted JSON data in the database.
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safely parse JSON, returning null on error.
 */
export function safeJsonParseOrNull<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
