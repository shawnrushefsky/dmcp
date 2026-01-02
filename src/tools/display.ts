import { getDatabase } from "../db/connection.js";

export interface DisplayConfig {
  // Colors
  bgColor: string;
  bgSecondary: string;
  textColor: string;
  textMuted: string;
  accentColor: string;
  borderColor: string;
  successColor: string;
  warningColor: string;

  // ASCII box colors
  asciiBackground: string;
  asciiText: string;

  // Display options
  showHealthBars: boolean;
  showAsciiSheets: boolean;
  showConditionTags: boolean;
  showImages: boolean;

  // Fonts
  fontFamily: string;
  asciiFontFamily: string;

  // Custom title
  appTitle: string;
}

const defaultConfig: DisplayConfig = {
  bgColor: "#1a1a2e",
  bgSecondary: "#16213e",
  textColor: "#eee",
  textMuted: "#888",
  accentColor: "#e94560",
  borderColor: "#333",
  successColor: "#4ade80",
  warningColor: "#fbbf24",
  asciiBackground: "#000",
  asciiText: "#0f0",
  showHealthBars: true,
  showAsciiSheets: true,
  showConditionTags: true,
  showImages: true,
  fontFamily: "'Segoe UI', system-ui, sans-serif",
  asciiFontFamily: "'Courier New', monospace",
  appTitle: "DMCP Game Viewer",
};

// Preset themes for different game genres
export const themePresets: Record<string, Partial<DisplayConfig>> = {
  "dark-fantasy": {
    bgColor: "#1a1a2e",
    bgSecondary: "#16213e",
    accentColor: "#e94560",
    asciiText: "#0f0",
    appTitle: "Dark Fantasy Campaign",
  },
  "cyberpunk": {
    bgColor: "#0d0d0d",
    bgSecondary: "#1a1a1a",
    accentColor: "#00ffff",
    textColor: "#00ff00",
    asciiBackground: "#0a0a0a",
    asciiText: "#00ffff",
    appTitle: "Cyberpunk Chronicles",
  },
  "cosmic-horror": {
    bgColor: "#0f0f1a",
    bgSecondary: "#1a1a2f",
    accentColor: "#8b00ff",
    textColor: "#c0c0c0",
    asciiBackground: "#050510",
    asciiText: "#6a0dad",
    appTitle: "Cosmic Horror Campaign",
  },
  "high-fantasy": {
    bgColor: "#1a2f1a",
    bgSecondary: "#0f1f0f",
    accentColor: "#ffd700",
    textColor: "#f0e68c",
    asciiBackground: "#0a1a0a",
    asciiText: "#90ee90",
    appTitle: "High Fantasy Adventures",
  },
  "noir": {
    bgColor: "#1a1a1a",
    bgSecondary: "#0d0d0d",
    accentColor: "#ff4444",
    textColor: "#cccccc",
    textMuted: "#666666",
    asciiBackground: "#000000",
    asciiText: "#888888",
    appTitle: "Noir Detective Story",
  },
  "steampunk": {
    bgColor: "#2a1f1a",
    bgSecondary: "#1f1510",
    accentColor: "#cd7f32",
    textColor: "#deb887",
    asciiBackground: "#1a1008",
    asciiText: "#b8860b",
    appTitle: "Steampunk Adventures",
  },
  "post-apocalyptic": {
    bgColor: "#1f1a15",
    bgSecondary: "#151210",
    accentColor: "#ff6600",
    textColor: "#b0a090",
    asciiBackground: "#0a0805",
    asciiText: "#808000",
    appTitle: "Wasteland Chronicles",
  },
};

/**
 * Get the current display configuration
 */
export function getDisplayConfig(): DisplayConfig {
  const db = getDatabase();
  const row = db
    .prepare("SELECT config FROM display_config WHERE id = 1")
    .get() as { config: string } | undefined;

  if (row) {
    return { ...defaultConfig, ...JSON.parse(row.config) };
  }
  return { ...defaultConfig };
}

/**
 * Set the display configuration (full or partial update)
 */
export function setDisplayConfig(
  config: Partial<DisplayConfig>
): DisplayConfig {
  const db = getDatabase();
  const current = getDisplayConfig();
  const updated = { ...current, ...config };

  db.prepare(
    `
    INSERT INTO display_config (id, config, updated_at)
    VALUES (1, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      config = excluded.config,
      updated_at = excluded.updated_at
  `
  ).run(JSON.stringify(updated));

  return updated;
}

/**
 * Reset display configuration to defaults
 */
export function resetDisplayConfig(): DisplayConfig {
  const db = getDatabase();
  db.prepare("DELETE FROM display_config WHERE id = 1").run();
  return { ...defaultConfig };
}

/**
 * Apply a preset theme
 */
export function applyThemePreset(presetName: string): DisplayConfig | null {
  const preset = themePresets[presetName];
  if (!preset) {
    return null;
  }
  return setDisplayConfig(preset);
}

/**
 * List available theme presets
 */
export function listThemePresets(): Array<{
  name: string;
  preview: Partial<DisplayConfig>;
}> {
  return Object.entries(themePresets).map(([name, preview]) => ({
    name,
    preview,
  }));
}

/**
 * Set specific display options (convenience function)
 */
export function setDisplayOptions(options: {
  showHealthBars?: boolean;
  showAsciiSheets?: boolean;
  showConditionTags?: boolean;
  showImages?: boolean;
}): DisplayConfig {
  return setDisplayConfig(options);
}

/**
 * Set theme colors (convenience function)
 */
export function setThemeColors(colors: {
  bgColor?: string;
  bgSecondary?: string;
  textColor?: string;
  textMuted?: string;
  accentColor?: string;
  borderColor?: string;
  successColor?: string;
  warningColor?: string;
  asciiBackground?: string;
  asciiText?: string;
}): DisplayConfig {
  return setDisplayConfig(colors);
}

/**
 * Set the app title
 */
export function setAppTitle(title: string): DisplayConfig {
  return setDisplayConfig({ appTitle: title });
}

/**
 * Set fonts
 */
export function setFonts(fonts: {
  fontFamily?: string;
  asciiFontFamily?: string;
}): DisplayConfig {
  return setDisplayConfig(fonts);
}
