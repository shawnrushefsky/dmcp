import { getDatabase } from "../db/connection.js";

export type BorderRadiusStyle = "sharp" | "rounded" | "soft";
export type CardStyle =
  | "clean"
  | "grungy"
  | "tech"
  | "parchment"
  | "metallic"
  | "wooden";

export interface DisplayConfig {
  // Colors
  bgColor: string;
  bgSecondary: string;
  bgElevated: string;
  textColor: string;
  textMuted: string;
  accentColor: string;
  accentHover: string;
  borderColor: string;
  successColor: string;
  warningColor: string;
  dangerColor: string;

  // Code/ASCII block colors (supplemental display)
  codeBackground: string;
  codeText: string;

  // Visual style options
  borderRadius: BorderRadiusStyle;
  cardStyle: CardStyle;

  // Fonts (Google Fonts names)
  fontDisplay: string; // Heading/display font
  fontBody: string; // Body text font
  fontMono: string; // Monospace font

  // Display options
  showHealthBars: boolean;
  showAsciiSheets: boolean;
  showConditionTags: boolean;
  showImages: boolean;

  // Custom title
  appTitle: string;
}

const defaultConfig: DisplayConfig = {
  // Colors - modern dark theme
  bgColor: "#0f0f1a",
  bgSecondary: "#1a1a2e",
  bgElevated: "#252545",
  textColor: "#f0f0f5",
  textMuted: "#9090a0",
  accentColor: "#7c3aed",
  accentHover: "#8b5cf6",
  borderColor: "#3a3a5c",
  successColor: "#22c55e",
  warningColor: "#f59e0b",
  dangerColor: "#ef4444",

  // Code block colors
  codeBackground: "#0a0a15",
  codeText: "#a0a0b0",

  // Visual style
  borderRadius: "rounded",
  cardStyle: "clean",

  // Fonts
  fontDisplay: "Inter",
  fontBody: "Inter",
  fontMono: "JetBrains Mono",

  // Display options
  showHealthBars: true,
  showAsciiSheets: false, // ASCII is supplemental, not primary
  showConditionTags: true,
  showImages: true,

  // Title
  appTitle: "DMCP Game Viewer",
};

