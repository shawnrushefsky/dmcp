import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as imageTools from "../tools/images.js";
import { LIMITS } from "../utils/validation.js";

export function registerImageTools(server: McpServer) {
  server.tool(
    "store_image",
    "Store an image for an entity (from base64 data or URL)",
    {
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

  server.tool(
    "get_image",
    "Get image metadata by ID",
    {
      imageId: z.string().max(100).describe("The image ID"),
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

  server.tool(
    "get_image_data",
    "Get image with base64 data included (for displaying or processing)",
    {
      imageId: z.string().max(100).describe("The image ID"),
    },
    async ({ imageId }) => {
      const result = imageTools.getImageData(imageId);
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

  server.tool(
    "list_entity_images",
    "List all images for an entity",
    {
      entityId: z.string().max(100).describe("ID of the entity"),
      entityType: z
        .enum(["character", "location", "item", "scene"])
        .describe("Type of entity"),
    },
    async ({ entityId, entityType }) => {
      const result = imageTools.listEntityImages(entityId, entityType);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "delete_image",
    "Delete a stored image (removes file and database record)",
    {
      imageId: z.string().max(100).describe("The image ID"),
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

  server.tool(
    "set_primary_image",
    "Set an image as the primary image for its entity",
    {
      imageId: z.string().max(100).describe("The image ID to set as primary"),
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

  server.tool(
    "update_image_metadata",
    "Update label or description of an image",
    {
      imageId: z.string().max(100).describe("The image ID"),
      label: z.string().max(LIMITS.NAME_MAX).optional().describe("New label"),
      description: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("New description"),
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
