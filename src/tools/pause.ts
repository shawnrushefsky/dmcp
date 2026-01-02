import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import { safeJsonParse } from "../utils/json.js";
import type {
  PauseState,
  PauseChecklist,
  PauseChecklistItem,
  ResumeContext,
  NarrativeThread,
  ActiveConversation,
  Session,
  Character,
  Location,
  Quest,
  Combat,
  NarrativeEvent,
  Timer,
  ScheduledEvent,
  ExternalUpdate,
  PendingUpdatesResult,
} from "../types/index.js";

// ============================================================================
// PAUSE PREPARATION
// ============================================================================

/**
 * Prepares for a game pause by returning current state and a checklist
 * of context that should be saved. This helps agents understand what
 * ephemeral state needs to be captured.
 */
export function preparePause(sessionId: string): PauseChecklist | null {
  const db = getDatabase();

  // Get session
  const sessionRow = db
    .prepare(`SELECT * FROM sessions WHERE id = ?`)
    .get(sessionId) as Record<string, unknown> | undefined;

  if (!sessionRow) return null;

  // Gather current state counts
  const questCount = db
    .prepare(
      `SELECT COUNT(*) as count FROM quests WHERE session_id = ? AND status = 'active'`
    )
    .get(sessionId) as { count: number };

  const combatRow = db
    .prepare(
      `SELECT COUNT(*) as count FROM combats WHERE session_id = ? AND status = 'active'`
    )
    .get(sessionId) as { count: number };

  const timerCount = db
    .prepare(
      `SELECT COUNT(*) as count FROM timers WHERE session_id = ? AND triggered = 0`
    )
    .get(sessionId) as { count: number };

  const eventCount = db
    .prepare(
      `SELECT COUNT(*) as count FROM scheduled_events WHERE session_id = ? AND triggered = 0`
    )
    .get(sessionId) as { count: number };

  const recentEventCount = db
    .prepare(
      `SELECT COUNT(*) as count FROM narrative_events WHERE session_id = ? AND timestamp > datetime('now', '-1 hour')`
    )
    .get(sessionId) as { count: number };

  // Get current location name
  let playerLocation: string | null = null;
  if (sessionRow.current_location_id) {
    const locRow = db
      .prepare(`SELECT name FROM locations WHERE id = ?`)
      .get(sessionRow.current_location_id) as { name: string } | undefined;
    playerLocation = locRow?.name || null;
  }

  // Check for existing pause state
  const existingPause = getPauseState(sessionId);

  // Build the checklist
  const checklist: PauseChecklistItem[] = [
    // Required items
    {
      category: "Scene Context",
      item: "currentScene",
      description:
        "Describe where we are in the story - what scene/location/moment is active",
      required: true,
      example:
        "The party is in the merchant's shop, having just discovered the hidden basement entrance",
    },
    {
      category: "Scene Context",
      item: "immediateSituation",
      description:
        "What is happening RIGHT NOW - the exact moment we're pausing at",
      required: true,
      example:
        "Kira has her hand on the trapdoor handle, asking the party if they should descend",
    },

    // Important context
    {
      category: "Scene Context",
      item: "sceneAtmosphere",
      description:
        "Mood, lighting, ambient sounds, emotional tension level",
      required: false,
      example:
        "Tense and dusty, afternoon light through grimy windows, smell of old spices",
    },

    // Pending interactions
    {
      category: "Player Interaction",
      item: "pendingPlayerAction",
      description:
        "What action is the player considering or about to take?",
      required: false,
      example: "Player was deciding whether to open the trapdoor or search for traps first",
    },
    {
      category: "Player Interaction",
      item: "awaitingResponseTo",
      description:
        "What question or prompt is awaiting the player's response?",
      required: false,
      example: "Asked player 'Do you want to descend first, or send someone else?'",
    },
    {
      category: "Player Interaction",
      item: "presentedChoices",
      description: "Any formal choices that were presented to the player",
      required: false,
    },

    // Narrative threads
    {
      category: "Narrative Threads",
      item: "activeThreads",
      description:
        "Ongoing storylines, investigations, or subplots that are 'in play'",
      required: false,
      example:
        "[{name: 'Missing Merchant', status: 'active', urgency: 'high'}]",
    },

    // DM plans
    {
      category: "DM Notes",
      item: "dmShortTermPlans",
      description:
        "What was about to happen next? Any planned encounters or reveals?",
      required: false,
      example:
        "If they descend, they'll find the merchant's body and trigger the ghost encounter",
    },
    {
      category: "DM Notes",
      item: "dmLongTermPlans",
      description: "Major plot arcs being developed or built toward",
      required: false,
      example: "Building toward reveal that the merchant guild is a front for the cult",
    },
    {
      category: "DM Notes",
      item: "upcomingReveals",
      description: "Secrets that are close to being discovered",
      required: false,
    },

    // NPC state
    {
      category: "NPC Context",
      item: "npcAttitudes",
      description:
        "Current emotional states/attitudes of relevant NPCs (especially if shifted from baseline)",
      required: false,
      example: "{'guard_captain_id': 'suspicious of party after tavern incident'}",
    },
    {
      category: "NPC Context",
      item: "activeConversations",
      description:
        "Any ongoing conversations and where they left off",
      required: false,
    },

    // Player context
    {
      category: "Player Context",
      item: "playerApparentGoals",
      description:
        "What does the player seem to be trying to accomplish?",
      required: false,
      example: "Seems focused on finding the missing merchant, ignoring side hooks",
    },
    {
      category: "Player Context",
      item: "unresolvedHooks",
      description:
        "Plot hooks the player noticed but hasn't pursued yet",
      required: false,
      example: "['The innkeeper's warning about the old mine', 'Strange lights in forest']",
    },

    // Tone
    {
      category: "Tone",
      item: "recentTone",
      description:
        "Recent narrative tone - was it tense? Comedic? Romantic? Action-heavy?",
      required: false,
      example: "Suspenseful mystery with moments of dark humor",
    },
  ];

  const instructions = `
PAUSE PREPARATION CHECKLIST
===========================

Before pausing, save your context using save_pause_state. This captures the
ephemeral state in your "head" that isn't in the database.

REQUIRED fields must be filled - they capture what's happening RIGHT NOW.
Optional fields help preserve nuance - fill in what's relevant.

TIPS:
- Be specific about the EXACT moment - "hand on door handle" not "at the door"
- Capture emotional states and atmosphere - these set the tone for resumption
- Note what YOU were planning, not just what happened
- Record player intent as you understand it

The next DM (even if it's you in a new context window) will use this to
resume seamlessly. Write as if briefing a replacement DM mid-session.

After filling in your context, call save_pause_state with your data.
`.trim();

  return {
    sessionId,
    sessionName: sessionRow.name as string,
    currentState: {
      playerLocation,
      activeQuests: questCount.count,
      activeCombat: combatRow.count > 0,
      activeTimers: timerCount.count,
      pendingEvents: eventCount.count,
      recentEventCount: recentEventCount.count,
    },
    checklist,
    existingPauseState: existingPause,
    instructions,
  };
}

