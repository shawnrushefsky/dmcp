import express, { Request, Response, NextFunction } from "express";
import { join } from "path";
import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Import tool functions
import { listSessions, loadSession } from "../tools/session.js";
import { getCharacter, listCharacters, renderCharacterSheet } from "../tools/character.js";
import { getLocation, listLocations, renderMap } from "../tools/world.js";
import { getImage, getImageData, listEntityImages, listSessionImages } from "../tools/images.js";
import { getInventory } from "../tools/inventory.js";
import { listQuests, getQuest } from "../tools/quest.js";
import { getHistory } from "../tools/narrative.js";
import type { Session, Character, Location, Quest } from "../types/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const IMAGES_DIR = join(__dirname, "..", "..", "data", "images");

// HTML template helpers
function htmlPage(title: string, content: string, breadcrumbs?: Array<{ label: string; href?: string }>): string {
  const breadcrumbHtml = breadcrumbs
    ? `<nav class="breadcrumbs">${breadcrumbs
        .map((b, i) =>
          b.href && i < breadcrumbs.length - 1
            ? `<a href="${b.href}">${b.label}</a>`
            : `<span>${b.label}</span>`
        )
        .join(" / ")}</nav>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - DMCP</title>
  <style>
    :root {
      --bg: #1a1a2e;
      --bg-secondary: #16213e;
      --text: #eee;
      --text-muted: #888;
      --accent: #e94560;
      --border: #333;
      --success: #4ade80;
      --warning: #fbbf24;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      min-height: 100vh;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    header {
      background: var(--bg-secondary);
      padding: 15px 20px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 20px;
    }
    header h1 { font-size: 1.5rem; }
    header h1 a { color: var(--accent); text-decoration: none; }
    .breadcrumbs { margin-top: 10px; font-size: 0.9rem; color: var(--text-muted); }
    .breadcrumbs a { color: var(--accent); text-decoration: none; }
    .breadcrumbs a:hover { text-decoration: underline; }
    h2 { color: var(--accent); margin-bottom: 15px; border-bottom: 1px solid var(--border); padding-bottom: 10px; }
    h3 { margin: 20px 0 10px; }
    .card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
    }
    .card h3 { margin: 0 0 10px; }
    .card a { color: var(--accent); text-decoration: none; }
    .card a:hover { text-decoration: underline; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; }
    .ascii-box {
      background: #000;
      color: #0f0;
      font-family: 'Courier New', monospace;
      padding: 15px;
      border-radius: 8px;
      overflow-x: auto;
      white-space: pre;
      font-size: 14px;
      line-height: 1.3;
    }
    .stat { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid var(--border); }
    .stat:last-child { border-bottom: none; }
    .stat-label { color: var(--text-muted); }
    .health-bar {
      height: 20px;
      background: #333;
      border-radius: 4px;
      overflow: hidden;
      margin: 10px 0;
    }
    .health-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent), #ff6b6b);
      transition: width 0.3s;
    }
    .tag {
      display: inline-block;
      background: var(--accent);
      color: #fff;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.8rem;
      margin: 2px;
    }
    .tag.condition { background: var(--warning); color: #000; }
    .image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
    .image-card img { width: 100%; height: 200px; object-fit: cover; border-radius: 8px; }
    .image-card .label { margin-top: 8px; font-size: 0.9rem; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid var(--border); }
    th { color: var(--accent); font-weight: 600; }
    a.btn {
      display: inline-block;
      background: var(--accent);
      color: #fff;
      padding: 8px 16px;
      border-radius: 4px;
      text-decoration: none;
      margin: 5px 5px 5px 0;
    }
    a.btn:hover { opacity: 0.9; }
    .tabs { display: flex; gap: 10px; margin-bottom: 20px; }
    .tabs a { padding: 8px 16px; background: var(--bg-secondary); border-radius: 4px; text-decoration: none; color: var(--text); }
    .tabs a.active, .tabs a:hover { background: var(--accent); }
    .empty { color: var(--text-muted); font-style: italic; padding: 20px; text-align: center; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media (max-width: 768px) { .two-col { grid-template-columns: 1fr; } }
    .map-container { overflow-x: auto; }
    footer { margin-top: 40px; padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.9rem; border-top: 1px solid var(--border); }
  </style>
</head>
<body>
  <header>
    <h1><a href="/">DMCP Game Viewer</a></h1>
    ${breadcrumbHtml}
  </header>
  <main class="container">
    ${content}
  </main>
  <footer>
    DMCP - Dungeon Master Control Protocol
  </footer>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function createHttpServer(port: number = 3000): express.Application {
  const app = express();

  // JSON API routes under /api
  app.use(express.json());

  // ============================================================================
  // HOME PAGE
  // ============================================================================
  app.get("/", (_req: Request, res: Response) => {
    const sessions = listSessions();
    const sessionCards = sessions.length
      ? sessions
          .map(
            (s) => `
          <div class="card">
            <h3><a href="/sessions/${s.id}">${escapeHtml(s.name)}</a></h3>
            <p style="color: var(--text-muted); margin: 5px 0;">${escapeHtml(s.setting.slice(0, 150))}${s.setting.length > 150 ? "..." : ""}</p>
            <div class="stat">
              <span class="stat-label">Style</span>
              <span>${escapeHtml(s.style)}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Created</span>
              <span>${new Date(s.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        `
          )
          .join("")
      : '<p class="empty">No game sessions yet.</p>';

    const html = htmlPage(
      "Home",
      `
      <h2>Game Sessions</h2>
      <div class="grid">
        ${sessionCards}
      </div>
    `
    );
    res.send(html);
  });

  // ============================================================================
  // SESSION ROUTES
  // ============================================================================
  app.get("/sessions/:sessionId", (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const session = loadSession(sessionId);

    if (!session) {
      res.status(404).send(htmlPage("Not Found", '<p class="empty">Session not found.</p>'));
      return;
    }

    // Load session data
    const characters = listCharacters(sessionId);
    const locations = listLocations(sessionId);
    const quests = listQuests(sessionId);

    const breadcrumbs = [
      { label: "Home", href: "/" },
      { label: session.name },
    ];

    const pcCards = characters
      .filter((c: Character) => c.isPlayer)
      .map(
        (c: Character) => `
        <div class="card">
          <h3><a href="/characters/${c.id}">${escapeHtml(c.name)}</a></h3>
          <div class="health-bar">
            <div class="health-bar-fill" style="width: ${c.status.maxHealth ? (c.status.health / c.status.maxHealth) * 100 : 0}%"></div>
          </div>
          <div class="stat">
            <span class="stat-label">HP</span>
            <span>${c.status.health}/${c.status.maxHealth}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Level</span>
            <span>${c.status.level}</span>
          </div>
        </div>
      `
      )
      .join("");

    const npcCards = characters
      .filter((c: Character) => !c.isPlayer)
      .slice(0, 6)
      .map(
        (c: Character) => `
        <div class="card">
          <h3><a href="/characters/${c.id}">${escapeHtml(c.name)}</a></h3>
          <div class="stat">
            <span class="stat-label">HP</span>
            <span>${c.status.health}/${c.status.maxHealth}</span>
          </div>
        </div>
      `
      )
      .join("");

    const locationCards = locations
      .slice(0, 6)
      .map(
        (l: Location) => `
        <div class="card">
          <h3><a href="/locations/${l.id}">${escapeHtml(l.name)}</a></h3>
          <p style="color: var(--text-muted); font-size: 0.9rem;">${escapeHtml(l.description.slice(0, 100))}${l.description.length > 100 ? "..." : ""}</p>
        </div>
      `
      )
      .join("");

    const questRows = quests
      .slice(0, 5)
      .map(
        (q: Quest) => `
        <tr>
          <td><a href="/quests/${q.id}">${escapeHtml(q.name)}</a></td>
          <td><span class="tag">${q.status}</span></td>
          <td>${q.objectives.filter((o) => o.completed).length}/${q.objectives.length}</td>
        </tr>
      `
      )
      .join("");

    const html = htmlPage(
      session.name,
      `
      <h2>${escapeHtml(session.name)}</h2>
      <p style="margin-bottom: 20px;">${escapeHtml(session.setting)}</p>

      <div class="tabs">
        <a href="/sessions/${sessionId}" class="active">Overview</a>
        <a href="/sessions/${sessionId}/map">Map</a>
        <a href="/sessions/${sessionId}/images">Images</a>
        <a href="/sessions/${sessionId}/history">History</a>
      </div>

      <div class="two-col">
        <div>
          <h3>Player Characters</h3>
          ${pcCards || '<p class="empty">No player characters.</p>'}

          <h3 style="margin-top: 30px;">NPCs</h3>
          ${npcCards || '<p class="empty">No NPCs.</p>'}
          ${characters.filter((c: Character) => !c.isPlayer).length > 6 ? `<a href="/sessions/${sessionId}/characters" class="btn">View all NPCs</a>` : ""}
        </div>
        <div>
          <h3>Locations</h3>
          ${locationCards || '<p class="empty">No locations.</p>'}
          ${locations.length > 6 ? `<a href="/sessions/${sessionId}/locations" class="btn">View all locations</a>` : ""}

          <h3 style="margin-top: 30px;">Active Quests</h3>
          ${
            questRows
              ? `<table><thead><tr><th>Quest</th><th>Status</th><th>Progress</th></tr></thead><tbody>${questRows}</tbody></table>`
              : '<p class="empty">No quests.</p>'
          }
        </div>
      </div>
    `,
      breadcrumbs
    );
    res.send(html);
  });

  // Session Map
  app.get("/sessions/:sessionId/map", (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const session = loadSession(sessionId);

    if (!session) {
      res.status(404).send(htmlPage("Not Found", '<p class="empty">Session not found.</p>'));
      return;
    }

    const characters = listCharacters(sessionId);
    const playerChar = characters.find((c: Character) => c.isPlayer);
    const mapData = renderMap(sessionId, {
      playerLocationId: playerChar?.locationId || undefined,
    });

    const breadcrumbs = [
      { label: "Home", href: "/" },
      { label: session.name, href: `/sessions/${sessionId}` },
      { label: "Map" },
    ];

    const html = htmlPage(
      `Map - ${session.name}`,
      `
      <h2>World Map</h2>

      <div class="tabs">
        <a href="/sessions/${sessionId}">Overview</a>
        <a href="/sessions/${sessionId}/map" class="active">Map</a>
        <a href="/sessions/${sessionId}/images">Images</a>
        <a href="/sessions/${sessionId}/history">History</a>
      </div>

      <div class="map-container">
        ${mapData ? `<pre class="ascii-box">${escapeHtml(mapData.ascii)}</pre>` : '<p class="empty">No map data available. Create some locations first.</p>'}
      </div>

      ${
        mapData
          ? `
        <h3 style="margin-top: 30px;">Locations</h3>
        <div class="grid">
          ${mapData.nodes
            .map(
              (n) => `
            <div class="card">
              <h3><a href="/locations/${n.id}">${escapeHtml(n.name)}</a></h3>
              ${n.hasPlayer ? '<span class="tag">Player Here</span>' : ""}
              ${n.exits.length > 0 ? `<p style="color: var(--text-muted); font-size: 0.9rem;">Exits: ${n.exits.map((e) => e.direction).join(", ")}</p>` : ""}
            </div>
          `
            )
            .join("")}
        </div>
      `
          : ""
      }
    `,
      breadcrumbs
    );
    res.send(html);
  });

  // Session Images
  app.get("/sessions/:sessionId/images", (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const session = loadSession(sessionId);

    if (!session) {
      res.status(404).send(htmlPage("Not Found", '<p class="empty">Session not found.</p>'));
      return;
    }

    const images = listSessionImages(sessionId);
    const breadcrumbs = [
      { label: "Home", href: "/" },
      { label: session.name, href: `/sessions/${sessionId}` },
      { label: "Images" },
    ];

    const imageCards = images
      .map(
        (img) => `
        <div class="image-card">
          <a href="/images/${img.id}">
            <img src="/images/${img.id}/file" alt="${escapeHtml(img.label || "Image")}" loading="lazy">
          </a>
          <div class="label">${escapeHtml(img.label || img.entityType)}</div>
        </div>
      `
      )
      .join("");

    const html = htmlPage(
      `Images - ${session.name}`,
      `
      <h2>Images</h2>

      <div class="tabs">
        <a href="/sessions/${sessionId}">Overview</a>
        <a href="/sessions/${sessionId}/map">Map</a>
        <a href="/sessions/${sessionId}/images" class="active">Images</a>
        <a href="/sessions/${sessionId}/history">History</a>
      </div>

      <div class="image-grid">
        ${imageCards || '<p class="empty">No images stored yet.</p>'}
      </div>
    `,
      breadcrumbs
    );
    res.send(html);
  });

  // Session History
  app.get("/sessions/:sessionId/history", (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const session = loadSession(sessionId);

    if (!session) {
      res.status(404).send(htmlPage("Not Found", '<p class="empty">Session not found.</p>'));
      return;
    }

    const history = getHistory(sessionId, { limit: 50 });
    const breadcrumbs = [
      { label: "Home", href: "/" },
      { label: session.name, href: `/sessions/${sessionId}` },
      { label: "History" },
    ];

    const eventRows = history
      .map(
        (e) => `
        <div class="card">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span class="tag">${escapeHtml(e.eventType)}</span>
            <span style="color: var(--text-muted); font-size: 0.9rem;">${new Date(e.timestamp).toLocaleString()}</span>
          </div>
          <p>${escapeHtml(e.content.slice(0, 500))}${e.content.length > 500 ? "..." : ""}</p>
        </div>
      `
      )
      .join("");

    const html = htmlPage(
      `History - ${session.name}`,
      `
      <h2>Narrative History</h2>

      <div class="tabs">
        <a href="/sessions/${sessionId}">Overview</a>
        <a href="/sessions/${sessionId}/map">Map</a>
        <a href="/sessions/${sessionId}/images">Images</a>
        <a href="/sessions/${sessionId}/history" class="active">History</a>
      </div>

      ${eventRows || '<p class="empty">No events recorded yet.</p>'}
    `,
      breadcrumbs
    );
    res.send(html);
  });

  // ============================================================================
  // CHARACTER ROUTES
  // ============================================================================
  app.get("/characters/:characterId", (req: Request, res: Response) => {
    const { characterId } = req.params;
    const sheetData = renderCharacterSheet(characterId);

    if (!sheetData) {
      res.status(404).send(htmlPage("Not Found", '<p class="empty">Character not found.</p>'));
      return;
    }

    const char = sheetData.character;
    const session = loadSession(char.sessionId);
    const images = listEntityImages(characterId, "character");

    const breadcrumbs = [
      { label: "Home", href: "/" },
      { label: session?.name || "Session", href: `/sessions/${char.sessionId}` },
      { label: char.name },
    ];

    const primaryImage = images.primaryImage;
    const imageHtml = primaryImage
      ? `<img src="/images/${primaryImage.id}/file" alt="${escapeHtml(char.name)}" style="width: 100%; max-width: 300px; border-radius: 8px; margin-bottom: 20px;">`
      : "";

    const conditionTags = char.status.conditions
      .map((c) => `<span class="tag condition">${escapeHtml(c)}</span>`)
      .join("");

    const attributeRows = Object.entries(char.attributes)
      .map(
        ([k, v]) => `
        <div class="stat">
          <span class="stat-label">${escapeHtml(k)}</span>
          <span>${v}</span>
        </div>
      `
      )
      .join("");

    const skillRows = Object.entries(char.skills)
      .map(
        ([k, v]) => `
        <div class="stat">
          <span class="stat-label">${escapeHtml(k)}</span>
          <span>${v}</span>
        </div>
      `
      )
      .join("");

    const inventory = sheetData.inventory
      .map((item) => `<li>${escapeHtml(item.name)}${item.type ? ` (${escapeHtml(item.type)})` : ""}</li>`)
      .join("");

    const html = htmlPage(
      char.name,
      `
      <h2>${escapeHtml(char.name)} <span class="tag">${char.isPlayer ? "PC" : "NPC"}</span></h2>

      <div class="two-col">
        <div>
          ${imageHtml}

          <div class="card">
            <h3>Status</h3>
            <div class="health-bar">
              <div class="health-bar-fill" style="width: ${char.status.maxHealth ? (char.status.health / char.status.maxHealth) * 100 : 0}%"></div>
            </div>
            <div class="stat">
              <span class="stat-label">HP</span>
              <span>${char.status.health}/${char.status.maxHealth}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Level</span>
              <span>${char.status.level}</span>
            </div>
            <div class="stat">
              <span class="stat-label">XP</span>
              <span>${char.status.experience}</span>
            </div>
            ${sheetData.locationName ? `<div class="stat"><span class="stat-label">Location</span><span>${escapeHtml(sheetData.locationName)}</span></div>` : ""}
            ${conditionTags ? `<div style="margin-top: 10px;"><strong>Conditions:</strong><br>${conditionTags}</div>` : ""}
          </div>

          ${
            attributeRows
              ? `
          <div class="card">
            <h3>Attributes</h3>
            ${attributeRows}
          </div>
          `
              : ""
          }

          ${
            skillRows
              ? `
          <div class="card">
            <h3>Skills</h3>
            ${skillRows}
          </div>
          `
              : ""
          }
        </div>
        <div>
          <div class="card">
            <h3>ASCII Character Sheet</h3>
            <pre class="ascii-box">${escapeHtml(sheetData.ascii)}</pre>
          </div>

          ${
            inventory
              ? `
          <div class="card">
            <h3>Inventory</h3>
            <ul style="padding-left: 20px;">${inventory}</ul>
          </div>
          `
              : ""
          }

          ${
            char.notes
              ? `
          <div class="card">
            <h3>Notes</h3>
            <p>${escapeHtml(char.notes)}</p>
          </div>
          `
              : ""
          }

          ${
            images.images.length > 0
              ? `
          <div class="card">
            <h3>Gallery</h3>
            <div class="image-grid">
              ${images.images.map((img) => `<div class="image-card"><a href="/images/${img.id}"><img src="/images/${img.id}/file?width=200" alt="${escapeHtml(img.label || "Image")}" loading="lazy"></a></div>`).join("")}
            </div>
          </div>
          `
              : ""
          }
        </div>
      </div>
    `,
      breadcrumbs
    );
    res.send(html);
  });

  // ============================================================================
  // LOCATION ROUTES
  // ============================================================================
  app.get("/locations/:locationId", (req: Request, res: Response) => {
    const { locationId } = req.params;
    const location = getLocation(locationId);

    if (!location) {
      res.status(404).send(htmlPage("Not Found", '<p class="empty">Location not found.</p>'));
      return;
    }

    const session = loadSession(location.sessionId);
    const characters = listCharacters(location.sessionId, { locationId });
    const images = listEntityImages(locationId, "location");
    const items = getInventory(locationId, "location");

    const breadcrumbs = [
      { label: "Home", href: "/" },
      { label: session?.name || "Session", href: `/sessions/${location.sessionId}` },
      { label: location.name },
    ];

    const primaryImage = images.primaryImage;
    const imageHtml = primaryImage
      ? `<img src="/images/${primaryImage.id}/file" alt="${escapeHtml(location.name)}" style="width: 100%; border-radius: 8px; margin-bottom: 20px;">`
      : "";

    const charCards = characters
      .map(
        (c) => `
        <div class="card">
          <h3><a href="/characters/${c.id}">${escapeHtml(c.name)}</a></h3>
          <span class="tag">${c.isPlayer ? "PC" : "NPC"}</span>
        </div>
      `
      )
      .join("");

    const exitLinks = location.properties.exits
      .map((e) => `<a href="/locations/${e.destinationId}" class="btn">${escapeHtml(e.direction)}</a>`)
      .join("");

    const html = htmlPage(
      location.name,
      `
      <h2>${escapeHtml(location.name)}</h2>
      ${imageHtml}

      <div class="card">
        <h3>Description</h3>
        <p>${escapeHtml(location.description)}</p>
        ${location.properties.atmosphere ? `<p style="color: var(--text-muted); margin-top: 10px;"><em>${escapeHtml(location.properties.atmosphere)}</em></p>` : ""}
      </div>

      ${exitLinks ? `<div class="card"><h3>Exits</h3>${exitLinks}</div>` : ""}

      ${charCards ? `<h3>Characters Here</h3><div class="grid">${charCards}</div>` : ""}

      ${
        items.length > 0
          ? `
        <div class="card">
          <h3>Items Here</h3>
          <ul style="padding-left: 20px;">
            ${items.map((i) => `<li>${escapeHtml(i.name)}</li>`).join("")}
          </ul>
        </div>
      `
          : ""
      }
    `,
      breadcrumbs
    );
    res.send(html);
  });

  // ============================================================================
  // QUEST ROUTES
  // ============================================================================
  app.get("/quests/:questId", (req: Request, res: Response) => {
    const { questId } = req.params;
    const quest = getQuest(questId);

    if (!quest) {
      res.status(404).send(htmlPage("Not Found", '<p class="empty">Quest not found.</p>'));
      return;
    }

    const session = loadSession(quest.sessionId);
    const breadcrumbs = [
      { label: "Home", href: "/" },
      { label: session?.name || "Session", href: `/sessions/${quest.sessionId}` },
      { label: quest.name },
    ];

    const objectives = quest.objectives
      .map(
        (o) => `
        <div class="stat">
          <span>${o.completed ? "✅" : "⬜"} ${escapeHtml(o.description)}</span>
          ${o.optional ? '<span class="tag">Optional</span>' : ""}
        </div>
      `
      )
      .join("");

    const html = htmlPage(
      quest.name,
      `
      <h2>${escapeHtml(quest.name)} <span class="tag">${quest.status}</span></h2>

      <div class="card">
        <h3>Description</h3>
        <p>${escapeHtml(quest.description)}</p>
      </div>

      <div class="card">
        <h3>Objectives</h3>
        ${objectives}
      </div>

      ${quest.rewards ? `<div class="card"><h3>Rewards</h3><p>${escapeHtml(quest.rewards)}</p></div>` : ""}
    `,
      breadcrumbs
    );
    res.send(html);
  });

  // ============================================================================
  // IMAGE ROUTES
  // ============================================================================
  // Serve image file directly
  app.get("/images/:imageId/file", async (req: Request, res: Response) => {
    const { imageId } = req.params;
    const width = req.query.width ? parseInt(req.query.width as string) : undefined;
    const height = req.query.height ? parseInt(req.query.height as string) : undefined;
    const format = req.query.format as "jpeg" | "webp" | "png" | undefined;

    try {
      const result = await getImageData(imageId, { width, height, format });
      if (!result) {
        res.status(404).send("Image not found");
        return;
      }

      // Extract base64 data and send as binary
      const base64Data = result.base64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      res.set("Content-Type", result.outputFormat);
      res.set("Cache-Control", "public, max-age=86400");
      res.send(buffer);
    } catch {
      res.status(500).send("Error processing image");
    }
  });

  // Image detail page
  app.get("/images/:imageId", async (req: Request, res: Response) => {
    const { imageId } = req.params;
    const image = getImage(imageId);

    if (!image) {
      res.status(404).send(htmlPage("Not Found", '<p class="empty">Image not found.</p>'));
      return;
    }

    const session = loadSession(image.sessionId);
    const breadcrumbs = [
      { label: "Home", href: "/" },
      { label: session?.name || "Session", href: `/sessions/${image.sessionId}` },
      { label: "Images", href: `/sessions/${image.sessionId}/images` },
      { label: image.label || "Image" },
    ];

    const html = htmlPage(
      image.label || "Image",
      `
      <h2>${escapeHtml(image.label || "Image")}</h2>

      <img src="/images/${image.id}/file" alt="${escapeHtml(image.label || "Image")}" style="max-width: 100%; border-radius: 8px;">

      <div class="card" style="margin-top: 20px;">
        <h3>Details</h3>
        <div class="stat"><span class="stat-label">Type</span><span>${image.entityType}</span></div>
        <div class="stat"><span class="stat-label">Dimensions</span><span>${image.width || "?"} x ${image.height || "?"}</span></div>
        <div class="stat"><span class="stat-label">Size</span><span>${(image.fileSize / 1024).toFixed(1)} KB</span></div>
        <div class="stat"><span class="stat-label">Format</span><span>${image.mimeType}</span></div>
        ${image.description ? `<div class="stat"><span class="stat-label">Description</span><span>${escapeHtml(image.description)}</span></div>` : ""}
        ${image.generationTool ? `<div class="stat"><span class="stat-label">Generated by</span><span>${escapeHtml(image.generationTool)}</span></div>` : ""}
      </div>

      ${image.generationPrompt ? `<div class="card"><h3>Generation Prompt</h3><p>${escapeHtml(image.generationPrompt)}</p></div>` : ""}

      <p style="margin-top: 20px;">
        <a href="/${image.entityType}s/${image.entityId}" class="btn">View ${image.entityType}</a>
      </p>
    `,
      breadcrumbs
    );
    res.send(html);
  });

  // ============================================================================
  // API ROUTES (JSON)
  // ============================================================================
  app.get("/api/sessions", (_req: Request, res: Response) => {
    res.json(listSessions());
  });

  app.get("/api/sessions/:sessionId", (req: Request, res: Response) => {
    const session = loadSession(req.params.sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    // Build a rich state object for the API
    const characters = listCharacters(req.params.sessionId);
    const locations = listLocations(req.params.sessionId);
    const quests = listQuests(req.params.sessionId);
    res.json({ session, characters, locations, quests });
  });

  app.get("/api/sessions/:sessionId/map", (req: Request, res: Response) => {
    const mapData = renderMap(req.params.sessionId);
    if (!mapData) {
      res.status(404).json({ error: "No map data" });
      return;
    }
    res.json(mapData);
  });

  app.get("/api/characters/:characterId", (req: Request, res: Response) => {
    const char = getCharacter(req.params.characterId);
    if (!char) {
      res.status(404).json({ error: "Character not found" });
      return;
    }
    res.json(char);
  });

  app.get("/api/characters/:characterId/sheet", (req: Request, res: Response) => {
    const sheet = renderCharacterSheet(req.params.characterId);
    if (!sheet) {
      res.status(404).json({ error: "Character not found" });
      return;
    }
    res.json(sheet);
  });

  app.get("/api/locations/:locationId", (req: Request, res: Response) => {
    const loc = getLocation(req.params.locationId);
    if (!loc) {
      res.status(404).json({ error: "Location not found" });
      return;
    }
    res.json(loc);
  });

  // Error handling
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("HTTP Error:", err);
    res.status(500).send(htmlPage("Error", `<p class="empty">An error occurred: ${escapeHtml(err.message)}</p>`));
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
