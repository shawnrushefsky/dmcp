import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as imageTools from "../tools/images.js";
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
          .enum(["character", "location", "item", "scene"])
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
          .enum(["character", "location", "item", "scene"])
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
      description: "Update label or description of an image",
      inputSchema: {
        imageId: z.string().max(100).describe("The image ID"),
        label: z.string().max(LIMITS.NAME_MAX).optional().describe("New label"),
        description: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("New description"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ imageId, label, description }) => {
      const image = imageTools.updateImageMetadata(imageId, {
        label,
        description,
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
    }
  );
}