// ============================================================================
// SAVE PAUSE STATE
// ============================================================================

export interface SavePauseStateParams {
  sessionId: string;

  // Required
  currentScene: string;
  immediateSituation: string;

  // Optional context
  sceneAtmosphere?: string;
  pendingPlayerAction?: string;
  awaitingResponseTo?: string;
  presentedChoices?: string[];
  activeThreads?: NarrativeThread[];
  dmShortTermPlans?: string;
  dmLongTermPlans?: string;
  upcomingReveals?: string[];
  npcAttitudes?: Record<string, string>;
  activeConversations?: ActiveConversation[];
  recentTone?: string;
  playerApparentGoals?: string;
  unresolvedHooks?: string[];
  pauseReason?: string;
  modelUsed?: string;
}

export function savePauseState(params: SavePauseStateParams): PauseState {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  // Delete existing pause state if any (only one per session)
  db.prepare(`DELETE FROM pause_states WHERE session_id = ?`).run(
    params.sessionId
  );

  const stmt = db.prepare(`
    INSERT INTO pause_states (
      id, session_id,
      current_scene, scene_atmosphere, immediate_situation,
      pending_player_action, awaiting_response_to, presented_choices,
      active_threads,
      dm_short_term_plans, dm_long_term_plans, upcoming_reveals,
      npc_attitudes, active_conversations,
      recent_tone, player_apparent_goals, unresolved_hooks,
      pause_reason, created_at, model_used
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    params.sessionId,
    params.currentScene,
    params.sceneAtmosphere || null,
    params.immediateSituation,
    params.pendingPlayerAction || null,
    params.awaitingResponseTo || null,
    params.presentedChoices ? JSON.stringify(params.presentedChoices) : null,
    JSON.stringify(params.activeThreads || []),
    params.dmShortTermPlans || null,
    params.dmLongTermPlans || null,
    JSON.stringify(params.upcomingReveals || []),
    JSON.stringify(params.npcAttitudes || {}),
    JSON.stringify(params.activeConversations || []),
    params.recentTone || null,
    params.playerApparentGoals || null,
    JSON.stringify(params.unresolvedHooks || []),
    params.pauseReason || null,
    now,
    params.modelUsed || null
  );

  // Also log a narrative event for the pause
  const eventStmt = db.prepare(`
    INSERT INTO narrative_events (id, session_id, event_type, content, metadata, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  eventStmt.run(
    uuidv4(),
    params.sessionId,
    "game_paused",
    `Game paused: ${params.immediateSituation}`,
    JSON.stringify({
      pauseReason: params.pauseReason,
      modelUsed: params.modelUsed,
      pauseStateId: id,
    }),
    now
  );

  return {
    id,
    sessionId: params.sessionId,
    currentScene: params.currentScene,
    sceneAtmosphere: params.sceneAtmosphere || null,
    immediateSituation: params.immediateSituation,
    pendingPlayerAction: params.pendingPlayerAction || null,
    awaitingResponseTo: params.awaitingResponseTo || null,
    presentedChoices: params.presentedChoices || null,
    activeThreads: params.activeThreads || [],
    dmShortTermPlans: params.dmShortTermPlans || null,
    dmLongTermPlans: params.dmLongTermPlans || null,
    upcomingReveals: params.upcomingReveals || [],
    npcAttitudes: params.npcAttitudes || {},
    activeConversations: params.activeConversations || [],
    recentTone: params.recentTone || null,
    playerApparentGoals: params.playerApparentGoals || null,
    unresolvedHooks: params.unresolvedHooks || [],
    pauseReason: params.pauseReason || null,
    createdAt: now,
    modelUsed: params.modelUsed || null,
  };
}

// ============================================================================
// GET PAUSE STATE
// ============================================================================

export function getPauseState(sessionId: string): PauseState | null {
  const db = getDatabase();
  const row = db
    .prepare(`SELECT * FROM pause_states WHERE session_id = ?`)
    .get(sessionId) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    currentScene: row.current_scene as string,
    sceneAtmosphere: row.scene_atmosphere as string | null,
    immediateSituation: row.immediate_situation as string,
    pendingPlayerAction: row.pending_player_action as string | null,
    awaitingResponseTo: row.awaiting_response_to as string | null,
    presentedChoices: row.presented_choices
      ? JSON.parse(row.presented_choices as string)
      : null,
    activeThreads: JSON.parse((row.active_threads as string) || "[]"),
    dmShortTermPlans: row.dm_short_term_plans as string | null,
    dmLongTermPlans: row.dm_long_term_plans as string | null,
    upcomingReveals: JSON.parse((row.upcoming_reveals as string) || "[]"),
    npcAttitudes: JSON.parse((row.npc_attitudes as string) || "{}"),
    activeConversations: JSON.parse(
      (row.active_conversations as string) || "[]"
    ),
    recentTone: row.recent_tone as string | null,
    playerApparentGoals: row.player_apparent_goals as string | null,
    unresolvedHooks: JSON.parse((row.unresolved_hooks as string) || "[]"),
    pauseReason: row.pause_reason as string | null,
    createdAt: row.created_at as string,
    modelUsed: row.model_used as string | null,
  };
}

// ============================================================================
// GET RESUME CONTEXT
// ============================================================================

/**
 * Returns everything needed to resume a paused game seamlessly.
 * Includes pause state, full game state, and a ready-to-use resume prompt.
 */
export function getResumeContext(sessionId: string): ResumeContext | null {
  const db = getDatabase();

  // Get pause state
  const pauseState = getPauseState(sessionId);
  if (!pauseState) return null;

  // Get session
  const sessionRow = db
    .prepare(`SELECT * FROM sessions WHERE id = ?`)
    .get(sessionId) as Record<string, unknown> | undefined;

  if (!sessionRow) return null;

  const session: Session = {
    id: sessionRow.id as string,
    name: sessionRow.name as string,
    setting: sessionRow.setting as string,
    style: sessionRow.style as string,
    rules: sessionRow.rules ? JSON.parse(sessionRow.rules as string) : null,
    preferences: sessionRow.preferences
      ? JSON.parse(sessionRow.preferences as string)
      : null,
    currentLocationId: sessionRow.current_location_id as string | null,
    titleImageId: sessionRow.title_image_id as string | null,
    createdAt: sessionRow.created_at as string,
    updatedAt: sessionRow.updated_at as string,
  };

  // Get player character
  const playerRow = db
    .prepare(
      `SELECT * FROM characters WHERE session_id = ? AND is_player = 1 LIMIT 1`
    )
    .get(sessionId) as Record<string, unknown> | undefined;

  const playerCharacter: Character | null = playerRow
    ? {
        id: playerRow.id as string,
        sessionId: playerRow.session_id as string,
        name: playerRow.name as string,
        isPlayer: true,
        attributes: JSON.parse((playerRow.attributes as string) || "{}"),
        skills: JSON.parse((playerRow.skills as string) || "{}"),
        status: JSON.parse((playerRow.status as string) || "{}"),
        locationId: playerRow.location_id as string | null,
        notes: playerRow.notes as string,
        voice: playerRow.voice
          ? JSON.parse(playerRow.voice as string)
          : null,
        imageGen: playerRow.image_gen
          ? JSON.parse(playerRow.image_gen as string)
          : null,
        createdAt: playerRow.created_at as string,
      }
    : null;

  // Get current location
  const locationRow = session.currentLocationId
    ? (db
        .prepare(`SELECT * FROM locations WHERE id = ?`)
        .get(session.currentLocationId) as Record<string, unknown> | undefined)
    : null;

  const currentLocation: Location | null = locationRow
    ? {
        id: locationRow.id as string,
        sessionId: locationRow.session_id as string,
        name: locationRow.name as string,
        description: locationRow.description as string,
        properties: JSON.parse((locationRow.properties as string) || "{}"),
        imageGen: locationRow.image_gen
          ? JSON.parse(locationRow.image_gen as string)
          : null,
      }
    : null;

  // Get active quests
  const questRows = db
    .prepare(
      `SELECT * FROM quests WHERE session_id = ? AND status = 'active'`
    )
    .all(sessionId) as Record<string, unknown>[];

  const activeQuests: Quest[] = questRows.map((row) => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    name: row.name as string,
    description: row.description as string,
    objectives: JSON.parse((row.objectives as string) || "[]"),
    status: row.status as Quest["status"],
    rewards: row.rewards as string | undefined,
  }));

  // Get active combat
  const combatRow = db
    .prepare(
      `SELECT * FROM combats WHERE session_id = ? AND status = 'active' LIMIT 1`
    )
    .get(sessionId) as Record<string, unknown> | undefined;

  const activeCombat: Combat | null = combatRow
    ? {
        id: combatRow.id as string,
        sessionId: combatRow.session_id as string,
        locationId: combatRow.location_id as string,
        participants: JSON.parse((combatRow.participants as string) || "[]"),
        currentTurn: combatRow.current_turn as number,
        round: combatRow.round as number,
        status: combatRow.status as Combat["status"],
        log: JSON.parse((combatRow.log as string) || "[]"),
      }
    : null;

  // Get recent events (last 10)
  const eventRows = db
    .prepare(
      `SELECT * FROM narrative_events WHERE session_id = ? ORDER BY timestamp DESC LIMIT 10`
    )
    .all(sessionId) as Record<string, unknown>[];

  const recentEvents: NarrativeEvent[] = eventRows.map((row) => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    eventType: row.event_type as string,
    content: row.content as string,
    metadata: JSON.parse((row.metadata as string) || "{}"),
    timestamp: row.timestamp as string,
  }));

  // Get active timers
  const timerRows = db
    .prepare(
      `SELECT * FROM timers WHERE session_id = ? AND triggered = 0`
    )
    .all(sessionId) as Record<string, unknown>[];

  const activeTimers: Timer[] = timerRows.map((row) => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    name: row.name as string,
    description: row.description as string,
    timerType: row.timer_type as Timer["timerType"],
    currentValue: row.current_value as number,
    maxValue: row.max_value as number | null,
    direction: row.direction as Timer["direction"],
    triggerAt: row.trigger_at as number | null,
    triggered: false,
    unit: row.unit as string,
    visibleToPlayers: Boolean(row.visible_to_players),
    createdAt: row.created_at as string,
  }));

  // Get pending scheduled events
  const scheduledRows = db
    .prepare(
      `SELECT * FROM scheduled_events WHERE session_id = ? AND triggered = 0`
    )
    .all(sessionId) as Record<string, unknown>[];

  const pendingScheduledEvents: ScheduledEvent[] = scheduledRows.map((row) => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    name: row.name as string,
    description: row.description as string,
    triggerTime: JSON.parse(row.trigger_time as string),
    recurring: row.recurring as string | null,
    triggered: false,
    metadata: JSON.parse((row.metadata as string) || "{}"),
  }));

  // Generate narrative summary from recent events
  const narrativeSummary = recentEvents
    .slice()
    .reverse()
    .map((e) => `[${e.eventType}] ${e.content}`)
    .join("\n");

  // Build resume prompt
  const warnings: string[] = [];

  if (activeCombat) {
    warnings.push(
      `ACTIVE COMBAT: Round ${activeCombat.round}, waiting for turn ${activeCombat.currentTurn}`
    );
  }

  if (activeTimers.length > 0) {
    warnings.push(
      `${activeTimers.length} active timer(s) - check if any are urgent`
    );
  }

  const pauseAge = Math.floor(
    (Date.now() - new Date(pauseState.createdAt).getTime()) / 1000 / 60
  );
  if (pauseAge > 60) {
    warnings.push(
      `Pause state is ${Math.floor(pauseAge / 60)} hours old - player may need recap`
    );
  }

  const resumePrompt = `
═══════════════════════════════════════════════════════════════════════════════
                              GAME RESUME BRIEFING
═══════════════════════════════════════════════════════════════════════════════

SESSION: ${session.name}
SETTING: ${session.setting} (${session.style})
PAUSED: ${pauseState.createdAt}${pauseState.modelUsed ? ` (by ${pauseState.modelUsed})` : ""}
${pauseState.pauseReason ? `REASON: ${pauseState.pauseReason}` : ""}

───────────────────────────────────────────────────────────────────────────────
CURRENT SCENE
───────────────────────────────────────────────────────────────────────────────
${pauseState.currentScene}

ATMOSPHERE: ${pauseState.sceneAtmosphere || "Not specified"}
TONE: ${pauseState.recentTone || "Not specified"}

───────────────────────────────────────────────────────────────────────────────
IMMEDIATE SITUATION (Resume from here)
───────────────────────────────────────────────────────────────────────────────
${pauseState.immediateSituation}

${pauseState.pendingPlayerAction ? `PLAYER WAS ABOUT TO: ${pauseState.pendingPlayerAction}` : ""}
${pauseState.awaitingResponseTo ? `AWAITING RESPONSE TO: ${pauseState.awaitingResponseTo}` : ""}
${pauseState.presentedChoices ? `CHOICES PRESENTED: ${pauseState.presentedChoices.join(" | ")}` : ""}

───────────────────────────────────────────────────────────────────────────────
PLAYER CONTEXT
───────────────────────────────────────────────────────────────────────────────
CHARACTER: ${playerCharacter?.name || "Unknown"}
LOCATION: ${currentLocation?.name || "Unknown"}
APPARENT GOALS: ${pauseState.playerApparentGoals || "Not noted"}

${pauseState.unresolvedHooks.length > 0 ? `UNRESOLVED HOOKS:\n${pauseState.unresolvedHooks.map((h) => `  • ${h}`).join("\n")}` : ""}

───────────────────────────────────────────────────────────────────────────────
ACTIVE QUESTS (${activeQuests.length})
───────────────────────────────────────────────────────────────────────────────
${activeQuests.map((q) => `• ${q.name}: ${q.description.substring(0, 80)}...`).join("\n") || "None"}

───────────────────────────────────────────────────────────────────────────────
DM NOTES (Previous DM's Plans)
───────────────────────────────────────────────────────────────────────────────
SHORT-TERM: ${pauseState.dmShortTermPlans || "None recorded"}
LONG-TERM: ${pauseState.dmLongTermPlans || "None recorded"}
${pauseState.upcomingReveals.length > 0 ? `UPCOMING REVEALS:\n${pauseState.upcomingReveals.map((r) => `  • ${r}`).join("\n")}` : ""}

───────────────────────────────────────────────────────────────────────────────
NARRATIVE THREADS
───────────────────────────────────────────────────────────────────────────────
${pauseState.activeThreads.map((t) => `• [${t.status.toUpperCase()}/${t.urgency}] ${t.name}: ${t.description}`).join("\n") || "None recorded"}

${Object.keys(pauseState.npcAttitudes).length > 0 ? `───────────────────────────────────────────────────────────────────────────────
NPC ATTITUDES
───────────────────────────────────────────────────────────────────────────────
${Object.entries(pauseState.npcAttitudes).map(([id, attitude]) => `• ${id}: ${attitude}`).join("\n")}` : ""}

${warnings.length > 0 ? `───────────────────────────────────────────────────────────────────────────────
⚠️  WARNINGS
───────────────────────────────────────────────────────────────────────────────
${warnings.map((w) => `• ${w}`).join("\n")}` : ""}

═══════════════════════════════════════════════════════════════════════════════
                              RESUME INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════════

1. Welcome the player back warmly
2. Provide a brief "Previously..." recap if significant time has passed
3. Re-establish the scene atmosphere
4. Resume from the IMMEDIATE SITUATION - pick up exactly where we left off
5. If choices were pending, re-present them naturally in the narrative

Remember: You're continuing mid-scene. Don't start fresh - pick up the thread!
═══════════════════════════════════════════════════════════════════════════════
`.trim();

  return {
    pauseState,
    gameState: {
      session,
      playerCharacter,
      currentLocation,
      activeQuests,
      activeCombat,
      recentEvents,
      activeTimers,
      pendingScheduledEvents,
    },
    narrativeSummary,
    resumePrompt,
    warnings,
  };
}

