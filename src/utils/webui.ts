/**
 * Get the base URL for the HTTP web UI
 */
export function getWebUiBaseUrl(): string {
  const port = parseInt(process.env.DMCP_HTTP_PORT || "3000", 10);
  return `http://localhost:${port}`;
}

/**
 * Get the web UI URL for a session
 */
export function getSessionUrl(sessionId: string): string {
  return `${getWebUiBaseUrl()}/sessions/${sessionId}`;
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
