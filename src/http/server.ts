import express, { Request, Response, NextFunction } from "express";
import { join } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Import tool functions
import { listSessions, loadSession } from "../tools/session.js";
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
  listSessionImages,
} from "../tools/images.js";
import { getInventory } from "../tools/inventory.js";
import { listQuests, getQuest } from "../tools/quest.js";
import { getHistory } from "../tools/narrative.js";
import {
  getDisplayConfig,
  getSessionDisplayConfig,
} from "../tools/display.js";
import type { Character, Location } from "../types/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to Vue app build
const CLIENT_DIST = join(__dirname, "..", "..", "client", "dist");

export function createHttpServer(port: number = 3000): express.Application {
  const app = express();

  app.use(express.json());

  // ============================================================================
  // API ROUTES (JSON)
  // ============================================================================

  // Theme/Display config endpoint (global)
  app.get("/api/theme", (_req: Request, res: Response) => {
    res.json(getDisplayConfig());
  });

  // Per-session theme endpoint
  app.get("/api/sessions/:sessionId/theme", (req: Request, res: Response) => {
    res.json(getSessionDisplayConfig(req.params.sessionId));
  });

  // Sessions
  app.get("/api/sessions", (_req: Request, res: Response) => {
    res.json(listSessions());
  });

  app.get("/api/sessions/:sessionId", (req: Request, res: Response) => {
    const session = loadSession(req.params.sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    const characters = listCharacters(req.params.sessionId);
    const locations = listLocations(req.params.sessionId);
    const quests = listQuests(req.params.sessionId);

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

    res.json({
      session,
      characters: charactersWithImages,
      locations: locationsWithImages,
      quests,
    });
  });

  app.get("/api/sessions/:sessionId/map", (req: Request, res: Response) => {
    const characters = listCharacters(req.params.sessionId);
    const playerChar = characters.find((c: Character) => c.isPlayer);
    const mapData = renderMap(req.params.sessionId, {
      playerLocationId: playerChar?.locationId || undefined,
    });
    if (!mapData) {
      res.status(404).json({ error: "No map data" });
      return;
    }
    res.json(mapData);
  });

  app.get("/api/sessions/:sessionId/history", (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const history = getHistory(req.params.sessionId, { limit });
    res.json(history);
  });

  app.get("/api/sessions/:sessionId/images", (req: Request, res: Response) => {
    const images = listSessionImages(req.params.sessionId);
    res.json(images);
  });

  app.get(
    "/api/sessions/:sessionId/characters",
    (req: Request, res: Response) => {
      const locationId = req.query.locationId as string | undefined;
      const characters = listCharacters(req.params.sessionId, { locationId });
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
        req.params.entityType as "character" | "location" | "item" | "scene"
      );
      res.json(images);
    }
  );

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

  // Search within a session
  app.get("/api/sessions/:sessionId/search", (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const query = (req.query.q as string || "").toLowerCase().trim();

    if (!query || query.length < 2) {
      res.json({ characters: [], locations: [], quests: [] });
      return;
    }

    const session = loadSession(sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const characters = listCharacters(sessionId);
    const locations = listLocations(sessionId);
    const quests = listQuests(sessionId);

    // Filter by fuzzy name match
    const matchingCharacters = characters
      .filter((c: Character) => c.name.toLowerCase().includes(query))
      .slice(0, 5)
      .map((c: Character) => {
        const result = listEntityImages(c.id, "character");
        const primary = result.primaryImage || result.images[0];
        return {
          id: c.id,
          name: c.name,
          type: "character" as const,
          isPlayer: c.isPlayer,
          primaryImageId: primary?.id || null,
        };
      });

    const matchingLocations = locations
      .filter((l: Location) => l.name.toLowerCase().includes(query))
      .slice(0, 5)
      .map((l: Location) => {
        const result = listEntityImages(l.id, "location");
        const primary = result.primaryImage || result.images[0];
        return {
          id: l.id,
          name: l.name,
          type: "location" as const,
          primaryImageId: primary?.id || null,
        };
      });

    const matchingQuests = quests
      .filter(
        (q: { name: string }) => q.name.toLowerCase().includes(query)
      )
      .slice(0, 5)
      .map((q: { id: string; name: string; status: string }) => ({
        id: q.id,
        name: q.name,
        type: "quest" as const,
        status: q.status,
      }));

    res.json({
      characters: matchingCharacters,
      locations: matchingLocations,
      quests: matchingQuests,
    });
  });

  // ============================================================================
  // IMAGE FILE ROUTES
  // ============================================================================
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

export function startHttpServer(port: number = 3000): Promise<void> {
  return new Promise((resolve) => {
    const app = createHttpServer(port);
    app.listen(port, () => {
      console.error(`HTTP server running at http://localhost:${port}`);
      resolve();
    });
  });
}
