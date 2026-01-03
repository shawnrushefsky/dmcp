/**
 * Actual port the HTTP server is running on (set at runtime)
 */
let actualHttpPort: number | null = null;

/**
 * Set the actual HTTP port after server starts
 */
export function setHttpPort(port: number): void {
  actualHttpPort = port;
}

/**
 * Get the base URL for the HTTP web UI
 */
export function getWebUiBaseUrl(): string {
  const port = actualHttpPort ?? parseInt(process.env.DMCP_HTTP_PORT || "3456", 10);
  return `http://localhost:${port}`;
}

/**
 * Get the web UI URL for a game
 */
export function getGameUrl(gameId: string): string {
  return `${getWebUiBaseUrl()}/games/${gameId}`;
}

/**
 * Get the web UI URL for a character
 */
export function getCharacterUrl(characterId: string): string {
  return `${getWebUiBaseUrl()}/characters/${characterId}`;
}

/**
 * Get the web UI URL for a location
 */
export function getLocationUrl(locationId: string): string {
  return `${getWebUiBaseUrl()}/locations/${locationId}`;
}