// Preset themes for different game genres
// Each preset provides a complete visual identity appropriate for the genre
export const themePresets: Record<string, Partial<DisplayConfig>> = {
  // Classic medieval fantasy with gold accents and parchment feel
  "high-fantasy": {
    bgColor: "#1a1610",
    bgSecondary: "#252015",
    bgElevated: "#302a1f",
    textColor: "#f5e6c8",
    textMuted: "#a09070",
    accentColor: "#daa520",
    accentHover: "#ffd700",
    borderColor: "#4a4030",
    successColor: "#6b8e23",
    warningColor: "#cd853f",
    dangerColor: "#8b0000",
    codeBackground: "#151208",
    codeText: "#c0b090",
    borderRadius: "rounded",
    cardStyle: "parchment",
    fontDisplay: "Cinzel",
    fontBody: "Lora",
    fontMono: "Fira Code",
    appTitle: "High Fantasy Adventures",
  },

  // Dark, gritty fantasy with purple/blood red tones
  "dark-fantasy": {
    bgColor: "#0d0a10",
    bgSecondary: "#15101a",
    bgElevated: "#201825",
    textColor: "#d0c8d8",
    textMuted: "#706878",
    accentColor: "#9d174d",
    accentHover: "#be185d",
    borderColor: "#3d2848",
    successColor: "#4a5568",
    warningColor: "#92400e",
    dangerColor: "#991b1b",
    codeBackground: "#08050a",
    codeText: "#8b7090",
    borderRadius: "sharp",
    cardStyle: "grungy",
    fontDisplay: "Uncial Antiqua",
    fontBody: "Crimson Text",
    fontMono: "Fira Code",
    appTitle: "Dark Fantasy Campaign",
  },

  // Futuristic sci-fi with cyan/chrome aesthetic
  "sci-fi": {
    bgColor: "#050810",
    bgSecondary: "#0a1020",
    bgElevated: "#101830",
    textColor: "#e0e8f0",
    textMuted: "#6080a0",
    accentColor: "#06b6d4",
    accentHover: "#22d3ee",
    borderColor: "#1e3a5f",
    successColor: "#10b981",
    warningColor: "#f59e0b",
    dangerColor: "#ef4444",
    codeBackground: "#020508",
    codeText: "#4ecdc4",
    borderRadius: "sharp",
    cardStyle: "tech",
    fontDisplay: "Orbitron",
    fontBody: "Exo 2",
    fontMono: "Share Tech Mono",
    appTitle: "Sci-Fi Chronicles",
  },

  // Neon-drenched cyberpunk with pink/yellow highlights
  cyberpunk: {
    bgColor: "#0a0a0f",
    bgSecondary: "#121218",
    bgElevated: "#1a1a24",
    textColor: "#e0e0e8",
    textMuted: "#6b6b80",
    accentColor: "#f72585",
    accentHover: "#ff4d9d",
    borderColor: "#2d2d40",
    successColor: "#39ff14",
    warningColor: "#ffee00",
    dangerColor: "#ff0055",
    codeBackground: "#050508",
    codeText: "#00ffff",
    borderRadius: "sharp",
    cardStyle: "tech",
    fontDisplay: "Orbitron",
    fontBody: "Share Tech",
    fontMono: "Fira Code",
    appTitle: "Cyberpunk Chronicles",
  },

  // Wild west with tan/rust/leather tones
  western: {
    bgColor: "#1a1510",
    bgSecondary: "#252018",
    bgElevated: "#302820",
    textColor: "#e8dcc8",
    textMuted: "#a09080",
    accentColor: "#b45309",
    accentHover: "#d97706",
    borderColor: "#4a3828",
    successColor: "#65a30d",
    warningColor: "#ca8a04",
    dangerColor: "#b91c1c",
    codeBackground: "#100c08",
    codeText: "#9a8060",
    borderRadius: "soft",
    cardStyle: "wooden",
    fontDisplay: "Rye",
    fontBody: "Bitter",
    fontMono: "Courier Prime",
    appTitle: "Wild West Adventures",
  },

  // Black and white noir with red accents
  noir: {
    bgColor: "#0a0a0a",
    bgSecondary: "#141414",
    bgElevated: "#1e1e1e",
    textColor: "#e0e0e0",
    textMuted: "#707070",
    accentColor: "#dc2626",
    accentHover: "#ef4444",
    borderColor: "#333333",
    successColor: "#6b7280",
    warningColor: "#9ca3af",
    dangerColor: "#b91c1c",
    codeBackground: "#050505",
    codeText: "#808080",
    borderRadius: "sharp",
    cardStyle: "clean",
    fontDisplay: "Playfair Display",
    fontBody: "Source Serif Pro",
    fontMono: "IBM Plex Mono",
    appTitle: "Noir Detective Story",
  },

  // Eldritch cosmic horror with deep purple/green void colors
  "cosmic-horror": {
    bgColor: "#08060d",
    bgSecondary: "#100d18",
    bgElevated: "#181324",
    textColor: "#c8c0d8",
    textMuted: "#605870",
    accentColor: "#7c3aed",
    accentHover: "#8b5cf6",
    borderColor: "#2d2840",
    successColor: "#4b5563",
    warningColor: "#78716c",
    dangerColor: "#7f1d1d",
    codeBackground: "#040308",
    codeText: "#6b21a8",
    borderRadius: "soft",
    cardStyle: "grungy",
    fontDisplay: "Special Elite",
    fontBody: "Alegreya",
    fontMono: "Fira Code",
    appTitle: "Cosmic Horror Campaign",
  },

  // Victorian steampunk with brass/copper/sepia tones
  steampunk: {
    bgColor: "#1a1512",
    bgSecondary: "#251f18",
    bgElevated: "#302820",
    textColor: "#e0d0b8",
    textMuted: "#908068",
    accentColor: "#b87333",
    accentHover: "#cd853f",
    borderColor: "#4a3c2c",
    successColor: "#6b8e23",
    warningColor: "#b8860b",
    dangerColor: "#8b4513",
    codeBackground: "#100c08",
    codeText: "#b87333",
    borderRadius: "rounded",
    cardStyle: "metallic",
    fontDisplay: "IM Fell English SC",
    fontBody: "IM Fell English",
    fontMono: "Courier Prime",
    appTitle: "Steampunk Adventures",
  },

  // Post-apocalyptic wasteland with grey/rust/warning colors
  "post-apocalyptic": {
    bgColor: "#12100e",
    bgSecondary: "#1a1815",
    bgElevated: "#24201c",
    textColor: "#c8c0b0",
    textMuted: "#787068",
    accentColor: "#ea580c",
    accentHover: "#f97316",
    borderColor: "#3a3428",
    successColor: "#65a30d",
    warningColor: "#eab308",
    dangerColor: "#dc2626",
    codeBackground: "#0a0908",
    codeText: "#808070",
    borderRadius: "sharp",
    cardStyle: "grungy",
    fontDisplay: "Bangers",
    fontBody: "Oswald",
    fontMono: "Share Tech Mono",
    appTitle: "Wasteland Chronicles",
  },

  // Pirate/nautical theme with ocean blue/gold/wood
  pirate: {
    bgColor: "#0d1418",
    bgSecondary: "#141e24",
    bgElevated: "#1c2830",
    textColor: "#e0dcd0",
    textMuted: "#7890a0",
    accentColor: "#d4a017",
    accentHover: "#f0c020",
    borderColor: "#2a4050",
    successColor: "#22c55e",
    warningColor: "#eab308",
    dangerColor: "#dc2626",
    codeBackground: "#080c10",
    codeText: "#6890a0",
    borderRadius: "rounded",
    cardStyle: "wooden",
    fontDisplay: "Pirata One",
    fontBody: "Merriweather",
    fontMono: "Fira Code",
    appTitle: "Pirate Adventures",
  },

  // Modern/contemporary urban setting
  modern: {
    bgColor: "#0f0f14",
    bgSecondary: "#18181f",
    bgElevated: "#22222c",
    textColor: "#e8e8ec",
    textMuted: "#8888a0",
    accentColor: "#3b82f6",
    accentHover: "#60a5fa",
    borderColor: "#333340",
    successColor: "#22c55e",
    warningColor: "#f59e0b",
    dangerColor: "#ef4444",
    codeBackground: "#08080c",
    codeText: "#9090a8",
    borderRadius: "rounded",
    cardStyle: "clean",
    fontDisplay: "Inter",
    fontBody: "Inter",
    fontMono: "JetBrains Mono",
    appTitle: "Modern Adventures",
  },

  // Superhero comic book style
  superhero: {
    bgColor: "#0a0c15",
    bgSecondary: "#101525",
    bgElevated: "#182035",
    textColor: "#f0f0f8",
    textMuted: "#7080a0",
    accentColor: "#dc2626",
    accentHover: "#ef4444",
    borderColor: "#253050",
    successColor: "#22c55e",
    warningColor: "#fbbf24",
    dangerColor: "#b91c1c",
    codeBackground: "#050810",
    codeText: "#6080c0",
    borderRadius: "rounded",
    cardStyle: "clean",
    fontDisplay: "Bangers",
    fontBody: "Open Sans",
    fontMono: "Fira Code",
    appTitle: "Superhero Adventures",
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
  bgElevated?: string;
  textColor?: string;
  textMuted?: string;
  accentColor?: string;
  accentHover?: string;
  borderColor?: string;
  successColor?: string;
  warningColor?: string;
  dangerColor?: string;
  codeBackground?: string;
  codeText?: string;
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
 * Set fonts (Google Fonts names)
 */
export function setFonts(fonts: {
  fontDisplay?: string;
  fontBody?: string;
  fontMono?: string;
}): DisplayConfig {
  return setDisplayConfig(fonts);
}

/**
 * Set visual style options
 */
export function setVisualStyle(style: {
  borderRadius?: BorderRadiusStyle;
  cardStyle?: CardStyle;
}): DisplayConfig {
  return setDisplayConfig(style);
}

// ============================================
// Per-Session Theme Support
// ============================================

/**
 * Get display configuration for a specific session
 * Falls back to global config if no session theme exists
 */
export function getSessionDisplayConfig(sessionId: string): DisplayConfig {
  const db = getDatabase();
  const row = db
    .prepare("SELECT config FROM session_themes WHERE session_id = ?")
    .get(sessionId) as { config: string } | undefined;

  if (row) {
    return { ...defaultConfig, ...JSON.parse(row.config) };
  }

  // Fall back to global config
  return getDisplayConfig();
}

/**
 * Set display configuration for a specific session
 */
export function setSessionDisplayConfig(
  sessionId: string,
  config: Partial<DisplayConfig>
): DisplayConfig {
  const db = getDatabase();
  const current = getSessionDisplayConfig(sessionId);
  const updated = { ...current, ...config };

  db.prepare(
    `
    INSERT INTO session_themes (session_id, config, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(session_id) DO UPDATE SET
      config = excluded.config,
      updated_at = excluded.updated_at
  `
  ).run(sessionId, JSON.stringify(updated));

  return updated;
}

/**
 * Apply a preset theme to a specific session
 */
export function applySessionThemePreset(
  sessionId: string,
  presetName: string
): DisplayConfig | null {
  const preset = themePresets[presetName];
  if (!preset) {
    return null;
  }
  return setSessionDisplayConfig(sessionId, preset);
}

/**
 * Reset session theme (removes session-specific config, falls back to global)
 */
export function resetSessionTheme(sessionId: string): void {
  const db = getDatabase();
  db.prepare("DELETE FROM session_themes WHERE session_id = ?").run(sessionId);
}

/**
 * Check if a session has a custom theme
 */
export function hasSessionTheme(sessionId: string): boolean {
  const db = getDatabase();
  const row = db
    .prepare("SELECT 1 FROM session_themes WHERE session_id = ?")
    .get(sessionId);
  return !!row;
}

/**
 * Infer and apply theme based on game genre/setting
 */
export function inferAndApplyTheme(
  sessionId: string,
  genre: string,
  setting?: string
): DisplayConfig {
  const genreLower = genre.toLowerCase();
  const settingLower = (setting || "").toLowerCase();
  const combined = `${genreLower} ${settingLower}`;

  // Map common genre keywords to presets
  let presetName: string | null = null;

  if (
    combined.includes("cyberpunk") ||
    combined.includes("neon") ||
    combined.includes("hacker")
  ) {
    presetName = "cyberpunk";
  } else if (
    combined.includes("sci-fi") ||
    combined.includes("science fiction") ||
    combined.includes("space") ||
    combined.includes("futuristic")
  ) {
    presetName = "sci-fi";
  } else if (
    combined.includes("western") ||
    combined.includes("wild west") ||
    combined.includes("frontier") ||
    combined.includes("cowboy")
  ) {
    presetName = "western";
  } else if (
    combined.includes("noir") ||
    combined.includes("detective") ||
    combined.includes("mystery") ||
    combined.includes("hardboiled")
  ) {
    presetName = "noir";
  } else if (
    combined.includes("cosmic horror") ||
    combined.includes("lovecraft") ||
    combined.includes("eldritch") ||
    combined.includes("cthulhu")
  ) {
    presetName = "cosmic-horror";
  } else if (
    combined.includes("steampunk") ||
    combined.includes("victorian") ||
    combined.includes("clockwork")
  ) {
    presetName = "steampunk";
  } else if (
    combined.includes("post-apocalyptic") ||
    combined.includes("wasteland") ||
    combined.includes("apocalypse") ||
    combined.includes("survival")
  ) {
    presetName = "post-apocalyptic";
  } else if (
    combined.includes("pirate") ||
    combined.includes("nautical") ||
    combined.includes("sailing") ||
    combined.includes("ocean")
  ) {
    presetName = "pirate";
  } else if (
    combined.includes("superhero") ||
    combined.includes("comic") ||
    combined.includes("hero")
  ) {
    presetName = "superhero";
  } else if (
    combined.includes("modern") ||
    combined.includes("contemporary") ||
    combined.includes("urban")
  ) {
    presetName = "modern";
  } else if (
    combined.includes("dark fantasy") ||
    combined.includes("grimdark") ||
    combined.includes("dark")
  ) {
    presetName = "dark-fantasy";
  } else if (
    combined.includes("fantasy") ||
    combined.includes("medieval") ||
    combined.includes("magic") ||
    combined.includes("dragon")
  ) {
    presetName = "high-fantasy";
  }

  if (presetName) {
    return applySessionThemePreset(sessionId, presetName) || getDisplayConfig();
  }

  // No match - use default
  return getDisplayConfig();
}
