import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as noteTools from "../tools/notes.js";
import { LIMITS } from "../utils/validation.js";
import { ANNOTATIONS } from "../utils/tool-annotations.js";

export function registerNoteTools(server: McpServer) {
  server.registerTool(
    "create_note",
    {
      description: "Create a session note",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
        title: z.string().min(1).max(LIMITS.NAME_MAX).describe("Note title"),
        content: z.string().max(LIMITS.CONTENT_MAX).describe("Note content (supports markdown)"),
        category: z.string().max(100).optional().describe("Category (e.g., 'plot', 'npc', 'location', 'idea', 'recap')"),
        relatedEntityId: z.string().max(100).optional().describe("ID of related entity"),
        relatedEntityType: z.string().max(100).optional().describe("Type of related entity"),
        tags: z.array(z.string().max(LIMITS.NAME_MAX)).max(LIMITS.ARRAY_MAX).optional().describe("Tags for the note"),
        pinned: z.boolean().optional().describe("Pin this note"),
      },
      annotations: ANNOTATIONS.CREATE,
    },
    async (params) => {
      const note = noteTools.createNote(params);
      return {
        content: [{ type: "text", text: JSON.stringify(note, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_note",
    {
      description: "Get a note by ID",
      inputSchema: {
        noteId: z.string().max(100).describe("The note ID"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ noteId }) => {
      const note = noteTools.getNote(noteId);
      if (!note) {
        return {
          content: [{ type: "text", text: "Note not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(note, null, 2) }],
      };
    }
  );

  server.registerTool(
    "update_note",
    {
      description: "Update a note's content",
      inputSchema: {
        noteId: z.string().max(100).describe("The note ID"),
        title: z.string().max(LIMITS.NAME_MAX).optional().describe("New title"),
        content: z.string().max(LIMITS.CONTENT_MAX).optional().describe("New content"),
        category: z.string().max(100).nullable().optional().describe("New category"),
        relatedEntityId: z.string().max(100).nullable().optional().describe("New related entity ID"),
        relatedEntityType: z.string().max(100).nullable().optional().describe("New related entity type"),
        tags: z.array(z.string().max(LIMITS.NAME_MAX)).max(LIMITS.ARRAY_MAX).optional().describe("Replace tags"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ noteId, ...updates }) => {
      const note = noteTools.updateNote(noteId, updates);
      if (!note) {
        return {
          content: [{ type: "text", text: "Note not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(note, null, 2) }],
      };
    }
  );

  server.registerTool(
    "delete_note",
    {
      description: "Delete a note",
      inputSchema: {
        noteId: z.string().max(100).describe("The note ID"),
      },
      annotations: ANNOTATIONS.DESTRUCTIVE,
    },
    async ({ noteId }) => {
      const success = noteTools.deleteNote(noteId);
      return {
        content: [{ type: "text", text: success ? "Note deleted" : "Note not found" }],
        isError: !success,
      };
    }
  );

  server.registerTool(
    "list_notes",
    {
      description: "List notes with optional filters",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
        category: z.string().max(100).optional().describe("Filter by category"),
        pinned: z.boolean().optional().describe("Filter by pinned status"),
        tag: z.string().max(LIMITS.NAME_MAX).optional().describe("Filter by tag"),
        relatedEntityId: z.string().max(100).optional().describe("Filter by related entity"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ sessionId, ...filter }) => {
      const notes = noteTools.listNotes(sessionId, filter);
      return {
        content: [{ type: "text", text: JSON.stringify(notes, null, 2) }],
      };
    }
  );

  server.registerTool(
    "search_notes",
    {
      description: "Search notes by title or content",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
        query: z.string().max(LIMITS.NAME_MAX).describe("Search query"),
      },
      annotations: ANNOTATIONS.READ_ONLY,
    },
    async ({ sessionId, query }) => {
      const notes = noteTools.searchNotes(sessionId, query);
      return {
        content: [{ type: "text", text: JSON.stringify(notes, null, 2) }],
      };
    }
  );

  server.registerTool(
    "pin_note",
    {
      description: "Toggle a note's pinned status",
      inputSchema: {
        noteId: z.string().max(100).describe("The note ID"),
        pinned: z.boolean().describe("Pin or unpin"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ noteId, pinned }) => {
      const note = noteTools.pinNote(noteId, pinned);
      if (!note) {
        return {
          content: [{ type: "text", text: "Note not found" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(note, null, 2) }],
      };
    }
  );

  // ============================================================================
  // MODIFY NOTE TAGS - CONSOLIDATED (replaces add_note_tag + remove_note_tag)
  // ============================================================================
  server.registerTool(
    "modify_note_tags",
    {
      description: "Add and/or remove tags from a note in a single call. More efficient than separate add/remove calls.",
      inputSchema: {
        noteId: z.string().max(100).describe("The note ID"),
        add: z.array(z.string().min(1).max(LIMITS.NAME_MAX)).max(LIMITS.ARRAY_MAX).optional().describe("Tags to add"),
        remove: z.array(z.string().max(LIMITS.NAME_MAX)).max(LIMITS.ARRAY_MAX).optional().describe("Tags to remove"),
      },
      annotations: ANNOTATIONS.UPDATE,
    },
    async ({ noteId, add, remove }) => {
      if (!add?.length && !remove?.length) {
        return {
          content: [{ type: "text", text: "No tags to add or remove" }],
          isError: true,
        };
      }

      const result = noteTools.modifyNoteTags(noteId, { add, remove });
      if (!result) {
        return {
          content: [{ type: "text", text: "Note not found" }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    "generate_recap",
    {
      description: "Auto-generate a session recap note from recent narrative events",
      inputSchema: {
        sessionId: z.string().max(100).describe("The session ID"),
        eventLimit: z.number().optional().describe("Maximum events to include (default: 20)"),
      },
      annotations: ANNOTATIONS.CREATE,
    },
    async ({ sessionId, eventLimit }) => {
      const note = noteTools.generateRecap(sessionId, eventLimit);
      return {
        content: [{ type: "text", text: JSON.stringify(note, null, 2) }],
      };
    }
  );
}