// ============================================================================
// CONTEXT SNAPSHOT (Lightweight incremental saves)
// ============================================================================

export interface ContextSnapshotParams {
  sessionId: string;
  situation: string;
  notes?: string;
  npcMood?: Record<string, string>;
  playerIntent?: string;
}

/**
 * Quick, lightweight context save for use during play.
 * Agents should call this after significant moments.
 * Updates only the most volatile fields without full pause ceremony.
 */
export function saveContextSnapshot(params: ContextSnapshotParams): {
  success: boolean;
  message: string;
  suggestion?: string;
} {
  const db = getDatabase();

  // Check if pause state exists
  const existing = getPauseState(params.sessionId);

  if (existing) {
    // Update volatile fields only
    const stmt = db.prepare(`
      UPDATE pause_states SET
        immediate_situation = ?,
        player_apparent_goals = COALESCE(?, player_apparent_goals),
        npc_attitudes = COALESCE(?, npc_attitudes),
        created_at = ?
      WHERE session_id = ?
    `);

    stmt.run(
      params.situation,
      params.playerIntent,
      params.npcMood ? JSON.stringify(params.npcMood) : null,
      new Date().toISOString(),
      params.sessionId
    );

    return {
      success: true,
      message: "Context snapshot updated",
    };
  } else {
    // Create minimal pause state
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO pause_states (
        id, session_id,
        current_scene, immediate_situation,
        player_apparent_goals, npc_attitudes,
        active_threads, upcoming_reveals, active_conversations, unresolved_hooks,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, '[]', '[]', '[]', '[]', ?)
    `);

    stmt.run(
      id,
      params.sessionId,
      params.notes || "Snapshot taken during play",
      params.situation,
      params.playerIntent || null,
      params.npcMood ? JSON.stringify(params.npcMood) : "{}",
      now
    );

    return {
      success: true,
      message: "Context snapshot created",
      suggestion:
        "Consider using prepare_pause and save_pause_state before ending the session for a complete save.",
    };
  }
}

// ============================================================================
// DELETE PAUSE STATE
// ============================================================================

export function deletePauseState(sessionId: string): boolean {
  const db = getDatabase();
  const result = db
    .prepare(`DELETE FROM pause_states WHERE session_id = ?`)
    .run(sessionId);
  return result.changes > 0;
}

// ============================================================================
// CHECK IF CONTEXT NEEDS SAVE
// ============================================================================

/**
 * Returns a reminder if context hasn't been saved recently.
 * Use this to nudge agents to save context during long sessions.
 */
export function checkContextFreshness(sessionId: string): {
  needsSave: boolean;
  lastSaved: string | null;
  minutesSinceLastSave: number | null;
  suggestion: string;
} {
  const pauseState = getPauseState(sessionId);

  if (!pauseState) {
    return {
      needsSave: true,
      lastSaved: null,
      minutesSinceLastSave: null,
      suggestion:
        "No context has been saved for this session. Consider calling save_context_snapshot to preserve current state.",
    };
  }

  const lastSaved = new Date(pauseState.createdAt);
  const minutesSince = Math.floor(
    (Date.now() - lastSaved.getTime()) / 1000 / 60
  );

  if (minutesSince > 30) {
    return {
      needsSave: true,
      lastSaved: pauseState.createdAt,
      minutesSinceLastSave: minutesSince,
      suggestion: `Context is ${minutesSince} minutes old. Consider a quick save_context_snapshot to capture recent developments.`,
    };
  }

  return {
    needsSave: false,
    lastSaved: pauseState.createdAt,
    minutesSinceLastSave: minutesSince,
    suggestion: "Context is fresh - no immediate save needed.",
  };
}

// ============================================================================
// EXTERNAL UPDATES - Multi-agent collaboration
// ============================================================================

export interface PushUpdateParams {
  sessionId: string;
  sourceAgent: string;
  sourceDescription?: string;
  updateType: string;
  category?: string;
  title: string;
  content: string;
  structuredData?: Record<string, unknown>;
  targetEntityId?: string;
  targetEntityType?: string;
  priority?: "low" | "normal" | "high" | "urgent";
}

/**
 * Push an update from an external agent (research agent, worldbuilder, etc.)
 * The primary DM agent will receive this update and can incorporate it.
 */
export function pushExternalUpdate(params: PushUpdateParams): ExternalUpdate {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO external_updates (
      id, session_id,
      source_agent, source_description,
      update_type, category, title, content, structured_data,
      target_entity_id, target_entity_type,
      priority, status, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `);

  stmt.run(
    id,
    params.sessionId,
    params.sourceAgent,
    params.sourceDescription || null,
    params.updateType,
    params.category || null,
    params.title,
    params.content,
    params.structuredData ? JSON.stringify(params.structuredData) : null,
    params.targetEntityId || null,
    params.targetEntityType || null,
    params.priority || "normal",
    now
  );

  return {
    id,
    sessionId: params.sessionId,
    sourceAgent: params.sourceAgent,
    sourceDescription: params.sourceDescription || null,
    updateType: params.updateType,
    category: params.category || null,
    title: params.title,
    content: params.content,
    structuredData: params.structuredData || null,
    targetEntityId: params.targetEntityId || null,
    targetEntityType: params.targetEntityType || null,
    priority: params.priority || "normal",
    status: "pending",
    createdAt: now,
    acknowledgedAt: null,
    appliedAt: null,
    dmNotes: null,
  };
}

