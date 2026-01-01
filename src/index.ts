#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { initializeSchema } from "./db/schema.js";
import { closeDatabase } from "./db/connection.js";

// Import registration functions
import { registerCoreTools } from "./register/core.js";
import { registerWorldTools } from "./register/world.js";
import { registerCharacterTools } from "./register/character.js";
import { registerCombatTools } from "./register/combat.js";
import { registerInventoryTools } from "./register/inventory.js";
import { registerQuestTools } from "./register/quests.js";
import { registerNarrativeTools } from "./register/narrative.js";
import { registerResourceTools } from "./register/resources.js";
import { registerTimeTools } from "./register/time.js";
import { registerTableTools } from "./register/tables.js";
import { registerSecretTools } from "./register/secrets.js";
import { registerRelationshipTools } from "./register/relationships.js";
import { registerTagTools } from "./register/tags.js";
import { registerStatusTools } from "./register/status.js";
import { registerFactionTools } from "./register/factions.js";
import { registerAbilityTools } from "./register/abilities.js";
import { registerNoteTools } from "./register/notes.js";
import { registerPauseTools } from "./register/pause.js";
import { registerImageTools } from "./register/images.js";
import { registerMcpResources } from "./register/mcp-resources.js";
import { registerMcpPrompts } from "./register/mcp-prompts.js";

// Initialize database
initializeSchema();

// Create MCP server
const server = new McpServer({
  name: "dmcp",
  version: "0.1.0",
});

// Register all tools by domain
registerCoreTools(server);           // Session, Interview, Rules
registerWorldTools(server);          // Locations, Connections, Map
registerCharacterTools(server);      // Characters (PC/NPC)
registerCombatTools(server);         // Combat, Dice, Checks
registerInventoryTools(server);      // Items
registerQuestTools(server);          // Quests, Objectives
registerNarrativeTools(server);      // Events, History, Export, Player Choices
registerResourceTools(server);       // Custom Resources
registerTimeTools(server);           // Calendar, Time, Timers
registerTableTools(server);          // Random Tables
registerSecretTools(server);         // Secrets, Knowledge
registerRelationshipTools(server);   // Relationships
registerTagTools(server);            // Tags
registerStatusTools(server);         // Status Effects
registerFactionTools(server);        // Factions
registerAbilityTools(server);        // Abilities/Powers
registerNoteTools(server);           // Session Notes
registerPauseTools(server);          // Pause/Resume, Context Snapshots, External Updates
registerImageTools(server);          // Stored Images

// Register MCP Resources and Prompts
registerMcpResources(server);        // Read-only data access via URI
registerMcpPrompts(server);          // Reusable prompt templates

// ============================================================================
// START SERVER
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Handle cleanup
process.on("SIGINT", () => {
  closeDatabase();
  process.exit(0);
});

process.on("SIGTERM", () => {
  closeDatabase();
  process.exit(0);
});

main().catch((error) => {
  console.error("Server error:", error);
  closeDatabase();
  process.exit(1);
});
