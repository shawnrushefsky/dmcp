import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as noteTools from "../tools/notes.js";

export function registerNoteTools(server: McpServer) {
  server.tool(
    "create_note",
    "Create a session note",
    {
      sessionId: z.string().describe("The session ID"),
      title: z.string().describe("Note title"),
      content: z.string().describe("Note content (supports markdown)"),
      category: z.string().optional().describe("Category (e.g., 'plot', 'npc', 'location', 'idea', 'recap')"),
      relatedEntityId: z.string().optional().describe("ID of related entity"),
      relatedEntityType: z.string().optional().describe("Type of related entity"),
      tags: z.array(z.string()).optional().describe("Tags for the note"),
      pinned: z.boolean().optional().describe("Pin this note"),
    },
    async (params) => {
      const note = noteTools.createNote(params);
      return {
        content: [{ type: "text", text: JSON.stringify(note, null, 2) }],
      };
    }
  );

  server.tool(
    "get_note",
    "Get a note by ID",
    {
      noteId: z.string().describe("The note ID"),
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

  server.tool(
    "update_note",
    "Update a note's content",
    {
      noteId: z.string().describe("The note ID"),
      title: z.string().optional().describe("New title"),
      content: z.string().optional().describe("New content"),
      category: z.string().nullable().optional().describe("New category"),
      relatedEntityId: z.string().nullable().optional().describe("New related entity ID"),
      relatedEntityType: z.string().nullable().optional().describe("New related entity type"),
      tags: z.array(z.string()).optional().describe("Replace tags"),
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

  server.tool(
    "delete_note",
    "Delete a note",
    {
      noteId: z.string().describe("The note ID"),
    },
    async ({ noteId }) => {
      const success = noteTools.deleteNote(noteId);
      return {
        content: [{ type: "text", text: success ? "Note deleted" : "Note not found" }],
        isError: !success,
      };
    }
  );

  server.tool(
    "list_notes",
    "List notes with optional filters",
    {
      sessionId: z.string().describe("The session ID"),
      category: z.string().optional().describe("Filter by category"),
      pinned: z.boolean().optional().describe("Filter by pinned status"),
      tag: z.string().optional().describe("Filter by tag"),
      relatedEntityId: z.string().optional().describe("Filter by related entity"),
    },
    async ({ sessionId, ...filter }) => {
      const notes = noteTools.listNotes(sessionId, filter);
      return {
        content: [{ type: "text", text: JSON.stringify(notes, null, 2) }],
      };
    }
  );

  server.tool(
    "search_notes",
    "Search notes by title or content",
    {
      sessionId: z.string().describe("The session ID"),
      query: z.string().describe("Search query"),
    },
    async ({ sessionId, query }) => {
      const notes = noteTools.searchNotes(sessionId, query);
      return {
        content: [{ type: "text", text: JSON.stringify(notes, null, 2) }],
      };
    }
  );

  server.tool(
    "pin_note",
    "Toggle a note's pinned status",
    {
      noteId: z.string().describe("The note ID"),
      pinned: z.boolean().describe("Pin or unpin"),
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

  server.tool(
    "add_note_tag",
    "Add a tag to a note",
    {
      noteId: z.string().describe("The note ID"),
      tag: z.string().describe("Tag to add"),
    },
    async ({ noteId, tag }) => {
      const note = noteTools.addNoteTag(noteId, tag);
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

  server.tool(
    "remove_note_tag",
    "Remove a tag from a note",
    {
      noteId: z.string().describe("The note ID"),
      tag: z.string().describe("Tag to remove"),
    },
    async ({ noteId, tag }) => {
      const note = noteTools.removeNoteTag(noteId, tag);
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

  server.tool(
    "generate_recap",
    "Auto-generate a session recap note from recent narrative events",
    {
      sessionId: z.string().describe("The session ID"),
      eventLimit: z.number().optional().describe("Maximum events to include (default: 20)"),
    },
    async ({ sessionId, eventLimit }) => {
      const note = noteTools.generateRecap(sessionId, eventLimit);
      return {
        content: [{ type: "text", text: JSON.stringify(note, null, 2) }],
      };
    }
  );
}
