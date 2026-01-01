import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as secretTools from "../tools/secrets.js";
import { LIMITS } from "../utils/validation.js";

export function registerSecretTools(server: McpServer) {
  server.tool(
    "create_secret",
    "Create a secret that can be revealed to specific characters",
    {
      sessionId: z.string().max(100).describe("The session ID"),
      name: z.string().min(1).max(LIMITS.NAME_MAX).describe("Secret name (for DM reference)"),
      description: z.string().max(LIMITS.DESCRIPTION_MAX).describe("The actual secret information"),
      category: z.string().max(100).optional().describe("Category (e.g., 'plot', 'character', 'location', 'item')"),
      relatedEntityId: z.string().max(100).optional().describe("ID of related entity"),
      relatedEntityType: z.string().max(100).optional().describe("Type of related entity"),
      clues: z.array(z.string().max(LIMITS.DESCRIPTION_MAX)).max(LIMITS.ARRAY_MAX).optional().describe("Clues that hint at this secret"),
    },
    async (params) => {
      const secret = secretTools.createSecret(params);
      return {
        content: [{ type: "text", text: JSON.stringify(secret, null, 2) }],
      };
    }
  );

  server.tool(
    "get_secret",
    "Get a secret by ID (DM view - shows all info)",
    {
      secretId: z.string().max(100).describe("The secret ID"),
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

  server.tool(
    "update_secret",
    "Update a secret's details",
    {
      secretId: z.string().max(100).describe("The secret ID"),
      name: z.string().max(LIMITS.NAME_MAX).optional().describe("New name"),
      description: z.string().max(LIMITS.DESCRIPTION_MAX).optional().describe("New description"),
      category: z.string().max(100).nullable().optional().describe("New category"),
      relatedEntityId: z.string().max(100).nullable().optional().describe("New related entity ID"),
      relatedEntityType: z.string().max(100).nullable().optional().describe("New related entity type"),
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

  server.tool(
    "delete_secret",
    "Delete a secret",
    {
      secretId: z.string().max(100).describe("The secret ID"),
    },
    async ({ secretId }) => {
      const success = secretTools.deleteSecret(secretId);
      return {
        content: [{ type: "text", text: success ? "Secret deleted" : "Secret not found" }],
        isError: !success,
      };
    }
  );

  server.tool(
    "list_secrets",
    "List secrets with optional filters",
    {
      sessionId: z.string().max(100).describe("The session ID"),
      category: z.string().max(100).optional().describe("Filter by category"),
      relatedEntityId: z.string().max(100).optional().describe("Filter by related entity"),
      isPublic: z.boolean().optional().describe("Filter by public status"),
      knownBy: z.string().max(100).optional().describe("Only secrets known by this character ID"),
    },
    async ({ sessionId, ...filter }) => {
      const secrets = secretTools.listSecrets(sessionId, filter);
      return {
        content: [{ type: "text", text: JSON.stringify(secrets, null, 2) }],
      };
    }
  );

  server.tool(
    "reveal_secret",
    "Reveal a secret to specific character(s)",
    {
      secretId: z.string().max(100).describe("The secret ID"),
      characterIds: z.array(z.string().max(100)).max(LIMITS.ARRAY_MAX).describe("Character IDs to reveal to"),
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

  server.tool(
    "make_secret_public",
    "Make a secret public (revealed to everyone)",
    {
      secretId: z.string().max(100).describe("The secret ID"),
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

  server.tool(
    "add_clue",
    "Add a clue to a secret",
    {
      secretId: z.string().max(100).describe("The secret ID"),
      clue: z.string().max(LIMITS.DESCRIPTION_MAX).describe("The clue text"),
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

  server.tool(
    "get_character_knowledge",
    "Get all secrets and clues known by a character",
    {
      sessionId: z.string().max(100).describe("The session ID"),
      characterId: z.string().max(100).describe("The character ID"),
    },
    async ({ sessionId, characterId }) => {
      const knowledge = secretTools.getCharacterKnowledge(sessionId, characterId);
      return {
        content: [{ type: "text", text: JSON.stringify(knowledge, null, 2) }],
      };
    }
  );

  server.tool(
    "check_knows_secret",
    "Check if a character knows a specific secret",
    {
      secretId: z.string().max(100).describe("The secret ID"),
      characterId: z.string().max(100).describe("The character ID"),
    },
    async ({ secretId, characterId }) => {
      const knows = secretTools.checkKnowsSecret(secretId, characterId);
      return {
        content: [{ type: "text", text: JSON.stringify({ knows }, null, 2) }],
      };
    }
  );
}
