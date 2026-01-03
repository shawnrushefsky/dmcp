# DMCP - Claude Context

## What This Is

DMCP is an MCP server that enables AI agents to act as dungeon masters for text-based RPGs. It provides tools for managing game state, characters, locations, items, combat, quests, and narrative events.

## Development Commands

```bash
npm install        # Install dependencies
npm run build      # Compile TypeScript
npm run dev        # Build and run
npm run start      # Run compiled code
```

## Testing Locally

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Architecture

```
src/
├── index.ts           # MCP server entry point, tool definitions
├── http/
│   └── server.ts      # HTTP web UI server (Express)
├── db/
│   ├── connection.ts  # SQLite connection singleton
│   └── schema.ts      # Database schema and migrations
├── tools/             # Tool implementations
│   ├── game.ts        # Game management
│   ├── rules.ts       # Rule system storage
│   ├── world.ts       # Locations and connections
│   ├── character.ts   # Characters (PCs and NPCs)
│   ├── inventory.ts   # Items and ownership
│   ├── quest.ts       # Quest tracking
│   ├── combat.ts      # Combat encounters
│   ├── dice.ts        # Dice rolling and checks
│   └── narrative.ts   # Event logging
└── types/
    └── index.ts       # TypeScript interfaces
```

## HTTP Web UI

DMCP includes a built-in HTTP server that runs alongside the MCP server. This provides a web-based interface for viewing game content.

### Configuration

- **Default Port**: 3456
- **Environment Variable**: `DMCP_HTTP_PORT` to change the port

### Available Routes

**HTML Pages:**
- `/` - Home page with list of all games
- `/games/:gameId` - Game overview with characters, locations, quests
- `/games/:gameId/map` - ASCII world map view
- `/games/:gameId/images` - Image gallery
- `/games/:gameId/history` - Narrative event history
- `/characters/:characterId` - Character sheet with stats, inventory, images
- `/locations/:locationId` - Location details with exits, characters, items
- `/quests/:questId` - Quest objectives and progress
- `/images/:imageId` - Full image view with metadata
- `/images/:imageId/file` - Raw image file (supports resize: `?width=200&height=200`)

**JSON API:**
- `GET /api/games` - List all games
- `GET /api/games/:gameId` - Full game state (characters, locations, quests)
- `GET /api/games/:gameId/map` - Map data structure
- `GET /api/characters/:characterId` - Character data
- `GET /api/characters/:characterId/sheet` - Character sheet with ASCII art
- `GET /api/locations/:locationId` - Location data

## Key Design Decisions

1. **Dynamic Rules** - Rules are stored as JSON, designed by the DM agent at game start
2. **Voice Descriptions** - NPCs can have voice metadata for TTS integration
3. **Image Generation** - Entities store structured visual descriptions adaptable to any image generator
4. **Player Delegation** - Players can delegate game decisions to the DM with "you decide"

## Database

SQLite database at `data/games.db`. Schema auto-initializes and migrates on startup.

## Adding New Tools

1. Add tool implementation in appropriate `src/tools/*.ts` file
2. Add MCP tool definition in `src/index.ts` with Zod schema
3. Run `npm run build` to verify

## DM Agent Best Practices

### Visual Storytelling

DM agents should proactively create visualizations to enhance the experience. Use the game data available through `list_locations`, `get_character`, etc. to generate:

- **Maps** - ASCII or text-based maps showing location connections
- **Character portraits** - Simple ASCII faces or silhouettes for important NPCs
- **Items** - ASCII drawings of weapons, artifacts, treasure
- **Scene illustrations** - Atmospheric art for key moments (tavern interior, dungeon entrance, etc.)
- **Combat layouts** - Tactical grids showing positions
- **UI elements** - Health bars, inventory displays, quest trackers

Visual content creates anchors that make the game more immersive and memorable. The agent has flexibility to render data however is most appropriate for the situation.
