import express, { Request, Response, NextFunction } from "express";
import { join } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Import tool functions
import { listGames, loadGame, listImageGenerationPresets, getImageGenerationPreset, getDefaultImagePreset } from "../tools/game.js";
import {
  getCharacter,
  listCharacters,
  renderCharacterSheet,
} from "../tools/character.js";
import { getLocation, listLocations, renderMap } from "../tools/world.js";
import {
  getImage,
  getImageData,
  listEntityImages,
  listGameImages,
} from "../tools/images.js";
import { getInventory, getItem, listGameItems } from "../tools/inventory.js";
import { listQuests, getQuest } from "../tools/quest.js";
import { getHistory } from "../tools/narrative.js";
import {
  getDisplayConfig,
  getGameDisplayConfig,
  hasGameTheme,
} from "../tools/display.js";
import { listFactions, getFaction } from "../tools/faction.js";
import { listResources, getResource } from "../tools/resource.js";
import { listNotes, getNote } from "../tools/notes.js";
import { listRelationships } from "../tools/relationship.js";
import { listAbilities, getAbility } from "../tools/ability.js";
import { listTimers, getTimer } from "../tools/timers.js";
import { listSecrets } from "../tools/secrets.js";
import { getTime, listScheduledEvents } from "../tools/time.js";
import { getActiveCombat } from "../tools/combat.js";
import { gameEvents } from "../events/emitter.js";
import type { Character, Location, Faction, Quest, Resource, Note, Item } from "../types/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to Vue app build
const CLIENT_DIST = join(__dirname, "..", "..", "client", "dist");