/**
 * Get all pending updates for a session.
 * Call this to check for new information from external agents.
 */
export function getPendingUpdates(sessionId: string): PendingUpdatesResult {
  const db = getDatabase();

  const rows = db
    .prepare(
      `SELECT * FROM external_updates
       WHERE session_id = ? AND status = 'pending'
       ORDER BY
         CASE priority
           WHEN 'urgent' THEN 1
           WHEN 'high' THEN 2
           WHEN 'normal' THEN 3
           WHEN 'low' THEN 4
         END,
         created_at DESC`
    )
    .all(sessionId) as Record<string, unknown>[];

  const updates: ExternalUpdate[] = rows.map((row) => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    sourceAgent: row.source_agent as string,
    sourceDescription: row.source_description as string | null,
    updateType: row.update_type as string,
    category: row.category as string | null,
    title: row.title as string,
    content: row.content as string,
    structuredData: row.structured_data
      ? JSON.parse(row.structured_data as string)
      : null,
    targetEntityId: row.target_entity_id as string | null,
    targetEntityType: row.target_entity_type as string | null,
    priority: row.priority as ExternalUpdate["priority"],
    status: row.status as ExternalUpdate["status"],
    createdAt: row.created_at as string,
    acknowledgedAt: row.acknowledged_at as string | null,
    appliedAt: row.applied_at as string | null,
    dmNotes: row.dm_notes as string | null,
  }));

  const urgentCount = updates.filter((u) => u.priority === "urgent").length;

  let suggestion = "";
  if (urgentCount > 0) {
    suggestion = `⚠️ ${urgentCount} URGENT update(s) require immediate attention!`;
  } else if (updates.length > 0) {
    suggestion = `${updates.length} pending update(s) from external agents. Review and incorporate as appropriate.`;
  } else {
    suggestion = "No pending updates from external agents.";
  }

  return {
    sessionId,
    pendingCount: updates.length,
    urgentCount,
    updates,
    hasUrgent: urgentCount > 0,
    suggestion,
  };
}

