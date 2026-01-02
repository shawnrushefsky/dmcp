import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getDisplayConfig,
  setDisplayConfig,
  resetDisplayConfig,
  applyThemePreset,
  listThemePresets,
  getSessionDisplayConfig,
  setSessionDisplayConfig,
  applySessionThemePreset,
  resetSessionTheme,
  inferAndApplyTheme,
} from "../tools/display.js";
import { ANNOTATIONS } from "../utils/tool-annotations.js";

// All available theme presets
const themePresetNames = [
  "high-fantasy",
  "dark-fantasy",
  "sci-fi",
  "cyberpunk",
  "western",
  "noir",
  "cosmic-horror",
  "steampunk",
  "post-apocalyptic",
  "pirate",
  "modern",
  "superhero",
] as const;

export function registerDisplayTools(server: McpServer): void {
  // Get display configuration
  server.registerTool(
    "get_display_config",
    {
      description: "Get the current display configuration for the web viewer (colors, fonts, visibility options)",
      inputSchema: {},
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async () => {
      const config = getDisplayConfig();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(config, null, 2),
          },
        ],
      };
    }
  );

  // Set display configuration (full or partial)
  server.registerTool(
    "set_display_config",
    {
      description: "Set display configuration for the web viewer. Can set any subset of options.",
      inputSchema: {
        bgColor: z.string().optional().describe("Background color (e.g., '#1a1a2e')"),
        bgSecondary: z.string().optional().describe("Secondary background color"),
        bgElevated: z.string().optional().describe("Elevated surface background"),
        textColor: z.string().optional().describe("Main text color"),
        textMuted: z.string().optional().describe("Muted text color"),
        accentColor: z.string().optional().describe("Accent color for links and highlights"),
        accentHover: z.string().optional().describe("Accent color on hover"),
        borderColor: z.string().optional().describe("Border color"),
        successColor: z.string().optional().describe("Success/positive color"),
        warningColor: z.string().optional().describe("Warning/caution color"),
        dangerColor: z.string().optional().describe("Danger/error color"),
        codeBackground: z.string().optional().describe("Code/monospace block background"),
        codeText: z.string().optional().describe("Code/monospace text color"),
        borderRadius: z
          .enum(["sharp", "rounded", "soft"])
          .optional()
          .describe("Border radius style: sharp (0px), rounded (12px), soft (24px)"),
        cardStyle: z
          .enum(["clean", "grungy", "tech", "parchment", "metallic", "wooden"])
          .optional()
          .describe("Card visual style"),
        fontDisplay: z.string().optional().describe("Display/heading font (Google Font name)"),
        fontBody: z.string().optional().describe("Body text font (Google Font name)"),
        fontMono: z.string().optional().describe("Monospace font (Google Font name)"),
        showHealthBars: z.boolean().optional().describe("Show health bars on character cards"),
        showConditionTags: z.boolean().optional().describe("Show condition tags"),
        showImages: z.boolean().optional().describe("Show images in the viewer"),
        appTitle: z.string().optional().describe("Custom title for the web viewer"),
      },
      annotations: ANNOTATIONS.SET,
    },
    async (args) => {
      const config = setDisplayConfig(args);
      return {
        content: [
          {
            type: "text",
            text: `Display configuration updated:\n${JSON.stringify(config, null, 2)}`,
          },
        ],
      };
    }
  );

  // Reset display configuration
  server.registerTool(
    "reset_display_config",
    {
      description: "Reset display configuration to defaults",
      inputSchema: {},
      annotations: ANNOTATIONS.SET,
    },
    async () => {
      const config = resetDisplayConfig();
      return {
        content: [
          {
            type: "text",
            text: `Display configuration reset to defaults:\n${JSON.stringify(config, null, 2)}`,
          },
        ],
      };
    }
  );

  // Apply theme preset (global)
  server.registerTool(
    "apply_theme_preset",
    {
      description: "Apply a predefined theme preset globally. Available presets include genre-specific themes with appropriate colors, fonts, and styles.",
      inputSchema: {
        preset: z
          .enum(themePresetNames)
          .describe("Theme preset name"),
      },
      annotations: ANNOTATIONS.SET,
    },
    async ({ preset }) => {
      const config = applyThemePreset(preset);
      if (!config) {
        return {
          content: [{ type: "text", text: `Unknown preset: ${preset}` }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text",
            text: `Applied '${preset}' theme preset:\n${JSON.stringify(config, null, 2)}`,
          },
        ],
      };
    }
  );

  // List theme presets
  server.registerTool(
    "list_theme_presets",
    {
      description: "List all available theme presets with their colors and styles",
      inputSchema: {},
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async () => {
      const presets = listThemePresets();
      return {
        content: [
          {
            type: "text",
            text: `Available theme presets:\n${JSON.stringify(presets, null, 2)}`,
          },
        ],
      };
    }
  );

  // ============================================
  // Per-Session Theme Tools
  // ============================================

  // Get session theme
  server.registerTool(
    "get_session_theme",
    {
      description: "Get the display configuration for a specific game session",
      inputSchema: {
        sessionId: z.string().describe("The session ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ sessionId }) => {
      const config = getSessionDisplayConfig(sessionId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(config, null, 2),
          },
        ],
      };
    }
  );

  // Set session theme
  server.registerTool(
    "set_session_theme",
    {
      description: "Set display configuration for a specific game session. Each session can have its own visual theme.",
      inputSchema: {
        sessionId: z.string().describe("The session ID"),
        bgColor: z.string().optional().describe("Background color"),
        bgSecondary: z.string().optional().describe("Secondary background"),
        bgElevated: z.string().optional().describe("Elevated surface background"),
        textColor: z.string().optional().describe("Text color"),
        textMuted: z.string().optional().describe("Muted text"),
        accentColor: z.string().optional().describe("Accent color"),
        accentHover: z.string().optional().describe("Accent hover color"),
        borderColor: z.string().optional().describe("Border color"),
        successColor: z.string().optional().describe("Success color"),
        warningColor: z.string().optional().describe("Warning color"),
        dangerColor: z.string().optional().describe("Danger color"),
        codeBackground: z.string().optional().describe("Code block background"),
        codeText: z.string().optional().describe("Code text color"),
        borderRadius: z.enum(["sharp", "rounded", "soft"]).optional().describe("Border radius style"),
        cardStyle: z.enum(["clean", "grungy", "tech", "parchment", "metallic", "wooden"]).optional().describe("Card style"),
        fontDisplay: z.string().optional().describe("Display font"),
        fontBody: z.string().optional().describe("Body font"),
        fontMono: z.string().optional().describe("Mono font"),
        showHealthBars: z.boolean().optional().describe("Show health bars"),
        showConditionTags: z.boolean().optional().describe("Show condition tags"),
        showImages: z.boolean().optional().describe("Show images"),
        appTitle: z.string().optional().describe("App title"),
      },
      annotations: ANNOTATIONS.SET,
    },
    async ({ sessionId, ...config }) => {
      const updated = setSessionDisplayConfig(sessionId, config);
      return {
        content: [
          {
            type: "text",
            text: `Session theme updated for ${sessionId}:\n${JSON.stringify(updated, null, 2)}`,
          },
        ],
      };
    }
  );

  // Apply preset to session
  server.registerTool(
    "apply_session_theme_preset",
    {
      description: "Apply a predefined theme preset to a specific game session. This allows different games to have completely different visual themes.",
      inputSchema: {
        sessionId: z.string().describe("The session ID"),
        preset: z.enum(themePresetNames).describe("Theme preset name"),
      },
      annotations: ANNOTATIONS.SET,
    },
    async ({ sessionId, preset }) => {
      const config = applySessionThemePreset(sessionId, preset);
      if (!config) {
        return {
          content: [{ type: "text", text: `Unknown preset: ${preset}` }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text",
            text: `Applied '${preset}' theme to session ${sessionId}:\n${JSON.stringify(config, null, 2)}`,
          },
        ],
      };
    }
  );

  // Reset session theme
  server.registerTool(
    "reset_session_theme",
    {
      description: "Remove a session's custom theme, reverting to the global theme",
      inputSchema: {
        sessionId: z.string().describe("The session ID"),
      },
      annotations: ANNOTATIONS.SET,
    },
    async ({ sessionId }) => {
      resetSessionTheme(sessionId);
      return {
        content: [
          {
            type: "text",
            text: `Session theme reset. Session ${sessionId} will now use the global theme.`,
          },
        ],
      };
    }
  );

  // Auto-apply theme based on genre
  server.registerTool(
    "auto_theme_session",
    {
      description: "Automatically apply an appropriate theme to a session based on its genre and setting. Call this when creating a new game to set up the visual style.",
      inputSchema: {
        sessionId: z.string().describe("The session ID"),
        genre: z.string().describe("Game genre (e.g., 'fantasy', 'sci-fi', 'western', 'noir')"),
        setting: z.string().optional().describe("Optional setting description for more accurate theme matching"),
      },
      annotations: ANNOTATIONS.SET,
    },
    async ({ sessionId, genre, setting }) => {
      const config = inferAndApplyTheme(sessionId, genre, setting);
      return {
        content: [
          {
            type: "text",
            text: `Auto-themed session ${sessionId} based on genre "${genre}":\n${JSON.stringify(config, null, 2)}`,
          },
        ],
      };
    }
  );
}