export function createHttpServer(port: number = 3456): express.Application {
  const app = express();

  app.use(express.json());

  // ============================================================================
  // API ROUTES (JSON)
  // ============================================================================

  // Theme/Display config endpoint (global)
  app.get("/api/theme", (_req: Request, res: Response) => {
    res.json(getDisplayConfig());
  });

  // Per-game theme endpoint
  app.get("/api/games/:gameId/theme", (req: Request, res: Response) => {
    res.json(getGameDisplayConfig(req.params.gameId));
  });

  // Image generation presets
  app.get("/api/games/:gameId/image-presets", (req: Request, res: Response) => {
    const presets = listImageGenerationPresets(req.params.gameId);
    const defaultPreset = getDefaultImagePreset(req.params.gameId);
    res.json({
      presets,
      defaultPresetId: defaultPreset?.id || null,
    });
  });

  app.get("/api/games/:gameId/image-presets/:presetId", (req: Request, res: Response) => {
    const preset = getImageGenerationPreset(req.params.gameId, req.params.presetId);
    if (!preset) {
      res.status(404).json({ error: "Preset not found" });
      return;
    }
    res.json(preset);
  });

  // Games - include theme data for each game
  app.get("/api/games", (_req: Request, res: Response) => {
    const games = listGames();
    const gamesWithThemes = games.map(game => ({
      ...game,
      theme: hasGameTheme(game.id) ? getGameDisplayConfig(game.id) : null,
    }));
    res.json(gamesWithThemes);
  });

  app.get("/api/games/:gameId", (req: Request, res: Response) => {
    const gameId = req.params.gameId;
    const game = loadGame(gameId);
    if (!game) {
      res.status(404).json({ error: "Game not found" });
      return;
    }
    const characters = listCharacters(gameId);
    const locations = listLocations(gameId);
    const quests = listQuests(gameId);

    // Add primary image IDs to characters and locations
    const charactersWithImages = characters.map((c: Character) => {
      const result = listEntityImages(c.id, "character");
      const primary = result.primaryImage || result.images[0];
      return { ...c, primaryImageId: primary?.id || null };
    });

    const locationsWithImages = locations.map((l: Location) => {
      const result = listEntityImages(l.id, "location");
      const primary = result.primaryImage || result.images[0];
      return { ...l, primaryImageId: primary?.id || null };
    });

    // Get counts for all entity types (for conditional UI display)
    const factions = listFactions(gameId);

    // Add primary image IDs to factions
    const factionsWithImages = factions.map((f: Faction) => {
      const result = listEntityImages(f.id, "faction");
      const primary = result.primaryImage || result.images[0];
      return { ...f, primaryImageId: primary?.id || null };
    });

    // Add primary image IDs to quests
    const questsWithImages = quests.map((q: Quest) => {
      const result = listEntityImages(q.id, "quest");
      const primary = result.primaryImage || result.images[0];
      return { ...q, primaryImageId: primary?.id || null };
    });

    const resources = listResources(gameId);
    // Add primary image IDs to resources
    const resourcesWithImages = resources.map((r: Resource) => {
      const result = listEntityImages(r.id, "resource");
      const primary = result.primaryImage || result.images[0];
      return { ...r, primaryImageId: primary?.id || null };
    });

    const notes = listNotes(gameId);
    // Add primary image IDs to notes
    const notesWithImages = notes.map((n: Note) => {
      const result = listEntityImages(n.id, "note");
      const primary = result.primaryImage || result.images[0];
      return { ...n, primaryImageId: primary?.id || null };
    });
    const relationships = listRelationships(gameId);
    const abilities = listAbilities(gameId);
    const timers = listTimers(gameId);
    const secrets = listSecrets(gameId);
    const images = listGameImages(gameId);
    const items = listGameItems(gameId);
    // Add primary image IDs to items
    const itemsWithImages = items.map((i: Item) => {
      const result = listEntityImages(i.id, "item");
      const primary = result.primaryImage || result.images[0];
      return { ...i, primaryImageId: primary?.id || null };
    });
    const events = getHistory(gameId, { limit: 1 });
    const activeCombat = getActiveCombat(gameId);
    const gameTime = getTime(gameId);

    res.json({
      game,
      characters: charactersWithImages,
      locations: locationsWithImages,
      quests: questsWithImages,
      // Include full data for populated entity types
      factions: factionsWithImages,
      resources: resourcesWithImages,
      notes: notesWithImages,
      items: itemsWithImages,
      // Include counts for UI tab visibility
      counts: {
        characters: characters.length,
        locations: locations.length,
        quests: quests.length,
        factions: factions.length,
        resources: resources.length,
        notes: notes.length,
        relationships: relationships.length,
        abilities: abilities.length,
        timers: timers.length,
        secrets: secrets.length,
        images: images.length,
        items: items.length,
        events: events.length > 0 ? 1 : 0, // Just indicate if there's history
      },
      // Include active state info
      activeCombat: activeCombat || null,
      gameTime: gameTime || null,
    });
  });

  app.get("/api/games/:gameId/map", (req: Request, res: Response) => {
    const characters = listCharacters(req.params.gameId);
    const playerChar = characters.find((c: Character) => c.isPlayer);
    const mapData = renderMap(req.params.gameId, {
      playerLocationId: playerChar?.locationId || undefined,
    });
    if (!mapData) {
      res.status(404).json({ error: "No map data" });
      return;
    }
    res.json(mapData);
  });

  app.get("/api/games/:gameId/history", (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const history = getHistory(req.params.gameId, { limit });
    res.json(history);
  });

  app.get("/api/games/:gameId/images", (req: Request, res: Response) => {
    const images = listGameImages(req.params.gameId);
    res.json(images);
  });

  app.get(
    "/api/games/:gameId/characters",
    (req: Request, res: Response) => {
      const locationId = req.query.locationId as string | undefined;
      const characters = listCharacters(req.params.gameId, { locationId });
      res.json(characters);
    }
  );

  // Characters
  app.get("/api/characters/:characterId", (req: Request, res: Response) => {
    const char = getCharacter(req.params.characterId);
    if (!char) {
      res.status(404).json({ error: "Character not found" });
      return;
    }
    res.json(char);
  });

  app.get(
    "/api/characters/:characterId/sheet",
    (req: Request, res: Response) => {
      const sheet = renderCharacterSheet(req.params.characterId);
      if (!sheet) {
        res.status(404).json({ error: "Character not found" });
        return;
      }
      res.json(sheet);
    }
  );

  // Locations
  app.get("/api/locations/:locationId", (req: Request, res: Response) => {
    const loc = getLocation(req.params.locationId);
    if (!loc) {
      res.status(404).json({ error: "Location not found" });
      return;
    }
    res.json(loc);
  });

  // Quests
  app.get("/api/quests/:questId", (req: Request, res: Response) => {
    const quest = getQuest(req.params.questId);
    if (!quest) {
      res.status(404).json({ error: "Quest not found" });
      return;
    }
    res.json(quest);
  });

  // Factions
  app.get("/api/factions/:factionId", (req: Request, res: Response) => {
    const faction = getFaction(req.params.factionId);
    if (!faction) {
      res.status(404).json({ error: "Faction not found" });
      return;
    }
    res.json(faction);
  });

  // Resources
  app.get("/api/resources/:resourceId", (req: Request, res: Response) => {
    const resource = getResource(req.params.resourceId);
    if (!resource) {
      res.status(404).json({ error: "Resource not found" });
      return;
    }
    res.json(resource);
  });

  // Notes
  app.get("/api/notes/:noteId", (req: Request, res: Response) => {
    const note = getNote(req.params.noteId);
    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }
    res.json(note);
  });

  // Abilities
  app.get("/api/abilities/:abilityId", (req: Request, res: Response) => {
    const ability = getAbility(req.params.abilityId);
    if (!ability) {
      res.status(404).json({ error: "Ability not found" });
      return;
    }
    res.json(ability);
  });

  // Timers
  app.get("/api/timers/:timerId", (req: Request, res: Response) => {
    const timer = getTimer(req.params.timerId);
    if (!timer) {
      res.status(404).json({ error: "Timer not found" });
      return;
    }
    res.json(timer);
  });

  // Relationships (for graph visualization)
  app.get("/api/games/:gameId/relationships", (req: Request, res: Response) => {
    const { gameId } = req.params;
    const relationships = listRelationships(gameId);
    const characters = listCharacters(gameId);
    const factions = listFactions(gameId);

    // Build lookup maps for entity names and images
    const entityInfo: Record<string, { name: string; type: string; imageId: string | null }> = {};
    characters.forEach((c: Character) => {
      const result = listEntityImages(c.id, "character");
      const primary = result.primaryImage || result.images[0];
      entityInfo[c.id] = { name: c.name, type: "character", imageId: primary?.id || null };
    });
    factions.forEach((f: Faction) => {
      const result = listEntityImages(f.id, "faction");
      const primary = result.primaryImage || result.images[0];
      entityInfo[f.id] = { name: f.name, type: "faction", imageId: primary?.id || null };
    });

    // Enrich relationships with entity names and images
    const enrichedRelationships = relationships.map((r) => ({
      ...r,
      sourceName: entityInfo[r.sourceId]?.name || r.sourceId,
      targetName: entityInfo[r.targetId]?.name || r.targetId,
      sourceImageId: entityInfo[r.sourceId]?.imageId || null,
      targetImageId: entityInfo[r.targetId]?.imageId || null,
    }));

    res.json(enrichedRelationships);
  });

  // Images
  app.get("/api/images/:imageId", (req: Request, res: Response) => {
    const image = getImage(req.params.imageId);
    if (!image) {
      res.status(404).json({ error: "Image not found" });
      return;
    }
    res.json(image);
  });

  // Entity images
  app.get(
    "/api/entities/:entityType/:entityId/images",
    (req: Request, res: Response) => {
      const images = listEntityImages(
        req.params.entityId,
        req.params.entityType as "character" | "location" | "item" | "scene" | "faction"
      );
      res.json(images);
    }
  );

  // Items
  app.get("/api/items/:itemId", (req: Request, res: Response) => {
    const item = getItem(req.params.itemId);
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json(item);
  });

  // Inventory
  app.get(
    "/api/inventory/:ownerType/:ownerId",
    (req: Request, res: Response) => {
      const items = getInventory(
        req.params.ownerId,
        req.params.ownerType as "character" | "location"
      );
      res.json(items);
    }
  );

  // Search within a game - full-text search across all entity types
  app.get("/api/games/:gameId/search", (req: Request, res: Response) => {
    const { gameId } = req.params;
    const query = (req.query.q as string || "").toLowerCase().trim();

    if (!query || query.length < 2) {
      res.json({ characters: [], locations: [], quests: [], items: [], factions: [], notes: [], events: [] });
      return;
    }

    const game = loadGame(gameId);
    if (!game) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    // Helper to extract a snippet around the match
    const getSnippet = (text: string, maxLen: number = 80): string => {
      if (!text) return "";
      const lowerText = text.toLowerCase();
      const idx = lowerText.indexOf(query);
      if (idx === -1) return text.slice(0, maxLen) + (text.length > maxLen ? "..." : "");

      const start = Math.max(0, idx - 20);
      const end = Math.min(text.length, idx + query.length + 60);
      let snippet = text.slice(start, end);
      if (start > 0) snippet = "..." + snippet;
      if (end < text.length) snippet = snippet + "...";
      return snippet;
    };

    // Helper to check if text matches query
    const matches = (text: string | undefined | null): boolean => {
      return !!text && text.toLowerCase().includes(query);
    };

    const characters = listCharacters(gameId);
    const locations = listLocations(gameId);
    const quests = listQuests(gameId);
    const items = listGameItems(gameId);
    const factions = listFactions(gameId);
    const notes = listNotes(gameId);
    const events = getHistory(gameId, { limit: 100 }); // Search recent events

    // Search characters by name and notes
    const matchingCharacters = characters
      .filter((c: Character) => matches(c.name) || matches(c.notes))
      .slice(0, 5)
      .map((c: Character) => {
        const result = listEntityImages(c.id, "character");
        const primary = result.primaryImage || result.images[0];
        const matchField = matches(c.name) ? "name" : "notes";
        return {
          id: c.id,
          name: c.name,
          type: "character" as const,
          isPlayer: c.isPlayer,
          primaryImageId: primary?.id || null,
          matchField,
          snippet: matchField === "notes" ? getSnippet(c.notes) : null,
        };
      });

    // Search locations by name and description
    const matchingLocations = locations
      .filter((l: Location) => matches(l.name) || matches(l.description))
      .slice(0, 5)
      .map((l: Location) => {
        const result = listEntityImages(l.id, "location");
        const primary = result.primaryImage || result.images[0];
        const matchField = matches(l.name) ? "name" : "description";
        return {
          id: l.id,
          name: l.name,
          type: "location" as const,
          primaryImageId: primary?.id || null,
          matchField,
          snippet: matchField === "description" ? getSnippet(l.description) : null,
        };
      });

    // Search quests by name and description
    type QuestType = { id: string; name: string; status: string; description?: string };
    const matchingQuests = quests
      .filter((q: QuestType) => matches(q.name) || matches(q.description))
      .slice(0, 5)
      .map((q: QuestType) => {
        const result = listEntityImages(q.id, "quest");
        const primary = result.primaryImage || result.images[0];
        const matchField = matches(q.name) ? "name" : "description";
        return {
          id: q.id,
          name: q.name,
          type: "quest" as const,
          status: q.status,
          primaryImageId: primary?.id || null,
          matchField,
          snippet: matchField === "description" ? getSnippet(q.description || "") : null,
        };
      });

    // Search items by name and description
    type ItemType = { id: string; name: string; properties?: { description?: string } };
    const matchingItems = items
      .filter((i: ItemType) => matches(i.name) || matches(i.properties?.description))
      .slice(0, 5)
      .map((i: ItemType) => {
        const result = listEntityImages(i.id, "item");
        const primary = result.primaryImage || result.images[0];
        const matchField = matches(i.name) ? "name" : "description";
        return {
          id: i.id,
          name: i.name,
          type: "item" as const,
          primaryImageId: primary?.id || null,
          matchField,
          snippet: matchField === "description" ? getSnippet(i.properties?.description || "") : null,
        };
      });

    // Search factions by name and description
    const matchingFactions = factions
      .filter((f: Faction) => matches(f.name) || matches(f.description))
      .slice(0, 5)
      .map((f: Faction) => {
        const result = listEntityImages(f.id, "faction");
        const primary = result.primaryImage || result.images[0];
        const matchField = matches(f.name) ? "name" : "description";
        return {
          id: f.id,
          name: f.name,
          type: "faction" as const,
          status: f.status,
          primaryImageId: primary?.id || null,
          matchField,
          snippet: matchField === "description" ? getSnippet(f.description || "") : null,
        };
      });

    // Search notes by title and content
    type NoteType = { id: string; title: string; content: string; category: string | null };
    const matchingNotes = notes
      .filter((n: NoteType) => matches(n.title) || matches(n.content))
      .slice(0, 5)
      .map((n: NoteType) => {
        const result = listEntityImages(n.id, "note");
        const primary = result.primaryImage || result.images[0];
        const matchField = matches(n.title) ? "title" : "content";
        return {
          id: n.id,
          name: n.title,
          type: "note" as const,
          category: n.category || undefined,
          primaryImageId: primary?.id || null,
          matchField,
          snippet: matchField === "content" ? getSnippet(n.content) : null,
        };
      });

    // Search narrative events by content
    type EventType = { id: string; eventType: string; content: string; timestamp: string };
    const matchingEvents = events
      .filter((e: EventType) => matches(e.content) || matches(e.eventType))
      .slice(0, 5)
      .map((e: EventType) => ({
        id: e.id,
        name: e.eventType,
        type: "event" as const,
        eventType: e.eventType,
        timestamp: e.timestamp,
        matchField: "content" as const,
        snippet: getSnippet(e.content),
      }));

    res.json({
      characters: matchingCharacters,
      locations: matchingLocations,
      quests: matchingQuests,
      items: matchingItems,
      factions: matchingFactions,
      notes: matchingNotes,
      events: matchingEvents,
    });
  });

  // ============================================================================
  // SERVER-SENT EVENTS (SSE) - Realtime Updates
  // ============================================================================

  app.get("/api/games/:gameId/subscribe", (req: Request, res: Response) => {
    const { gameId } = req.params;

    // Verify game exists
    const game = loadGame(gameId);
    if (!game) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
    res.flushHeaders();

    // Subscribe this client to game events
    gameEvents.subscribe(gameId, res);

    // Handle client disconnect
    req.on("close", () => {
      gameEvents.unsubscribe(gameId, res);
    });
  });

  // ============================================================================
  // IMAGE FILE ROUTES
  // ============================================================================

  // Game favicon - serves the game's favicon image
  app.get("/api/games/:gameId/favicon", async (req: Request, res: Response) => {
    const { gameId } = req.params;
    const game = loadGame(gameId);

    if (!game || !game.faviconImageId) {
      res.status(404).send("No favicon set for this game");
      return;
    }

    try {
      // Serve the favicon image resized (32x32 is standard, 64 for retina)
      const size = req.query.size ? parseInt(req.query.size as string) : 32;
      const result = await getImageData(game.faviconImageId, {
        width: size,
        height: size,
        format: "png",
      });

      if (!result) {
        res.status(404).send("Favicon image not found");
        return;
      }

      const base64Data = result.base64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      res.set("Content-Type", "image/png");
      res.set("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
      res.send(buffer);
    } catch {
      res.status(500).send("Error processing favicon");
    }
  });

  app.get("/images/:imageId/file", async (req: Request, res: Response) => {
    const { imageId } = req.params;
    const width = req.query.width ? parseInt(req.query.width as string) : undefined;
    const height = req.query.height
      ? parseInt(req.query.height as string)
      : undefined;
    const format = req.query.format as "jpeg" | "webp" | "png" | undefined;

    try {
      const result = await getImageData(imageId, { width, height, format });
      if (!result) {
        res.status(404).send("Image not found");
        return;
      }

      const base64Data = result.base64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      res.set("Content-Type", result.outputFormat);
      res.set("Cache-Control", "public, max-age=86400");
      res.send(buffer);
    } catch {
      res.status(500).send("Error processing image");
    }
  });

  // ============================================================================
  // VUE APP (SPA) - Must be after API routes
  // ============================================================================
  if (existsSync(CLIENT_DIST)) {
    // Serve static files from Vue build
    app.use(express.static(CLIENT_DIST));

    // SPA fallback - serve index.html for all non-API routes
    // Express 5 requires named wildcards: /{*path}
    app.get("/{*path}", (req: Request, res: Response, next: NextFunction) => {
      // Skip API routes and image routes
      if (req.path.startsWith("/api/") || req.path.startsWith("/images/")) {
        next();
        return;
      }
      res.sendFile(join(CLIENT_DIST, "index.html"));
    });
  } else {
    // Development fallback - show message
    app.get("/", (_req: Request, res: Response) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>DMCP - Development Mode</title>
          <style>
            body { font-family: system-ui; background: #1a1a2e; color: #eee; padding: 40px; }
            h1 { color: #e94560; }
            code { background: #16213e; padding: 4px 8px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>DMCP Game Viewer</h1>
          <p>Vue app not built. Run the following commands:</p>
          <pre><code>cd client && npm run build</code></pre>
          <p>Or for development with hot reload:</p>
          <pre><code>cd client && npm run dev</code></pre>
          <p>API endpoints are available at <code>/api/*</code></p>
        </body>
        </html>
      `);
    });
  }

  // Error handling
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("HTTP Error:", err);
    res.status(500).json({ error: err.message });
  });

  return app;
}

export function startHttpServer(port: number = 3456): Promise<number> {
  return new Promise((resolve, reject) => {
    const app = createHttpServer(port);
    const server = app.listen(port, () => {
      const addr = server.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : port;
      console.error(`HTTP server running at http://localhost:${actualPort}`);
      resolve(actualPort);
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} in use, trying port 0 (random available)`);
        server.close();
        // Try with port 0 to get a random available port
        const retryServer = app.listen(0, () => {
          const addr = retryServer.address();
          const actualPort = typeof addr === 'object' && addr ? addr.port : 0;
          console.error(`HTTP server running at http://localhost:${actualPort}`);
          resolve(actualPort);
        });
        retryServer.on('error', reject);
      } else {
        reject(err);
      }
    });
  });
}
