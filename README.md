# DMCP - Dungeon Master MCP Service

An MCP (Model Context Protocol) server that enables AI agents to act as dynamic dungeon masters for text-based RPGs. Supports any setting or style with dynamically generated rule systems.

- [DMCP - Dungeon Master MCP Service](#dmcp---dungeon-master-mcp-service)
  - [Features](#features)
  - [Installation](#installation)
    - [From Source](#from-source)
    - [Docker](#docker)
  - [Setup by Platform](#setup-by-platform)
    - [Claude Desktop](#claude-desktop)
    - [Claude Code (CLI)](#claude-code-cli)
    - [ChatGPT Desktop](#chatgpt-desktop)
    - [Cursor](#cursor)
    - [Windsurf](#windsurf)
    - [Cline (VS Code Extension)](#cline-vs-code-extension)
    - [Generic MCP Client](#generic-mcp-client)
    - [Docker Configuration](#docker-configuration)
    - [Testing with MCP Inspector](#testing-with-mcp-inspector)
    - [HTTP Web UI](#http-web-ui)
    - [AI Self-Configuration Prompt](#ai-self-configuration-prompt)
  - [Available Tools (169 total)](#available-tools-169-total)
    - [Session Management](#session-management-8-tools)
    - [Game Setup Interview](#game-setup-interview-3-tools)
    - [Rules System](#rules-system-3-tools)
    - [World Management](#world-management-5-tools)
    - [Character Management](#character-management-7-tools)
    - [Dice \& Checks](#dice--checks-3-tools)
    - [Combat](#combat-7-tools)
    - [Inventory](#inventory-6-tools)
    - [Quests](#quests-6-tools)
    - [Narrative](#narrative-6-tools)
    - [Player Interaction](#player-interaction-2-tools)
    - [Resources](#resources-8-tools)
    - [Time \& Calendar](#time--calendar-7-tools)
    - [Timers](#timers-7-tools)
    - [Random Tables](#random-tables-8-tools)
    - [Secrets \& Knowledge](#secrets--knowledge-10-tools)
    - [Relationships](#relationships-8-tools)
    - [Tags](#tags-5-tools)
    - [Status Effects](#status-effects-8-tools)
    - [Factions](#factions-8-tools)
    - [Abilities \& Powers](#abilities--powers-9-tools)
    - [Session Notes](#session-notes-10-tools)
    - [Pause \& Resume](#pause--resume-7-tools)
    - [Multi-Agent Collaboration](#multi-agent-collaboration-8-tools)
    - [Image Storage](#image-storage-7-tools)
    - [Display & Theme](#display--theme-10-tools)
  - [MCP Prompts (6 total)](#mcp-prompts-6-total)
  - [Example Usage](#example-usage)
    - [Starting a New Game](#starting-a-new-game)
    - [NPC with Voice](#npc-with-voice)
    - [Player Choices](#player-choices)
    - [Character with Image Generation](#character-with-image-generation)
    - [Story Export Workflow](#story-export-workflow)
    - [Pause \& Resume](#pause--resume)
    - [Multi-Agent Collaboration](#multi-agent-collaboration)
  - [Data Storage](#data-storage)
  - [License](#license)


## Features

- **Dynamic Rule Systems** - Agent designs rules appropriate to the setting (fantasy, sci-fi, horror, etc.)
- **Full Game State Management** - Sessions, characters, locations, items, quests, combat
- **HTTP Web UI** - Built-in web interface for viewing character sheets, maps, images, and game state
- **Voice Descriptions** - NPC voice characteristics for TTS/voice mode integration
- **Image Storage & Generation** - Store images with metadata, serve via HTTP, structured visual descriptions for any image generator
- **Player Choice System** - Structured choices with multi-select and free-form input
- **Narrative Logging** - Event history for story continuity and export
- **Dice & Checks** - Flexible dice rolling and skill resolution
- **Flexible Visualizations** - Agents can render ASCII art, maps, or other visualizations as appropriate
- **Factions & Politics** - Organizations with resources, goals, and relationships
- **Abilities & Powers** - Spells, skills, powers with costs and cooldowns
- **Status Effects** - Buffs, debuffs with duration, stacking, and modifiers
- **Custom Resources** - Track currencies, reputation, sanity, or any numeric value
- **Time & Calendar** - In-game time tracking with scheduled events
- **Random Tables** - Reusable tables for encounters, loot, weather, names
- **Secrets System** - Hidden knowledge that can be revealed to characters
- **Entity Relationships** - Track attitudes, bonds, rivalries between any entities
- **Tagging System** - Universal tags for organizing any game entity
- **Session Notes** - Searchable DM notes with auto-generated recaps
- **Pause & Resume** - Save agent context for seamless game continuation across sessions
- **Multi-Agent Collaboration** - External agents can push updates for DM incorporation
- **MCP Prompts** - Reusable prompt templates for game setup, resume, and save verification

## Installation

### From Source

```bash
git clone https://github.com/shawnrushefsky/dmcp.git
cd dmcp
npm install
npm run build
```

### Docker

Pull the image from GitHub Container Registry:

```bash
docker pull ghcr.io/shawnrushefsky/dmcp:latest
```

Or build locally:

```bash
docker build -t dmcp .
```

## Setup by Platform

### Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "dmcp": {
      "command": "node",
      "args": ["/absolute/path/to/dmcp/dist/index.js"]
    }
  }
}
```

Restart Claude Desktop after saving.

---

### Claude Code (CLI)

**Project-level** (recommended) - Create `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "dmcp": {
      "command": "node",
      "args": ["/absolute/path/to/dmcp/dist/index.js"]
    }
  }
}
```

**User-level** - Add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dmcp": {
      "command": "node",
      "args": ["/absolute/path/to/dmcp/dist/index.js"]
    }
  }
}
```

Start a new Claude Code session to load the server.

**Auto-approve all DMCP tools** (optional) - Add to `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "mcp__dmcp__*"
    ]
  }
}
```

---

### ChatGPT Desktop

ChatGPT desktop app supports MCP servers. Add to your configuration:

**macOS**: `~/.chatgpt/mcp.json`

```json
{
  "servers": {
    "dmcp": {
      "command": "node",
      "args": ["/absolute/path/to/dmcp/dist/index.js"]
    }
  }
}
```

Or use Docker:

```json
{
  "servers": {
    "dmcp": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-p", "3000:3000",
        "-v", "dmcp-data:/app/data",
        "ghcr.io/shawnrushefsky/dmcp:latest"
      ]
    }
  }
}
```

Restart ChatGPT after saving.

---

### Cursor

Add to your Cursor MCP settings (Settings → MCP Servers):

```json
{
  "mcpServers": {
    "dmcp": {
      "command": "node",
      "args": ["/absolute/path/to/dmcp/dist/index.js"]
    }
  }
}
```

---

### Windsurf

Add to `~/.windsurf/config.json`:

```json
{
  "mcpServers": {
    "dmcp": {
      "command": "node",
      "args": ["/absolute/path/to/dmcp/dist/index.js"]
    }
  }
}
```

---

### Cline (VS Code Extension)

Add to Cline's MCP settings in VS Code:

1. Open VS Code Settings
2. Search for "Cline MCP"
3. Add server configuration:

```json
{
  "dmcp": {
    "command": "node",
    "args": ["/absolute/path/to/dmcp/dist/index.js"]
  }
}
```

---

### Generic MCP Client

For any MCP-compatible client, configure:

- **Command**: `node`
- **Arguments**: `["/absolute/path/to/dmcp/dist/index.js"]`
- **Transport**: stdio

---

### Docker Configuration

For Docker-based MCP clients, use the ghcr.io image:

```json
{
  "mcpServers": {
    "dmcp": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-p", "3000:3000",
        "-v", "dmcp-data:/app/data",
        "ghcr.io/shawnrushefsky/dmcp:latest"
      ]
    }
  }
}
```

**Flags:**
- `-p 3000:3000` exposes the HTTP web UI at http://localhost:3000
- `-v dmcp-data:/app/data` persists game data across container restarts

To use a different port, add `-e DMCP_HTTP_PORT=8080` and change `-p 8080:8080`.

---

### Testing with MCP Inspector

To test the server interactively:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

---

### HTTP Web UI

DMCP includes a built-in HTTP server with a Vue.js single-page application for viewing game content. It starts automatically alongside the MCP server.

- **Default URL**: http://localhost:3000
- **Configure Port**: Set `DMCP_HTTP_PORT` environment variable

**Development Mode:**

For hot-reload during development:
```bash
# Terminal 1: Run the MCP server
npm run dev

# Terminal 2: Run Vue dev server with hot-reload
npm run dev:client
```

The Vue dev server proxies API requests to the backend automatically.

**Available Pages:**
- `/` - Home page with all game sessions
- `/sessions/:id` - Session overview with characters, locations, quests
- `/sessions/:id/map` - ASCII world map
- `/sessions/:id/images` - Image gallery
- `/sessions/:id/history` - Narrative event history
- `/characters/:id` - Character sheet with stats, inventory, images
- `/locations/:id` - Location details with exits and NPCs
- `/quests/:id` - Quest objectives and progress
- `/images/:id` - Full image view with metadata
- `/images/:id/file` - Raw image file (supports `?width=200&height=200` resize)

**JSON API:**
- `GET /api/sessions` - List all sessions
- `GET /api/sessions/:id` - Full session state
- `GET /api/sessions/:id/map` - Map data structure
- `GET /api/characters/:id` - Character data
- `GET /api/characters/:id/sheet` - Character sheet with ASCII art
- `GET /api/locations/:id` - Location data
- `GET /api/theme` - Current theme configuration (polled by Vue app)

**Dynamic Theming:**

The DM agent can customize the UI theme in real-time using display tools:
```javascript
// Apply a preset theme globally
apply_theme_preset({ preset: "cyberpunk" })

// Or apply to a specific session
apply_session_theme_preset({ sessionId: "...", preset: "noir" })

// Customize individual elements
set_display_config({ bgColor: "#1a1a2e", accentColor: "#00ff88", appTitle: "Neon Shadows" })

// Auto-apply theme based on game genre
auto_theme_session({ sessionId: "...", genre: "sci-fi" })
```

Available presets: `dark-fantasy`, `cyberpunk`, `cosmic-horror`, `high-fantasy`, `noir`, `steampunk`, `post-apocalyptic`, `pirate`, `western`, `modern`, `superhero`, `sci-fi`

---

### AI Self-Configuration Prompt

Copy and paste this prompt to any MCP-compatible AI assistant to have it guide you through setup:

<details>
<summary>Click to expand the setup prompt</summary>

```
I want to set up DMCP (Dungeon Master MCP) so we can play text-based RPGs together. DMCP is an MCP server that lets you act as a dungeon master with full game state management.

Repository: https://github.com/shawnrushefsky/dmcp
Docker image: ghcr.io/shawnrushefsky/dmcp:latest

Please help me configure this MCP server for my system. Here's what I need you to do:

1. First, determine what AI tool/platform I'm using (Claude Desktop, Claude Code, ChatGPT, Cursor, etc.) and my operating system.

2. Then guide me through the setup:
   - For Docker setup (recommended): Help me verify Docker is installed and configure the MCP server using the Docker image
   - For source setup: Help me clone the repo, run npm install && npm run build, and configure

3. The configuration should use these settings:
   - Docker: command "docker" with args ["run", "-i", "--rm", "-p", "3000:3000", "-v", "dmcp-data:/app/data", "ghcr.io/shawnrushefsky/dmcp:latest"]
   - Source: command "node" with args pointing to the dist/index.js file

4. After configuration, tell me to restart my AI application, then we can start playing!

Configuration file locations:
- Claude Desktop (macOS): ~/Library/Application Support/Claude/claude_desktop_config.json
- Claude Desktop (Windows): %APPDATA%\Claude\claude_desktop_config.json
- Claude Code: .mcp.json in project root or ~/.claude/claude_desktop_config.json
- ChatGPT Desktop: ~/.chatgpt/mcp.json
- Cursor: Settings → MCP Servers
- Windsurf: ~/.windsurf/config.json

Once DMCP is configured, you'll have access to tools for managing game sessions, characters, locations, items, quests, combat, dice rolls, and narrative events. You can run any style of RPG - fantasy, sci-fi, horror, or anything the player wants.
```

</details>

## Available Tools (169 total)

### Session Management (8 tools)
| Tool | Description |
|------|-------------|
| `get_game_menu` | **Call first** - returns existing games or starts new |
| `create_session` | Start a new game with setting/style |
| `load_session` | Resume an existing game |
| `list_sessions` | Show all saved games |
| `get_session_state` | Full game state overview |
| `update_session` | Rename or update session name/setting/style |
| `set_session_title_image` | Set title image for session (displayed in web UI) |
| `delete_session` | Remove a saved game |

### Game Setup Interview (3 tools)
| Tool | Description |
|------|-------------|
| `get_interview_template` | Get comprehensive game setup questionnaire |
| `save_game_preferences` | Store player's game preferences |
| `get_game_preferences` | Retrieve saved preferences |

### Rules System (3 tools)
| Tool | Description |
|------|-------------|
| `set_rules` | Store agent-designed rule system |
| `get_rules` | Retrieve current rules |
| `update_rules` | Modify rules mid-game |

### World Management (5 tools)
| Tool | Description |
|------|-------------|
| `create_location` | Add a new location |
| `get_location` | Get location details |
| `update_location` | Modify a location |
| `list_locations` | All locations in session |
| `connect_locations` | Create paths between locations |

### Character Management (7 tools)
| Tool | Description |
|------|-------------|
| `create_character` | New PC or NPC (with optional voice) |
| `get_character` | Character details |
| `update_character` | Modify character |
| `list_characters` | Filter by player/NPC/location |
| `move_character` | Change location |
| `apply_damage` | Deal damage |
| `heal_character` | Restore health |
| `modify_conditions` | Add and/or remove conditions in one call |

### Dice & Checks (3 tools)
| Tool | Description |
|------|-------------|
| `roll` | Roll dice (e.g., "2d6+3") |
| `check` | Skill/ability check |
| `contest` | Opposed check between characters |

### Combat (7 tools)
| Tool | Description |
|------|-------------|
| `start_combat` | Initialize encounter |
| `get_combat` | Combat state |
| `get_active_combat` | Current combat in session |
| `next_turn` | Advance turn |
| `add_combat_log` | Log combat action |
| `remove_combatant` | Remove from combat |
| `end_combat` | Resolve combat |

### Inventory (6 tools)
| Tool | Description |
|------|-------------|
| `create_item` | Create new item |
| `get_item` | Item details |
| `update_item` | Modify item |
| `delete_item` | Remove item |
| `transfer_item` | Move between owners |
| `get_inventory` | List items |

### Quests (6 tools)
| Tool | Description |
|------|-------------|
| `create_quest` | New quest with objectives |
| `get_quest` | Quest details |
| `update_quest` | Modify quest |
| `complete_objective` | Mark objective done |
| `add_objective` | Add new objective |
| `list_quests` | Filter by status |

### Narrative (6 tools)
| Tool | Description |
|------|-------------|
| `log_event` | Record story event |
| `get_history` | Recent events |
| `get_summary` | Story summary |
| `get_export_styles` | List available narrative styles |
| `export_story` | Export game overview with chapter summaries |
| `get_chapter_for_export` | Get single chapter for subagent writing |

### Player Interaction (2 tools)
| Tool | Description |
|------|-------------|
| `present_choices` | Show choices with multi-select & free-form |
| `record_choice` | Log player's decision |

### Resources (8 tools)
| Tool | Description |
|------|-------------|
| `create_resource` | Create custom resource (currency, reputation, etc.) |
| `get_resource` | Get resource details |
| `update_resource` | Update resource metadata |
| `delete_resource` | Remove a resource |
| `list_resources` | List resources with filters |
| `modify_resource` | Add/subtract from resource value |
| `set_resource` | Set resource to specific value |
| `get_resource_history` | Get change history |

### Time & Calendar (7 tools)
| Tool | Description |
|------|-------------|
| `set_calendar` | Configure calendar system (months, days, etc.) |
| `get_time` | Get current in-game time |
| `set_time` | Set in-game time |
| `advance_time` | Advance time, trigger scheduled events |
| `schedule_event` | Schedule event at specific time |
| `list_scheduled_events` | List upcoming events |
| `cancel_event` | Cancel scheduled event |

### Timers (7 tools)
| Tool | Description |
|------|-------------|
| `create_timer` | Create countdown, stopwatch, or segmented clock |
| `get_timer` | Get timer details |
| `update_timer` | Update timer settings |
| `delete_timer` | Remove timer |
| `list_timers` | List active timers |
| `tick_timer` | Advance/reduce timer |
| `reset_timer` | Reset to initial state |

### Random Tables (8 tools)
| Tool | Description |
|------|-------------|
| `create_random_table` | Create table for encounters, loot, etc. |
| `get_random_table` | Get table by ID |
| `update_random_table` | Update table |
| `delete_random_table` | Remove table |
| `list_random_tables` | List tables in session |
| `roll_on_table` | Roll and get result |
| `add_table_entry` | Add entry to table |
| `remove_table_entry` | Remove entry from table |

### Secrets & Knowledge (10 tools)
| Tool | Description |
|------|-------------|
| `create_secret` | Create a revealable secret |
| `get_secret` | Get secret (DM view) |
| `update_secret` | Update secret details |
| `delete_secret` | Remove secret |
| `list_secrets` | List with filters |
| `reveal_secret` | Reveal to specific characters |
| `make_secret_public` | Make visible to all |
| `add_clue` | Add clue to secret |
| `get_character_knowledge` | All secrets known by character |
| `check_knows_secret` | Check if character knows secret |

### Relationships (8 tools)
| Tool | Description |
|------|-------------|
| `create_relationship` | Create relationship between entities |
| `get_relationship` | Get relationship by ID |
| `get_relationship_between` | Get relationship between two entities |
| `update_relationship` | Update relationship |
| `modify_relationship` | Adjust value with history |
| `delete_relationship` | Remove relationship |
| `list_relationships` | List with filters |
| `get_relationship_history` | Get change history |

### Tags (5 tools)
| Tool | Description |
|------|-------------|
| `modify_tags` | Add and/or remove tags in one call |
| `list_tags` | List all unique tags with counts |
| `get_entity_tags` | Get tags for specific entity |
| `find_by_tag` | Find entities by tag |
| `rename_tag` | Rename tag across all entities |

### Status Effects (8 tools)
| Tool | Description |
|------|-------------|
| `apply_status_effect` | Apply effect with stacking |
| `get_status_effect` | Get effect by ID |
| `remove_status_effect` | Remove specific effect |
| `list_status_effects` | List effects on character |
| `tick_status_durations` | Reduce durations (end of round) |
| `modify_effect_stacks` | Add/remove stacks |
| `clear_status_effects` | Remove all effects |
| `get_effective_modifiers` | Sum all stat modifiers |

### Factions (8 tools)
| Tool | Description |
|------|-------------|
| `create_faction` | Create faction/organization |
| `get_faction` | Get faction by ID |
| `update_faction` | Update faction details |
| `delete_faction` | Remove faction |
| `list_factions` | List factions |
| `update_faction_resource` | Update resource (delta or set mode) |
| `modify_faction_goals` | Add and/or complete goals in one call |
| `modify_faction_traits` | Add and/or remove traits in one call |

### Abilities & Powers (9 tools)
| Tool | Description |
|------|-------------|
| `create_ability` | Create ability template or character ability |
| `get_ability` | Get ability by ID |
| `update_ability` | Update ability |
| `delete_ability` | Remove ability |
| `list_abilities` | List with filters |
| `learn_ability` | Copy template to character |
| `use_ability` | Use ability (checks cooldown) |
| `tick_ability_cooldowns` | Reduce cooldowns (end of round) |
| `check_ability_requirements` | Check if character meets requirements |

### Session Notes (10 tools)
| Tool | Description |
|------|-------------|
| `create_note` | Create session note |
| `get_note` | Get note by ID |
| `update_note` | Update note content |
| `delete_note` | Remove note |
| `list_notes` | List with filters |
| `search_notes` | Full-text search |
| `pin_note` | Toggle pinned status |
| `add_note_tag` | Add tag to note |
| `remove_note_tag` | Remove tag from note |
| `generate_recap` | Auto-generate session recap |

### Pause & Resume (7 tools)
| Tool | Description |
|------|-------------|
| `prepare_pause` | Get checklist and current state before pausing |
| `save_pause_state` | Save DM context (scene, plans, NPC attitudes, threads) |
| `get_pause_state` | Retrieve saved pause state |
| `get_resume_context` | Get complete resume briefing with game state |
| `save_context_snapshot` | Lightweight incremental context save during play |
| `check_context_freshness` | Check if context needs saving |
| `clear_pause_state` | Clear pause state after resuming |

### Multi-Agent Collaboration (8 tools)
| Tool | Description |
|------|-------------|
| `push_external_update` | External agent pushes lore/research/worldbuilding |
| `get_pending_updates` | Check for updates from external agents |
| `acknowledge_update` | Mark update as seen |
| `apply_update` | Mark update as incorporated into narrative |
| `reject_update` | Reject update as not appropriate |
| `list_external_updates` | List all updates with status filter |
| `get_external_update` | Get specific update by ID |
| `delete_external_update` | Delete an update |

### Image Storage (7 tools)
| Tool | Description |
|------|-------------|
| `store_image` | Store image from base64, URL, or file path |
| `get_image` | Get image metadata |
| `get_image_data` | Get image with base64 data (supports resize/format conversion) |
| `list_entity_images` | List all images for an entity |
| `delete_image` | Delete stored image |
| `set_primary_image` | Set image as primary for entity |
| `update_image_metadata` | Update image label/description |

### Display & Theme (10 tools)
| Tool | Description |
|------|-------------|
| `get_display_config` | Get current theme/display configuration |
| `set_display_config` | Set any display configuration options |
| `reset_display_config` | Reset to default theme |
| `apply_theme_preset` | Apply a preset theme (dark-fantasy, cyberpunk, cosmic-horror, etc.) |
| `list_theme_presets` | List available theme presets |
| `get_session_theme` | Get session-specific theme config |
| `set_session_theme` | Set session-specific theme |
| `apply_session_theme_preset` | Apply preset to specific session |
| `reset_session_theme` | Revert session to global theme |
| `auto_theme_session` | Auto-apply theme based on genre |

## MCP Prompts (6 total)

Reusable prompt templates accessible via MCP `prompts/get`:

| Prompt | Description |
|--------|-------------|
| `dm-persona` | Initialize DM with full game context and player preferences |
| `session-recap` | Generate narrative summary of game so far |
| `new-game-setup` | Interview template for creating a new game |
| `continue-game` | Resume paused game with full context restoration |
| `character-voice` | Get NPC voice characteristics for roleplay |
| `save-game-checklist` | Comprehensive pre-save verification checklist |

## Example Usage

### Starting a New Game

```
User: Let's play a cyberpunk noir detective game

DM Agent:
1. create_session({name: "Neon Shadows", setting: "cyberpunk noir", style: "gritty"})
2. set_rules({...cyberpunk-appropriate rules...})
3. create_location({name: "Your Office", description: "Rain streaks down the window..."})
4. create_character({name: "Detective", isPlayer: true, attributes: {...}})
```

### NPC with Voice

```javascript
create_character({
  name: "Mama Chen",
  isPlayer: false,
  voice: {
    pitch: "high",
    speed: "fast",
    tone: "raspy",
    accent: "Cantonese-influenced",
    quirks: ["ends sentences with 'yeah?'", "laughs before bad news"],
    description: "Sounds like 40 years of cigarettes and secrets"
  }
})
```

### Player Choices

```javascript
present_choices({
  prompt: "The corpo goon blocks your path. What's your play?",
  choices: [
    {id: "talk", label: "Talk your way past", description: "Use your silver tongue"},
    {id: "bribe", label: "Slip him some creds", description: "Everyone has a price"},
    {id: "fight", label: "Go loud", description: "Violence is always an option"},
    {id: "sneak", label: "Find another way", description: "There's always a back door"}
  ],
  allowFreeform: true,
  context: {urgency: "medium"}
})
```

### Character with Image Generation

```javascript
create_character({
  name: "Razor",
  isPlayer: false,
  imageGen: {
    subject: {
      type: "character",
      primaryDescription: "A cyberpunk street samurai with chrome implants",
      physicalTraits: {
        gender: "female",
        bodyType: "athletic",
        hairColor: "neon pink",
        eyeColor: "chrome optics with red glow",
        distinguishingMarks: ["chrome arm", "facial tattoos"]
      },
      attire: {
        description: "armored leather jacket with holographic accents",
        colors: ["black", "neon blue"],
        accessories: ["monofilament blade sheath"]
      },
      pose: "leaning against wall",
      expression: "calculating smirk"
    },
    style: {
      artisticStyle: "digital painting",
      genre: "cyberpunk",
      mood: "gritty",
      colorScheme: "neon-noir"
    },
    composition: {
      framing: "portrait",
      background: "rainy neon cityscape"
    }
  }
})
```

The `imageGen` field can be attached to characters, locations, and items. The structured format can be adapted to any image generation tool - the DM agent can generate tool-specific prompts as needed.

### Story Export Workflow

Export your game as a narrative book using subagents for each chapter:

```javascript
// 1. Get available styles
get_export_styles()
// Returns: literary-fiction, pulp-adventure, epic-fantasy, noir, horror, etc.

// 2. Player chooses style, get the export overview
export_story({ sessionId: "...", style: "epic-fantasy" })
// Returns: session info, characters, locations, chapter summaries, workflow instructions

// 3. For each chapter, fetch full data and spawn a subagent
get_chapter_for_export({ sessionId: "...", chapterNumber: 1, style: "epic-fantasy" })
// Returns: events, context, and a ready-to-use subagentPrompt

// 4. Each subagent writes its chapter as narrative prose
// 5. Combine chapters into final book
```

### Pause & Resume

Save context before ending a session for seamless continuation:

```javascript
// Before pausing - get checklist of what to save
prepare_pause({ sessionId: "..." })

// Save your DM context
save_pause_state({
  sessionId: "...",
  currentScene: "The party is in the merchant's basement after discovering the hidden door",
  immediateSituation: "Kira has her hand on the trapdoor, asking if they should descend",
  sceneAtmosphere: "Tense, dusty, dim light from above",
  pendingPlayerAction: "Deciding whether to open trapdoor or search for traps",
  dmShortTermPlans: "If they descend, ghost encounter triggers",
  dmLongTermPlans: "Building toward cult revelation in Chapter 3",
  activeThreads: [{
    name: "Missing Merchant",
    status: "active",
    urgency: "high",
    description: "Finding what happened to Old Chen"
  }],
  npcAttitudes: { "guard_captain_id": "suspicious after tavern incident" },
  playerApparentGoals: "Focused on finding the merchant, ignoring side quests"
})

// On resume - get everything needed to continue
get_resume_context({ sessionId: "..." })
// Returns formatted briefing + full game state
```

### Multi-Agent Collaboration

External agents can push updates for the DM to incorporate:

```javascript
// Research agent pushes lore discovery
push_external_update({
  sessionId: "...",
  sourceAgent: "lore-researcher",
  sourceDescription: "Deep worldbuilding research agent",
  updateType: "lore",
  title: "The Merchant Guild's Secret History",
  content: "The Merchant Guild was founded 200 years ago as a front for...",
  priority: "normal",
  targetEntityType: "faction",
  targetEntityId: "merchant_guild_id"
})

// DM checks for pending updates periodically
get_pending_updates({ sessionId: "..." })
// Returns prioritized list of pending updates

// DM incorporates the update into narrative
apply_update({
  updateId: "...",
  dmNotes: "Revealed through ancient tome in library scene"
})
```

## Data Storage

Game data is stored in SQLite at `data/games.db` (created automatically). Each session is isolated with its own rules and state.

## License

[MIT](LICENSE)
