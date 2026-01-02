import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as secretTools from "../tools/secrets.js";
import { LIMITS } from "../utils/validation.js";
import { ANNOTATIONS } from "../utils/tool-annotations.js";

export function registerSecretTools(server: McpServer) {
  // ============================================================================
  // CREATE SECRET
  // ============================================================================
  server.registerTool(
    "create_secret",
    {
      description: "Create a secret that can be revealed to specific characters",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
        name: z.string().min(1).max(LIMITS.NAME_MAX).describe("Secret name (for DM reference)"),
        description: z.string().max(LIMITS.DESCRIPTION_MAX).describe("The actual secret information"),
        category: z.string().max(100).optional().describe("Category (e.g., 'plot', 'character', 'location', 'item')"),
        relatedEntityId: z.string().max(100).optional().describe("ID of related entity"),
        relatedEntityType: z.string().max(100).optional().describe("Type of related entity"),
        clues: z.array(z.string().max(LIMITS.DESCRIPTION_MAX)).max(LIMITS.ARRAY_MAX).optional().describe("Clues that hint at this secret"),
      },
      annotations: ANNOTATIONS.CREATE,
    },
    async (params) => {
      const secret = secretTools.createSecret(params);
      return {
        content: [{ type: "text", text: JSON.stringify(secret, null, 2) }],
      };
    }
  );

  // ============================================================================
  // GET SECRET - read-only
  // ============================================================================
  server.registerTool(
    "get_secret",
    {
      description: "Get a secret by ID (DM view - shows all info)",
      inputSchema: {
        secretId: z.string().max(100).describe("The secret ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ secretId }) => {
      const secret = secretTools.getSecret(secretId);
      if (!secret) {
        return {
          content: [{ type: "text", text: "Secret not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(secret, null, 2) }],
      };
    }
  );

  // ============================================================================
  // UPDATE SECRET
  // ============================================================================
  server.registerTool(
    "update_secret",
    {
      description: "Update a secret's details",
      inputSchema: {
        secretId: z.string().max(100).describe("The secret ID"),
        name: z.string().max(LIMITS.NAME_MAX).optional().describe("New name"),
        description: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("New description"),
        category: z.string().max(100).nullable().optional().describe("New category"),
        relatedEntityId: z.string().max(100).nullable().optional().describe("New related entity ID"),
        relatedEntityType: z.string().max(100).nullable().optional().describe("New related entity type"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ secretId, ...updates }) => {
      const secret = secretTools.updateSecret(secretId, updates);
      if (!secret) {
        return {
          content: [{ type: "text", text: "Secret not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(secret, null, 2) }],
      };
    }
  );

  // ============================================================================
  // DELETE SECRET - destructive
  // ============================================================================
  server.registerTool(
    "delete_secret",
    {
      description: "Delete a secret permanently. This is IRREVERSIBLE.",
      inputSchema: {
        secretId: z.string().max(100).describe("The secret ID"),
      },
      annotations: ANNOTATIONS.DESTRUCTIVE,
    },
    async ({ secretId }) => {
      const success = secretTools.deleteSecret(secretId);
      return {
        content: [{ type: "text", text: success ? "Secret deleted" : "Secret not found" }],
        isError: !success,
      };
    }
  );

  // ============================================================================
  // LIST SECRETS - read-only
  // ============================================================================
  server.registerTool(
    "list_secrets",
    {
      description: "List secrets with optional filters",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
        category: z.string().max(100).optional().describe("Filter by category"),
        relatedEntityId: z.string().max(100).optional().describe("Filter by related entity"),
        isPublic: z.boolean().optional().describe("Filter by public status"),
        knownBy: z.string().max(100).optional().describe("Only secrets known by this character ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ sessionId, ...filter }) => {
      const secrets = secretTools.listSecrets(sessionId, filter);
      return {
        content: [{ type: "text", text: JSON.stringify(secrets, null, 2) }],
      };
    }
  );

  // ============================================================================
  // REVEAL SECRET
  // ============================================================================
  server.registerTool(
    "reveal_secret",
    {
      description: "Reveal a secret to specific character(s)",
      inputSchema: {
        secretId: z.string().max(100).describe("The secret ID"),
        characterIds: z.array(z.string().max(100)).max(LIMITS.ARRAY_MAX).describe("Character IDs to reveal to"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ secretId, characterIds }) => {
      const secret = secretTools.revealSecret(secretId, characterIds);
      if (!secret) {
        return {
          content: [{ type: "text", text: "Secret not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(secret, null, 2) }],
      };
    }
  );

  // ============================================================================
  // MAKE SECRET PUBLIC
  // ============================================================================
  server.registerTool(
    "make_secret_public",
    {
      description: "Make a secret public (revealed to everyone)",
      inputSchema: {
        secretId: z.string().max(100).describe("The secret ID"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ secretId }) => {
      const secret = secretTools.makePublic(secretId);
      if (!secret) {
        return {
          content: [{ type: "text", text: "Secret not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(secret, null, 2) }],
      };
    }
  );

  // ============================================================================
  // ADD CLUE
  // ============================================================================
  server.registerTool(
    "add_clue",
    {
      description: "Add a clue to a secret",
      inputSchema: {
        secretId: z.string().max(100).describe("The secret ID"),
        clue: z.string().max(LIMITS.DESCRIPTION_MAX).describe("The clue text"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ secretId, clue }) => {
      const secret = secretTools.addClue(secretId, clue);
      if (!secret) {
        return {
          content: [{ type: "text", text: "Secret not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(secret, null, 2) }],
      };
    }
  );

  // ============================================================================
  // GET CHARACTER KNOWLEDGE - read-only
  // ============================================================================
  server.registerTool(
    "get_character_knowledge",
    {
      description: "Get all secrets and clues known by a character",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
        characterId: z.string().max(100).describe("The character ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ sessionId, characterId }) => {
      const knowledge = secretTools.getCharacterKnowledge(sessionId, characterId);
      return {
        content: [{ type: "text", text: JSON.stringify(knowledge, null, 2) }],
      };
    }
  );

  // ============================================================================
  // CHECK KNOWS SECRET - read-only
  // ============================================================================
  server.registerTool(
    "check_knows_secret",
    {
      description: "Check if a character knows a specific secret",
      inputSchema: {
        secretId: z.string().max(100).describe("The secret ID"),
        characterId: z.string().max(100).describe("The character ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ secretId, characterId }) => {
      const knows = secretTools.checkKnowsSecret(secretId, characterId);
      return {
        content: [{ type: "text", text: JSON.stringify({ knows }, null, 2) }],
      };
    }
  );
}
