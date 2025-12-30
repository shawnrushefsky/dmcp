# DMCP - Dungeon Master MCP Service

An MCP (Model Context Protocol) server that enables AI agents to act as dynamic dungeon masters for text-based RPGs. Supports any setting or style with dynamically generated rule systems.

## Features

- **Dynamic Rule Systems** - Agent designs rules appropriate to the setting (fantasy, sci-fi, horror, etc.)
- **Full Game State Management** - Sessions, characters, locations, items, quests, combat
- **Voice Descriptions** - NPC voice characteristics for TTS/voice mode integration
- **Image Generation Metadata** - Structured visual descriptions for characters, locations, and items adaptable to any image generation tool (DALL-E, SDXL, ComfyUI, Midjourney, Flux)
- **Player Choice System** - Structured choices with multi-select and free-form input
- **Narrative Logging** - Event history for story continuity
- **Dice & Checks** - Flexible dice rolling and skill resolution

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
        "-v", "dmcp-data:/app/data",
        "ghcr.io/shawnrushefsky/dmcp:latest"
      ]
    }
  }
}
```

The `-v dmcp-data:/app/data` flag persists game data across container restarts.

---

### Testing with MCP Inspector

To test the server interactively:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Available Tools (51 total)

### Session Management
| Tool | Description |
|------|-------------|
| `get_game_menu` | **Call first** - returns existing games or starts new |
| `create_session` | Start a new game with setting/style |
| `load_session` | Resume an existing game |
| `list_sessions` | Show all saved games |
| `get_session_state` | Full game state overview |
| `delete_session` | Remove a saved game |

### Game Setup Interview
| Tool | Description |
|------|-------------|
| `get_interview_template` | Get comprehensive game setup questionnaire |
| `save_game_preferences` | Store player's game preferences |
| `get_game_preferences` | Retrieve saved preferences |

### Rules System
| Tool | Description |
|------|-------------|
| `set_rules` | Store agent-designed rule system |
| `get_rules` | Retrieve current rules |
| `update_rules` | Modify rules mid-game |

### World Management
| Tool | Description |
|------|-------------|
| `create_location` | Add a new location |
| `get_location` | Get location details |
| `update_location` | Modify a location |
| `list_locations` | All locations in session |
| `connect_locations` | Create paths between locations |

### Character Management
| Tool | Description |
|------|-------------|
| `create_character` | New PC or NPC (with optional voice) |
| `get_character` | Character details |
| `update_character` | Modify character |
| `list_characters` | Filter by player/NPC/location |
| `move_character` | Change location |
| `apply_damage` | Deal damage |
| `heal_character` | Restore health |
| `add_condition` | Apply status effect |
| `remove_condition` | Remove status effect |

### Dice & Checks
| Tool | Description |
|------|-------------|
| `roll` | Roll dice (e.g., "2d6+3") |
| `check` | Skill/ability check |
| `contest` | Opposed check between characters |

### Combat
| Tool | Description |
|------|-------------|
| `start_combat` | Initialize encounter |
| `get_combat` | Combat state |
| `get_active_combat` | Current combat in session |
| `next_turn` | Advance turn |
| `add_combat_log` | Log combat action |
| `remove_combatant` | Remove from combat |
| `end_combat` | Resolve combat |

### Inventory
| Tool | Description |
|------|-------------|
| `create_item` | Create new item |
| `get_item` | Item details |
| `update_item` | Modify item |
| `delete_item` | Remove item |
| `transfer_item` | Move between owners |
| `get_inventory` | List items |

### Quests
| Tool | Description |
|------|-------------|
| `create_quest` | New quest with objectives |
| `get_quest` | Quest details |
| `update_quest` | Modify quest |
| `complete_objective` | Mark objective done |
| `add_objective` | Add new objective |
| `list_quests` | Filter by status |

### Narrative
| Tool | Description |
|------|-------------|
| `log_event` | Record story event |
| `get_history` | Recent events |
| `get_summary` | Story summary |
| `get_export_styles` | List available narrative styles |
| `export_story` | Export game overview with chapter summaries |
| `get_chapter_for_export` | Get single chapter for subagent writing |

### Player Interaction
| Tool | Description |
|------|-------------|
| `present_choices` | Show choices with multi-select & free-form |
| `record_choice` | Log player's decision |

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

## Data Storage

Game data is stored in SQLite at `data/games.db` (created automatically). Each session is isolated with its own rules and state.

## License

[MIT](LICENSE)