/**
 * Acknowledge an update (mark as seen by DM).
 */
export function acknowledgeUpdate(updateId: string): ExternalUpdate | null {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE external_updates SET status = 'acknowledged', acknowledged_at = ? WHERE id = ?`
  ).run(now, updateId);

  return getExternalUpdate(updateId);
}

/**
 * Mark an update as applied (incorporated into the narrative).
 */
export function applyUpdate(
  updateId: string,
  dmNotes?: string
): ExternalUpdate | null {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE external_updates
     SET status = 'applied', applied_at = ?, dm_notes = COALESCE(?, dm_notes)
     WHERE id = ?`
  ).run(now, dmNotes || null, updateId);

  return getExternalUpdate(updateId);
}

/**
 * Reject an update (not appropriate for the narrative).
 */
export function rejectUpdate(
  updateId: string,
  dmNotes?: string
): ExternalUpdate | null {
  const db = getDatabase();

  db.prepare(
    `UPDATE external_updates
     SET status = 'rejected', dm_notes = COALESCE(?, dm_notes)
     WHERE id = ?`
  ).run(dmNotes || null, updateId);

  return getExternalUpdate(updateId);
}

/**
 * Get a specific external update by ID.
 */
export function getExternalUpdate(updateId: string): ExternalUpdate | null {
  const db = getDatabase();
  const row = db
    .prepare(`SELECT * FROM external_updates WHERE id = ?`)
    .get(updateId) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    sourceAgent: row.source_agent as string,
    sourceDescription: row.source_description as string | null,
    updateType: row.update_type as string,
    category: row.category as string | null,
    title: row.title as string,
    content: row.content as string,
    structuredData: row.structured_data
      ? JSON.parse(row.structured_data as string)
      : null,
    targetEntityId: row.target_entity_id as string | null,
    targetEntityType: row.target_entity_type as string | null,
    priority: row.priority as ExternalUpdate["priority"],
    status: row.status as ExternalUpdate["status"],
    createdAt: row.created_at as string,
    acknowledgedAt: row.acknowledged_at as string | null,
    appliedAt: row.applied_at as string | null,
    dmNotes: row.dm_notes as string | null,
  };
}

