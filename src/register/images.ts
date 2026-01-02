import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as imageTools from "../tools/images.js";
import * as sessionTools from "../tools/session.js";
import { LIMITS } from "../utils/validation.js";
import { ANNOTATIONS } from "../utils/tool-annotations.js";

export function registerImageTools(server: McpServer) {
  server.registerTool(
    "store_image",
    {
      description: "Store an image for an entity (from base64 data, URL, or local file path)",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
        entityId: z
          .string()
          .max(100)
          .describe("ID of the entity (character, location, item)"),
        entityType: z
          .enum(["character", "location", "item", "scene", "faction"])
          .describe("Type of entity"),
        base64: z
          .string()
          .optional()
          .describe(
            "Base64-encoded image data (with or without data URI prefix)"
          ),
        url: z.string().max(2000).optional().describe("URL to fetch the image from"),
        filePath: z.string().max(2000).optional().describe("Local file path to copy the image from"),
        label: z
          .string()
          .max(LIMITS.NAME_MAX)
          .optional()
          .describe("Label for the image (e.g., 'Portrait', 'Battle Pose')"),
        description: z
          .string()
          .max(LIMITS.DESCRIPTION_MAX)
          .optional()
          .describe("Description of what's in the image"),
        mimeType: z
          .string()
          .max(100)
          .optional()
          .describe("MIME type (e.g., 'image/png'). Inferred if not provided."),
        generationTool: z
          .string()
          .max(100)
          .optional()
          .describe("Tool used to generate (e.g., 'dalle', 'sdxl', 'midjourney')"),
        generationPrompt: z
          .string()
          .max(LIMITS.CONTENT_MAX)
          .optional()
          .describe("The prompt used to generate the image"),
        setAsPrimary: z
          .boolean()
          .optional()
          .describe("Set this as the primary image for the entity"),
      },
      annotations: ANNOTATIONS.CREATE,
    },
    async (params) => {
      try {
        const image = await imageTools.storeImage(params);
        return {
          content: [{ type: "text", text: JSON.stringify(image, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error storing image: ${error}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "get_image",
    {
      description: "Get image metadata by ID",
      inputSchema: {
        imageId: z.string().max(100).describe("The image ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ imageId }) => {
      const image = imageTools.getImage(imageId);
      if (!image) {
        return {
          content: [{ type: "text", text: "Image not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(image, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_image_data",
    {
      description: "Get image with base64 data included (for displaying or processing). Supports format conversion, resizing, and quality control.",
      inputSchema: {
        imageId: z.string().max(100).describe("The image ID"),
        format: z
          .enum(["jpeg", "webp", "png"])
          .optional()
          .describe("Output format. If not specified, returns original format."),
        width: z
          .number()
          .int()
          .positive()
          .max(4096)
          .optional()
          .describe("Target width in pixels. Image will be resized proportionally if only width is specified."),
        height: z
          .number()
          .int()
          .positive()
          .max(4096)
          .optional()
          .describe("Target height in pixels. Image will be resized proportionally if only height is specified."),
        quality: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Quality for JPEG/WebP (1-100). Default is 80. For PNG, controls compression level."),
        fit: z
          .enum(["cover", "contain", "fill", "inside", "outside"])
          .optional()
          .describe("How to fit the image when both width and height are specified. Default is 'inside' (preserve aspect ratio, fit within dimensions)."),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ imageId, format, width, height, quality, fit }) => {
      const result = await imageTools.getImageData(imageId, {
        format,
        width,
        height,
        quality,
        fit,
      });
      if (!result) {
        return {
          content: [{ type: "text", text: "Image not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    "list_entity_images",
    {
      description: "List all images for an entity",
      inputSchema: {
        entityId: z.string().max(100).describe("ID of the entity"),
        entityType: z
          .enum(["character", "location", "item", "scene", "faction"])
          .describe("Type of entity"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ entityId, entityType }) => {
      const result = imageTools.listEntityImages(entityId, entityType);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    "delete_image",
    {
      description: "Delete a stored image (removes file and database record)",
      inputSchema: {
        imageId: z.string().max(100).describe("The image ID"),
      },
      annotations: ANNOTATIONS.DESTRUCTIVE,
    },
    async ({ imageId }) => {
      const success = imageTools.deleteImage(imageId);
      return {
        content: [
          { type: "text", text: success ? "Image deleted" : "Image not found" },
        ],
        isError: !success,
      };
    }
  );

  server.registerTool(
    "set_primary_image",
    {
      description: "Set an image as the primary image for its entity",
      inputSchema: {
        imageId: z.string().max(100).describe("The image ID to set as primary"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ imageId }) => {
      const image = imageTools.setPrimaryImage(imageId);
      if (!image) {
        return {
          content: [{ type: "text", text: "Image not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(image, null, 2) }],
      };
    }
  );

  server.registerTool(
    "update_image_metadata",
    {
      description: "Update label, description, or entity association of an image",
      inputSchema: {
        imageId: z.string().max(100).describe("The image ID"),
        label: z.string().max(LIMITS.NAME_MAX).optional().describe("New label"),
        description: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("New description"),
        entityId: z.string().max(100).optional().describe("New entity ID to associate the image with"),
        entityType: z.enum(["character", "location", "item", "scene", "faction"]).optional().describe("New entity type (required if changing to a different type of entity)"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ imageId, label, description, entityId, entityType }) => {
      try {
        const image = imageTools.updateImageMetadata(imageId, {
          label,
          description,
          entityId,
          entityType,
        });
        if (!image) {
          return {
            content: [{ type: "text", text: "Image not found" }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify(image, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error updating image: ${error}` }],
          isError: true,
        };
      }
    }
  );

  // ============================================================================
  // BUILD IMAGE PROMPT - construct prompt from entity's structured imageGen data
  // ============================================================================
  server.registerTool(
    "build_image_prompt",
    {
      description: "Build an image generation prompt from an entity's structured imageGen data. If a template exists for the entity type (or a specific templateId is provided), uses template-based building. Otherwise combines imageGen schema, notes/description, and preset defaults.",
      inputSchema: {
        entityId: z.string().max(100).describe("The entity ID (character, location, item, or faction)"),
        entityType: z.enum(["character", "location", "item", "faction"]).describe("Type of entity"),
        sessionId: z.string().max(100).optional().describe("Session ID (optional, inferred from entity if not provided)"),
        templateId: z.string().max(100).optional().describe("Specific template ID to use (optional, uses default for entity type if not provided)"),
      },
      outputSchema: {
        entityId: z.string(),
        entityType: z.enum(["character", "location", "item", "faction"]),
        entityName: z.string(),
        prompt: z.string().describe("The constructed positive prompt"),
        negativePrompt: z.string().describe("The constructed negative prompt"),
        summary: z.string().describe("Human-readable summary for verification"),
        source: z.object({
          fromImageGen: z.boolean().describe("Whether imageGen schema was used"),
          fromNotes: z.boolean().describe("Whether notes/description was used"),
          fromPreset: z.boolean().describe("Whether session preset was applied"),
          fromTemplate: z.boolean().describe("Whether a template was used"),
        }),
        templateUsed: z.string().optional().describe("Name of template used, if any"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ entityId, entityType, sessionId, templateId }) => {
      const { buildImagePrompt } = await import("../tools/image-prompt.js");
      const result = buildImagePrompt(entityId, entityType, sessionId, templateId);
      if (!result) {
        return {
          content: [{ type: "text", text: `Entity not found: ${entityType} ${entityId}` }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    }
  );

  // ============================================================================
  // IMAGE PROMPT TEMPLATES - Template-based prompt building
  // ============================================================================

  server.registerTool(
    "list_image_prompt_templates",
    {
      description: "List all image prompt templates for a session. Templates allow configurable prompt building from entity data using placeholder syntax.",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
      },
      outputSchema: {
        templates: z.array(z.object({
          id: z.string(),
          name: z.string(),
          entityType: z.enum(["character", "location", "item", "faction"]),
          description: z.string().optional(),
          isDefault: z.boolean().optional(),
          priority: z.number().optional(),
        })),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ sessionId }) => {
      const templates = sessionTools.listImagePromptTemplates(sessionId);
      const summary = templates.map(t => ({
        id: t.id,
        name: t.name,
        entityType: t.entityType,
        description: t.description,
        isDefault: t.isDefault,
        priority: t.priority,
      }));
      return {
        content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
        structuredContent: { templates: summary } as unknown as Record<string, unknown>,
      };
    }
  );

  server.registerTool(
    "get_image_prompt_template",
    {
      description: "Get full details of an image prompt template including the template strings.",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
        templateId: z.string().max(100).describe("The template ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ sessionId, templateId }) => {
      const template = sessionTools.getImagePromptTemplate(sessionId, templateId);
      if (!template) {
        return {
          content: [{ type: "text", text: "Template not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(template, null, 2) }],
      };
    }
  );

  server.registerTool(
    "create_image_prompt_template",
    {
      description: `Create a new image prompt template for building prompts from entity data. Templates use placeholder syntax:
- {{field.path}} - simple value substitution
- {{field.path|"default"}} - value with default if missing
- {{field.path|}} - value or empty string if missing

Available fields include: name, notes, subject.primaryDescription, subject.physicalTraits.*, subject.attire.*, subject.environment.*, style.*, composition.*, and any imageGen data.`,
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
        name: z.string().min(1).max(LIMITS.NAME_MAX).describe("Template name"),
        entityType: z.enum(["character", "location", "item", "faction"]).describe("Which entity type this template handles"),
        promptTemplate: z.string().max(LIMITS.CONTENT_MAX).describe("Main prompt template with placeholders"),
        description: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("What this template is for"),
        negativePromptTemplate: z.string().max(LIMITS.CONTENT_MAX).optional().describe("Negative prompt template"),
        promptPrefix: z.string().max(500).optional().describe("Text added before the filled template"),
        promptSuffix: z.string().max(500).optional().describe("Text added after the filled template (e.g., quality tags)"),
        fieldAliases: z.record(z.string().max(100), z.string().max(200)).optional().describe("Alias mappings for complex paths"),
        defaults: z.record(z.string().max(100), z.string().max(200)).optional().describe("Default values for missing fields"),
        priority: z.number().optional().describe("Priority for template selection (higher = preferred)"),
        isDefault: z.boolean().optional().describe("Make this the default template for its entity type"),
      },
      annotations: ANNOTATIONS.CREATE,
    },
    async ({ sessionId, ...params }) => {
      const template = sessionTools.createImagePromptTemplate(sessionId, params);
      return {
        content: [{ type: "text", text: JSON.stringify(template, null, 2) }],
      };
    }
  );

  server.registerTool(
    "update_image_prompt_template",
    {
      description: "Update an existing image prompt template. Only specified fields are updated.",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
        templateId: z.string().max(100).describe("The template ID to update"),
        name: z.string().min(1).max(LIMITS.NAME_MAX).optional().describe("New template name"),
        description: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("New description"),
        promptTemplate: z.string().max(LIMITS.CONTENT_MAX).optional().describe("New prompt template"),
        negativePromptTemplate: z.string().max(LIMITS.CONTENT_MAX).optional().describe("New negative prompt template"),
        promptPrefix: z.string().max(500).optional().describe("New prefix"),
        promptSuffix: z.string().max(500).optional().describe("New suffix"),
        fieldAliases: z.record(z.string().max(100), z.string().max(200)).optional().describe("New field aliases"),
        defaults: z.record(z.string().max(100), z.string().max(200)).optional().describe("New defaults"),
        priority: z.number().optional().describe("New priority"),
        isDefault: z.boolean().optional().describe("Make this the default for its entity type"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ sessionId, templateId, ...updates }) => {
      const template = sessionTools.updateImagePromptTemplate(sessionId, templateId, updates);
      if (!template) {
        return {
          content: [{ type: "text", text: "Template not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(template, null, 2) }],
      };
    }
  );

  server.registerTool(
    "delete_image_prompt_template",
    {
      description: "Delete an image prompt template. This is IRREVERSIBLE.",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
        templateId: z.string().max(100).describe("The template ID to delete"),
      },
      annotations: ANNOTATIONS.DESTRUCTIVE,
    },
    async ({ sessionId, templateId }) => {
      const success = sessionTools.deleteImagePromptTemplate(sessionId, templateId);
      return {
        content: [{ type: "text", text: success ? "Template deleted" : "Template not found" }],
        isError: !success,
      };
    }
  );
}
