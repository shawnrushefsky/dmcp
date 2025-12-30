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
├── db/
│   ├── connection.ts  # SQLite connection singleton
│   └── schema.ts      # Database schema and migrations
├── tools/             # Tool implementations
│   ├── session.ts     # Game session management
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

## Key Design Decisions

1. **Dynamic Rules** - Rules are stored as JSON, designed by the DM agent at session start
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

### Visual Storytelling with ASCII Art

When image generation tools are not available, DM agents should proactively use ASCII art to enhance the experience:

- **Maps** - Use `render_map` tool regularly, especially after location changes
- **Character portraits** - Simple ASCII faces or silhouettes for important NPCs
- **Items** - ASCII drawings of weapons, artifacts, treasure
- **Scene illustrations** - Atmospheric art for key moments (tavern interior, dungeon entrance, etc.)
- **Combat layouts** - Tactical grids showing positions
- **UI elements** - Health bars, inventory displays, quest trackers

ASCII art creates visual anchors that make the game more immersive and memorable. Use it liberally - players appreciate the effort even with simple art.