/**
 * List all updates for a session with optional status filter.
 */
export function listExternalUpdates(
  sessionId: string,
  status?: ExternalUpdate["status"]
): ExternalUpdate[] {
  const db = getDatabase();

  let query = `SELECT * FROM external_updates WHERE session_id = ?`;
  const params: (string | undefined)[] = [sessionId];

  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }

  query += ` ORDER BY created_at DESC`;

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    sourceAgent: row.source_agent as string,
    sourceDescription: row.source_description as string | null,
    updateType: row.update_type as string,
    category: row.category as string | null,
    title: row.title as string,
    content: row.content as string,
    structuredData: row.structured_data
      ? JSON.parse(row.structured_data as string)
      : null,
    targetEntityId: row.target_entity_id as string | null,
    targetEntityType: row.target_entity_type as string | null,
    priority: row.priority as ExternalUpdate["priority"],
    status: row.status as ExternalUpdate["status"],
    createdAt: row.created_at as string,
    acknowledgedAt: row.acknowledged_at as string | null,
    appliedAt: row.applied_at as string | null,
    dmNotes: row.dm_notes as string | null,
  }));
}

/**
 * Delete an external update.
 */
export function deleteExternalUpdate(updateId: string): boolean {
  const db = getDatabase();
  const result = db
    .prepare(`DELETE FROM external_updates WHERE id = ?`)
    .run(updateId);
  return result.changes > 0;
}
