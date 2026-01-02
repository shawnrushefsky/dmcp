import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getDisplayConfig,
  setDisplayConfig,
  resetDisplayConfig,
  applyThemePreset,
  listThemePresets,
  setDisplayOptions,
  setThemeColors,
  setAppTitle,
  setFonts,
} from "../tools/display.js";

export function registerDisplayTools(server: McpServer): void {
  // Get display configuration
  server.tool(
    "get_display_config",
    "Get the current display configuration for the web viewer (colors, fonts, visibility options)",
    {},
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
  server.tool(
    "set_display_config",
    "Set display configuration for the web viewer. Can set any subset of options.",
    {
      bgColor: z.string().optional().describe("Background color (e.g., '#1a1a2e')"),
      bgSecondary: z.string().optional().describe("Secondary background color"),
      textColor: z.string().optional().describe("Main text color"),
      textMuted: z.string().optional().describe("Muted text color"),
      accentColor: z.string().optional().describe("Accent color for links and highlights"),
      borderColor: z.string().optional().describe("Border color"),
      successColor: z.string().optional().describe("Success/positive color"),
      warningColor: z.string().optional().describe("Warning/caution color"),
      asciiBackground: z.string().optional().describe("ASCII box background color"),
      asciiText: z.string().optional().describe("ASCII box text color"),
      showHealthBars: z.boolean().optional().describe("Show health bars on character cards"),
      showAsciiSheets: z.boolean().optional().describe("Show ASCII character sheets"),
      showConditionTags: z.boolean().optional().describe("Show condition tags"),
      showImages: z.boolean().optional().describe("Show images in the viewer"),
      fontFamily: z.string().optional().describe("Main font family"),
      asciiFontFamily: z.string().optional().describe("Font for ASCII art"),
      appTitle: z.string().optional().describe("Custom title for the web viewer"),
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
  server.tool(
    "reset_display_config",
    "Reset display configuration to defaults",
    {},
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

  // Apply theme preset
  server.tool(
    "apply_theme_preset",
    "Apply a predefined theme preset (dark-fantasy, cyberpunk, cosmic-horror, high-fantasy, noir, steampunk, post-apocalyptic)",
    {
      preset: z
        .enum([
          "dark-fantasy",
          "cyberpunk",
          "cosmic-horror",
          "high-fantasy",
          "noir",
          "steampunk",
          "post-apocalyptic",
        ])
        .describe("Theme preset name"),
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
  server.tool(
    "list_theme_presets",
    "List all available theme presets with their colors",
    {},
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

  // Set display options (convenience)
  server.tool(
    "set_display_options",
    "Enable or disable specific display components",
    {
      showHealthBars: z.boolean().optional().describe("Show/hide health bars"),
      showAsciiSheets: z.boolean().optional().describe("Show/hide ASCII character sheets"),
      showConditionTags: z.boolean().optional().describe("Show/hide condition tags"),
      showImages: z.boolean().optional().describe("Show/hide images"),
    },
    async (args) => {
      const config = setDisplayOptions(args);
      return {
        content: [
          {
            type: "text",
            text: `Display options updated:\n- Health Bars: ${config.showHealthBars}\n- ASCII Sheets: ${config.showAsciiSheets}\n- Condition Tags: ${config.showConditionTags}\n- Images: ${config.showImages}`,
          },
        ],
      };
    }
  );

  // Set theme colors (convenience)
  server.tool(
    "set_theme_colors",
    "Set the color scheme for the web viewer",
    {
      bgColor: z.string().optional().describe("Background color"),
      bgSecondary: z.string().optional().describe("Secondary background"),
      textColor: z.string().optional().describe("Text color"),
      textMuted: z.string().optional().describe("Muted text"),
      accentColor: z.string().optional().describe("Accent color"),
      borderColor: z.string().optional().describe("Border color"),
      successColor: z.string().optional().describe("Success color"),
      warningColor: z.string().optional().describe("Warning color"),
      asciiBackground: z.string().optional().describe("ASCII background"),
      asciiText: z.string().optional().describe("ASCII text color"),
    },
    async (args) => {
      const config = setThemeColors(args);
      return {
        content: [
          {
            type: "text",
            text: `Theme colors updated. The web viewer will refresh automatically.`,
          },
        ],
      };
    }
  );

  // Set app title
  server.tool(
    "set_app_title",
    "Set a custom title for the web viewer (e.g., your campaign name)",
    {
      title: z.string().describe("The title to display"),
    },
    async ({ title }) => {
      const config = setAppTitle(title);
      return {
        content: [
          {
            type: "text",
            text: `App title set to: "${config.appTitle}"`,
          },
        ],
      };
    }
  );

  // Set fonts
  server.tool(
    "set_fonts",
    "Set custom fonts for the web viewer",
    {
      fontFamily: z.string().optional().describe("Main font (e.g., 'Georgia, serif')"),
      asciiFontFamily: z.string().optional().describe("Monospace font for ASCII art"),
    },
    async (args) => {
      const config = setFonts(args);
      return {
        content: [
          {
            type: "text",
            text: `Fonts updated:\n- Main: ${config.fontFamily}\n- ASCII: ${config.asciiFontFamily}`,
          },
        ],
      };
    }
  );
}
