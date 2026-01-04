import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import { safeJsonParse } from "../utils/json.js";
import { gameEvents } from "../events/emitter.js";
import { validateGameExists } from "./game.js";
import type { Combat, CombatParticipant } from "../types/index.js";
import { getCharacter } from "./character.js";
import { roll } from "./dice.js";
import { getRules } from "./rules.js";

export function startCombat(params: {
  gameId: string;
  locationId: string;
  participantIds: string[];
}): Combat {
  // Validate game exists to prevent orphaned records
  validateGameExists(params.gameId);

  const db = getDatabase();
  const id = uuidv4();
  const rules = getRules(params.gameId);

  // Validate all participants exist before processing (prevents race conditions)
  const characters = params.participantIds.map((charId) => {
    const character = getCharacter(charId);
    if (!character) {
      throw new Error(`Character '${charId}' not found. Cannot start combat with missing participants.`);
    }
    return { charId, character };
  });

  // Roll initiative for each validated participant
  const participants: CombatParticipant[] = characters.map(
    ({ charId, character }) => {
      let initiative = 0;

      if (rules) {
        // Simple initiative based on a d20 roll
        // The DM can configure this in combat rules
        const initRoll = roll("1d20");
        // Add dexterity modifier if available
        const dexMod = character.attributes.dexterity
          ? Math.floor((character.attributes.dexterity - 10) / 2)
          : 0;
        initiative = initRoll.total + dexMod;
      } else {
        initiative = roll("1d20").total;
      }

      return {
        characterId: charId,
        initiative,
        isActive: true,
      };
    }
  );

  // Sort by initiative (highest first)
  participants.sort((a, b) => b.initiative - a.initiative);

  const stmt = db.prepare(`
    INSERT INTO combats (id, game_id, location_id, participants, current_turn, round, status, log)
    VALUES (?, ?, ?, ?, 0, 1, 'active', '[]')
  `);

  stmt.run(id, params.gameId, params.locationId, JSON.stringify(participants));

  const combat: Combat = {
    id,
    gameId: params.gameId,
    locationId: params.locationId,
    participants,
    currentTurn: 0,
    round: 1,
    status: "active",
    log: [],
  };

  // Emit realtime event
  gameEvents.emit({
    type: "combat:started",
    gameId: params.gameId,
    entityId: id,
    entityType: "combat",
    timestamp: new Date().toISOString(),
    data: { participantCount: participants.length },
  });

  return combat;
}

export function getCombat(id: string): Combat | null {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM combats WHERE id = ?`);
  const row = stmt.get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    gameId: row.game_id as string,
    locationId: row.location_id as string,
    participants: safeJsonParse<CombatParticipant[]>(row.participants as string, []),
    currentTurn: row.current_turn as number,
    round: row.round as number,
    status: row.status as "active" | "resolved",
    log: safeJsonParse<string[]>(row.log as string, []),
  };
}

export function getActiveCombat(gameId: string): Combat | null {
  const db = getDatabase();
  const stmt = db.prepare(
    `SELECT * FROM combats WHERE game_id = ? AND status = 'active' LIMIT 1`
  );
  const row = stmt.get(gameId) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    gameId: row.game_id as string,
    locationId: row.location_id as string,
    participants: safeJsonParse<CombatParticipant[]>(row.participants as string, []),
    currentTurn: row.current_turn as number,
    round: row.round as number,
    status: row.status as "active" | "resolved",
    log: safeJsonParse<string[]>(row.log as string, []),
  };
}

export function nextTurn(combatId: string): Combat | null {
  const combat = getCombat(combatId);
  if (!combat || combat.status !== "active") return null;

  const db = getDatabase();

  // Find next active participant
  let nextTurn = combat.currentTurn;
  let round = combat.round;
  let attempts = 0;
  const maxAttempts = combat.participants.length;

  do {
    nextTurn = (nextTurn + 1) % combat.participants.length;
    if (nextTurn === 0) {
      round++;
    }
    attempts++;
  } while (
    !combat.participants[nextTurn].isActive &&
    attempts < maxAttempts
  );

  // If no active participants, end combat
  if (attempts >= maxAttempts) {
    return endCombat(combatId);
  }

  const stmt = db.prepare(`
    UPDATE combats SET current_turn = ?, round = ? WHERE id = ?
  `);
  stmt.run(nextTurn, round, combatId);

  return {
    ...combat,
    currentTurn: nextTurn,
    round,
  };
}

export function addCombatLog(combatId: string, entry: string): Combat | null {
  const combat = getCombat(combatId);
  if (!combat) return null;

  const db = getDatabase();
  const log = [...combat.log, entry];

  const stmt = db.prepare(`UPDATE combats SET log = ? WHERE id = ?`);
  stmt.run(JSON.stringify(log), combatId);

  return {
    ...combat,
    log,
  };
}

export function removeParticipant(
  combatId: string,
  characterId: string
): Combat | null {
  const combat = getCombat(combatId);
  if (!combat) return null;

  const db = getDatabase();
  const participants = combat.participants.map((p) =>
    p.characterId === characterId ? { ...p, isActive: false } : p
  );

  const stmt = db.prepare(`UPDATE combats SET participants = ? WHERE id = ?`);
  stmt.run(JSON.stringify(participants), combatId);

  // Check if combat should end
  const activeCount = participants.filter((p) => p.isActive).length;
  if (activeCount <= 1) {
    return endCombat(combatId);
  }

  return {
    ...combat,
    participants,
  };
}

export function endCombat(combatId: string): Combat | null {
  const combat = getCombat(combatId);
  if (!combat) return null;

  const db = getDatabase();
  const stmt = db.prepare(`UPDATE combats SET status = 'resolved' WHERE id = ?`);
  stmt.run(combatId);

  // Emit realtime event
  gameEvents.emit({
    type: "combat:ended",
    gameId: combat.gameId,
    entityId: combatId,
    entityType: "combat",
    timestamp: new Date().toISOString(),
  });

  return {
    ...combat,
    status: "resolved",
  };
}

export function getCurrentCombatant(combatId: string): string | null {
  const combat = getCombat(combatId);
  if (!combat || combat.status !== "active") return null;

  return combat.participants[combat.currentTurn]?.characterId || null;
}
