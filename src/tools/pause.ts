import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import { safeJsonParse } from "../utils/json.js";
import type {
  PauseState,
  PauseChecklist,
  PauseChecklistItem,
  GameStateAudit,
  PersistenceReminder,
  ResumeContext,
  NarrativeThread,
  ActiveConversation,
  Game,
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
 * Prepares for a game pause by returning current state, a comprehensive
 * game state audit, persistence reminders, and a checklist of context
 * that should be saved. This helps agents understand what needs to be
 * captured before ending a game.
 */
export function preparePause(gameId: string): PauseChecklist | null {
  const db = getDatabase();

  // Get game
  const gameRow = db
    .prepare(`SELECT * FROM games WHERE id = ?`)
    .get(gameId) as Record<string, unknown> | undefined;

  if (!gameRow) return null;

  // ============================================================================
  // COMPREHENSIVE GAME STATE AUDIT
  // ============================================================================

  // Characters
  const characterStats = db
    .prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_player = 1 THEN 1 ELSE 0 END) as players,
        SUM(CASE WHEN is_player = 0 THEN 1 ELSE 0 END) as npcs,
        SUM(CASE WHEN notes IS NOT NULL AND notes != '' THEN 1 ELSE 0 END) as with_notes
      FROM characters WHERE game_id = ?
    `)
    .get(gameId) as { total: number; players: number; npcs: number; with_notes: number };

  // Characters with conditions
  const charactersWithConditions = db
    .prepare(`
      SELECT COUNT(DISTINCT c.id) as count
      FROM characters c
      JOIN status_effects se ON se.target_id = c.id
      WHERE c.game_id = ?
    `)
    .get(gameId) as { count: number };

  // Locations
  const locationStats = db
    .prepare(`SELECT COUNT(*) as total FROM locations WHERE game_id = ?`)
    .get(gameId) as { total: number };

  // Count locations that have exits (exits are stored in properties JSON)
  const locationRows = db
    .prepare(`SELECT properties FROM locations WHERE game_id = ?`)
    .all(gameId) as { properties: string }[];

  let connectedCount = 0;
  for (const row of locationRows) {
    const props = safeJsonParse<{ exits?: unknown[] }>(row.properties, { exits: [] });
    if (props.exits && props.exits.length > 0) {
      connectedCount++;
    }
  }
  const connectedLocations = { count: connectedCount };

  // Quests
  const questStats = db
    .prepare(`
      SELECT
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM quests WHERE game_id = ?
    `)
    .get(gameId) as { active: number; completed: number; failed: number };

  // Items
  const itemStats = db
    .prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN owner_type = 'character' THEN 1 ELSE 0 END) as in_inventories,
        SUM(CASE WHEN owner_type = 'location' THEN 1 ELSE 0 END) as in_locations
      FROM items WHERE game_id = ?
    `)
    .get(gameId) as { total: number; in_inventories: number; in_locations: number };

  // Combat
  const combatRow = db
    .prepare(`SELECT * FROM combats WHERE game_id = ? AND status = 'active' LIMIT 1`)
    .get(gameId) as Record<string, unknown> | undefined;

  // Resources
  const resourceStats = db
    .prepare(`
      SELECT
        SUM(CASE WHEN owner_type = 'game' THEN 1 ELSE 0 END) as game_level,
        SUM(CASE WHEN owner_type = 'character' THEN 1 ELSE 0 END) as character_level
      FROM resources WHERE game_id = ?
    `)
    .get(gameId) as { game_level: number; character_level: number };

  // Timers
  const timerStats = db
    .prepare(`
      SELECT
        SUM(CASE WHEN triggered = 0 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN triggered = 1 THEN 1 ELSE 0 END) as triggered
      FROM timers WHERE game_id = ?
    `)
    .get(gameId) as { active: number; triggered: number };

  // Scheduled events
  const eventStats = db
    .prepare(`
      SELECT
        SUM(CASE WHEN triggered = 0 THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN triggered = 1 THEN 1 ELSE 0 END) as triggered
      FROM scheduled_events WHERE game_id = ?
    `)
    .get(gameId) as { pending: number; triggered: number };

  // Relationships
  const relationshipCount = db
    .prepare(`SELECT COUNT(*) as count FROM relationships WHERE game_id = ?`)
    .get(gameId) as { count: number };

  // Secrets
  const secretStats = db
    .prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_public = 1 THEN 1 ELSE 0 END) as revealed
      FROM secrets WHERE game_id = ?
    `)
    .get(gameId) as { total: number; revealed: number };

  // Factions
  const factionStats = db
    .prepare(`
      SELECT
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'disbanded' THEN 1 ELSE 0 END) as disbanded
      FROM factions WHERE game_id = ?
    `)
    .get(gameId) as { active: number; disbanded: number };

  // Abilities
  const abilityStats = db
    .prepare(`
      SELECT
        SUM(CASE WHEN owner_type = 'template' THEN 1 ELSE 0 END) as templates,
        SUM(CASE WHEN owner_type = 'character' THEN 1 ELSE 0 END) as character_owned
      FROM abilities WHERE game_id = ?
    `)
    .get(gameId) as { templates: number; character_owned: number };

  // Notes
  const noteStats = db
    .prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN pinned = 1 THEN 1 ELSE 0 END) as pinned
      FROM notes WHERE game_id = ?
    `)
    .get(gameId) as { total: number; pinned: number };

  // Status effects
  const statusStats = db
    .prepare(`
      SELECT
        COUNT(*) as count,
        COUNT(DISTINCT target_id) as affected
      FROM status_effects se
      JOIN characters c ON c.id = se.target_id
      WHERE c.game_id = ?
    `)
    .get(gameId) as { count: number; affected: number };

  // Tags
  const tagCount = db
    .prepare(`SELECT COUNT(DISTINCT tag) as count FROM tags WHERE game_id = ?`)
    .get(gameId) as { count: number };

  // Random tables
  const tableCount = db
    .prepare(`SELECT COUNT(*) as count FROM random_tables WHERE game_id = ?`)
    .get(gameId) as { count: number };

  // Narrative events
  const narrativeStats = db
    .prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN timestamp > datetime('now', '-1 hour') THEN 1 ELSE 0 END) as recent_hour
      FROM narrative_events WHERE game_id = ?
    `)
    .get(gameId) as { total: number; recent_hour: number };

  // Images
  const imageCount = db
    .prepare(`SELECT COUNT(*) as count FROM stored_images WHERE game_id = ?`)
    .get(gameId) as { count: number };

  // Calendar/Time
  const calendarRow = db
    .prepare(`SELECT * FROM game_time WHERE game_id = ?`)
    .get(gameId) as Record<string, unknown> | undefined;

  // Get current location name
  let playerLocation: string | null = null;
  if (gameRow.current_location_id) {
    const locRow = db
      .prepare(`SELECT name FROM locations WHERE id = ?`)
      .get(gameRow.current_location_id) as { name: string } | undefined;
    playerLocation = locRow?.name || null;
  }

  // Build the game state audit
  const gameStateAudit: GameStateAudit = {
    characters: {
      total: characterStats.total || 0,
      players: characterStats.players || 0,
      npcs: characterStats.npcs || 0,
      withNotes: characterStats.with_notes || 0,
      withConditions: charactersWithConditions.count || 0,
    },
    locations: {
      total: locationStats.total || 0,
      connected: connectedLocations.count || 0,
    },
    quests: {
      active: questStats.active || 0,
      completed: questStats.completed || 0,
      failed: questStats.failed || 0,
    },
    items: {
      total: itemStats.total || 0,
      inInventories: itemStats.in_inventories || 0,
      inLocations: itemStats.in_locations || 0,
    },
    combat: {
      active: !!combatRow,
      combatId: combatRow?.id as string | null || null,
      round: combatRow?.round as number | null || null,
      participantCount: combatRow
        ? (JSON.parse((combatRow.participants as string) || "[]")).length
        : 0,
    },
    resources: {
      gameLevel: resourceStats.game_level || 0,
      characterLevel: resourceStats.character_level || 0,
    },
    timers: {
      active: timerStats.active || 0,
      triggered: timerStats.triggered || 0,
    },
    scheduledEvents: {
      pending: eventStats.pending || 0,
      triggered: eventStats.triggered || 0,
    },
    relationships: {
      total: relationshipCount.count || 0,
    },
    secrets: {
      total: secretStats.total || 0,
      revealed: secretStats.revealed || 0,
      hidden: (secretStats.total || 0) - (secretStats.revealed || 0),
    },
    factions: {
      active: factionStats.active || 0,
      disbanded: factionStats.disbanded || 0,
    },
    abilities: {
      templates: abilityStats.templates || 0,
      characterOwned: abilityStats.character_owned || 0,
    },
    notes: {
      total: noteStats.total || 0,
      pinned: noteStats.pinned || 0,
    },
    statusEffects: {
      activeCount: statusStats.count || 0,
      affectedCharacters: statusStats.affected || 0,
    },
    tags: {
      uniqueTags: tagCount.count || 0,
    },
    randomTables: {
      total: tableCount.count || 0,
    },
    narrativeEvents: {
      total: narrativeStats.total || 0,
      recentHour: narrativeStats.recent_hour || 0,
    },
    images: {
      total: imageCount.count || 0,
    },
    time: {
      hasCalendar: !!calendarRow,
      currentTime: calendarRow
        ? JSON.stringify(safeJsonParse(calendarRow.current_time as string, null))
        : null,
    },
  };

  // ============================================================================
  // PERSISTENCE REMINDERS
  // ============================================================================

  const persistenceReminders: PersistenceReminder[] = [];

  // CRITICAL: Active combat must be resolved or saved
  if (gameStateAudit.combat.active) {
    persistenceReminders.push({
      category: "critical",
      entityType: "combat",
      tool: "end_combat OR get_combat",
      reminder: "ACTIVE COMBAT IN PROGRESS",
      reason: `Combat is active (Round ${gameStateAudit.combat.round}). Either resolve it before pausing or ensure the full combat state is captured in your pause notes.`,
      entityIds: [gameStateAudit.combat.combatId!],
    });
  }

  // CRITICAL: Status effects that may expire
  if (gameStateAudit.statusEffects.activeCount > 0) {
    persistenceReminders.push({
      category: "critical",
      entityType: "status_effects",
      tool: "list_status_effects",
      reminder: "Active status effects on characters",
      reason: `${gameStateAudit.statusEffects.activeCount} status effect(s) on ${gameStateAudit.statusEffects.affectedCharacters} character(s). Note any that are narratively important.`,
    });
  }

  // IMPORTANT: Recent narrative events should be logged
  if (narrativeStats.recent_hour === 0) {
    persistenceReminders.push({
      category: "important",
      entityType: "narrative_events",
      tool: "log_event",
      reminder: "No events logged in the last hour",
      reason: "Consider logging key story moments before pausing. This helps with recaps and continuity.",
    });
  }

  // IMPORTANT: Active timers need context
  if (gameStateAudit.timers.active > 0) {
    persistenceReminders.push({
      category: "important",
      entityType: "timers",
      tool: "list_timers",
      reminder: "Active timers running",
      reason: `${gameStateAudit.timers.active} timer(s) are active. Document their narrative significance in your pause state.`,
    });
  }

  // IMPORTANT: Pending scheduled events
  if (gameStateAudit.scheduledEvents.pending > 0) {
    persistenceReminders.push({
      category: "important",
      entityType: "scheduled_events",
      tool: "list_scheduled_events",
      reminder: "Pending scheduled events",
      reason: `${gameStateAudit.scheduledEvents.pending} event(s) are scheduled. Note any that are imminent.`,
    });
  }

  // IMPORTANT: Characters without notes
  if (gameStateAudit.characters.npcs > 0 && gameStateAudit.characters.withNotes < gameStateAudit.characters.npcs) {
    const npcsWithoutNotes = gameStateAudit.characters.npcs - gameStateAudit.characters.withNotes;
    if (npcsWithoutNotes > 0) {
      persistenceReminders.push({
        category: "suggested",
        entityType: "characters",
        tool: "update_character",
        reminder: "NPCs missing character notes",
        reason: `${npcsWithoutNotes} NPC(s) have no notes. Consider updating notes for NPCs the player interacted with.`,
      });
    }
  }

  // SUGGESTED: Quest progress
  if (gameStateAudit.quests.active > 0) {
    persistenceReminders.push({
      category: "suggested",
      entityType: "quests",
      tool: "complete_objective OR update_quest",
      reminder: "Review active quest progress",
      reason: `${gameStateAudit.quests.active} quest(s) active. Update objectives if any were completed or failed.`,
    });
  }

  // SUGGESTED: Relationship changes
  if (gameStateAudit.relationships.total > 0) {
    persistenceReminders.push({
      category: "suggested",
      entityType: "relationships",
      tool: "modify_relationship",
      reminder: "Update relationship values if attitudes changed",
      reason: `${gameStateAudit.relationships.total} relationship(s) tracked. Adjust values if NPCs' feelings toward the player changed.`,
    });
  }

  // SUGGESTED: Secrets revealed or discovered
  if (gameStateAudit.secrets.hidden > 0) {
    persistenceReminders.push({
      category: "suggested",
      entityType: "secrets",
      tool: "reveal_secret",
      reminder: "Update secrets if any were discovered",
      reason: `${gameStateAudit.secrets.hidden} secret(s) still hidden. Mark any as revealed if the player discovered them.`,
    });
  }

  // SUGGESTED: Resources changed
  if (gameStateAudit.resources.gameLevel + gameStateAudit.resources.characterLevel > 0) {
    persistenceReminders.push({
      category: "suggested",
      entityType: "resources",
      tool: "modify_resource",
      reminder: "Update resources if any changed",
      reason: "Review gold, reputation, or other tracked resources for changes during the game.",
    });
  }

  // SUGGESTED: Items gained or lost
  if (gameStateAudit.items.total > 0) {
    persistenceReminders.push({
      category: "suggested",
      entityType: "items",
      tool: "create_item OR transfer_item OR delete_item",
      reminder: "Update inventory for items gained/lost",
      reason: "Ensure any items picked up, dropped, or used are reflected in the game state.",
    });
  }

  // SUGGESTED: Create a DM note for the game
  persistenceReminders.push({
    category: "suggested",
    entityType: "notes",
    tool: "create_note",
    reminder: "Consider creating a game recap note",
    reason: "A pinned recap note can help with continuity across sessions.",
  });

  // SUGGESTED: Update the in-game time
  if (gameStateAudit.time.hasCalendar) {
    persistenceReminders.push({
      category: "suggested",
      entityType: "time",
      tool: "advance_time OR set_time",
      reminder: "Update the in-game calendar",
      reason: "Ensure the in-game time reflects how much time passed during this game.",
    });
  }

  // Check for existing pause state
  const existingPause = getPauseState(gameId);

  // Build the ephemeral context checklist
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

  // Build comprehensive instructions
  const criticalCount = persistenceReminders.filter(r => r.category === "critical").length;
  const importantCount = persistenceReminders.filter(r => r.category === "important").length;

  const instructions = `
═══════════════════════════════════════════════════════════════════════════════
                           PAUSE PREPARATION CHECKLIST
═══════════════════════════════════════════════════════════════════════════════

This checklist helps you persist EVERYTHING before ending the game.

${criticalCount > 0 ? `⚠️  ${criticalCount} CRITICAL item(s) require immediate attention!` : ""}
${importantCount > 0 ? `📋 ${importantCount} IMPORTANT item(s) should be reviewed.` : ""}

═══════════════════════════════════════════════════════════════════════════════
                              STEP 1: PERSIST GAME DATA
═══════════════════════════════════════════════════════════════════════════════

Review the PERSISTENCE REMINDERS section. These are things that exist in the
database but may need updating based on what happened during play:

  ${persistenceReminders.filter(r => r.category === "critical").map(r => `🔴 [CRITICAL] ${r.reminder}`).join("\n  ") || "No critical items"}
  ${persistenceReminders.filter(r => r.category === "important").map(r => `🟡 [IMPORTANT] ${r.reminder}`).join("\n  ") || "No important items"}
  ${persistenceReminders.filter(r => r.category === "suggested").map(r => `🟢 [SUGGESTED] ${r.reminder}`).join("\n  ") || "No suggestions"}

═══════════════════════════════════════════════════════════════════════════════
                              STEP 2: SAVE DM CONTEXT
═══════════════════════════════════════════════════════════════════════════════

After persisting game data, call save_pause_state with your ephemeral context.
This captures what's in your "head" that ISN'T in the database:

REQUIRED:
  • currentScene - Where we are in the story
  • immediateSituation - What's happening RIGHT NOW (be specific!)

OPTIONAL (fill in what's relevant):
  • Scene atmosphere, tone, pending player actions
  • Active narrative threads and DM plans
  • NPC attitudes and ongoing conversations
  • Player goals and unresolved plot hooks

TIPS:
  • Be specific about the EXACT moment - "hand on door handle" not "at the door"
  • Capture emotional states and atmosphere for resumption
  • Note what YOU were planning, not just what happened
  • Write as if briefing a replacement DM mid-session

═══════════════════════════════════════════════════════════════════════════════
                              STEP 3: VERIFY
═══════════════════════════════════════════════════════════════════════════════

After saving, the game can be resumed using get_resume_context which will
provide the next DM (or you in a new context window) with everything needed
to continue seamlessly.

═══════════════════════════════════════════════════════════════════════════════
`.trim();

  return {
    gameId,
    gameName: gameRow.name as string,
    currentState: {
      playerLocation,
      activeQuests: questStats.active || 0,
      activeCombat: !!combatRow,
      activeTimers: timerStats.active || 0,
      pendingEvents: eventStats.pending || 0,
      recentEventCount: narrativeStats.recent_hour || 0,
    },
    gameStateAudit,
    persistenceReminders,
    checklist,
    existingPauseState: existingPause,
    instructions,
  };
}

// ============================================================================
// SAVE PAUSE STATE
// ============================================================================

export interface SavePauseStateParams {
  gameId: string;

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
  db.prepare(`DELETE FROM pause_states WHERE game_id = ?`).run(
    params.gameId
  );

  const stmt = db.prepare(`
    INSERT INTO pause_states (
      id, game_id,
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
    params.gameId,
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
    INSERT INTO narrative_events (id, game_id, event_type, content, metadata, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  eventStmt.run(
    uuidv4(),
    params.gameId,
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
    gameId: params.gameId,
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

export function getPauseState(gameId: string): PauseState | null {
  const db = getDatabase();
  const row = db
    .prepare(`SELECT * FROM pause_states WHERE game_id = ?`)
    .get(gameId) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    gameId: row.game_id as string,
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
export function getResumeContext(gameId: string): ResumeContext | null {
  const db = getDatabase();

  // Get pause state
  const pauseState = getPauseState(gameId);
  if (!pauseState) return null;

  // Get game
  const gameRow = db
    .prepare(`SELECT * FROM games WHERE id = ?`)
    .get(gameId) as Record<string, unknown> | undefined;

  if (!gameRow) return null;

  const game: Game = {
    id: gameRow.id as string,
    name: gameRow.name as string,
    setting: gameRow.setting as string,
    style: gameRow.style as string,
    rules: gameRow.rules ? JSON.parse(gameRow.rules as string) : null,
    preferences: gameRow.preferences
      ? JSON.parse(gameRow.preferences as string)
      : null,
    currentLocationId: gameRow.current_location_id as string | null,
    titleImageId: gameRow.title_image_id as string | null,
    faviconImageId: gameRow.favicon_image_id as string | null,
    createdAt: gameRow.created_at as string,
    updatedAt: gameRow.updated_at as string,
  };

  // Get player character
  const playerRow = db
    .prepare(
      `SELECT * FROM characters WHERE game_id = ? AND is_player = 1 LIMIT 1`
    )
    .get(gameId) as Record<string, unknown> | undefined;

  const playerCharacter: Character | null = playerRow
    ? {
        id: playerRow.id as string,
        gameId: playerRow.game_id as string,
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
  const locationRow = game.currentLocationId
    ? (db
        .prepare(`SELECT * FROM locations WHERE id = ?`)
        .get(game.currentLocationId) as Record<string, unknown> | undefined)
    : null;

  const currentLocation: Location | null = locationRow
    ? {
        id: locationRow.id as string,
        gameId: locationRow.game_id as string,
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
      `SELECT * FROM quests WHERE game_id = ? AND status = 'active'`
    )
    .all(gameId) as Record<string, unknown>[];

  const activeQuests: Quest[] = questRows.map((row) => ({
    id: row.id as string,
    gameId: row.game_id as string,
    name: row.name as string,
    description: row.description as string,
    objectives: JSON.parse((row.objectives as string) || "[]"),
    status: row.status as Quest["status"],
    rewards: row.rewards as string | undefined,
  }));

  // Get active combat
  const combatRow = db
    .prepare(
      `SELECT * FROM combats WHERE game_id = ? AND status = 'active' LIMIT 1`
    )
    .get(gameId) as Record<string, unknown> | undefined;

  const activeCombat: Combat | null = combatRow
    ? {
        id: combatRow.id as string,
        gameId: combatRow.game_id as string,
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
      `SELECT * FROM narrative_events WHERE game_id = ? ORDER BY timestamp DESC LIMIT 10`
    )
    .all(gameId) as Record<string, unknown>[];

  const recentEvents: NarrativeEvent[] = eventRows.map((row) => ({
    id: row.id as string,
    gameId: row.game_id as string,
    eventType: row.event_type as string,
    content: row.content as string,
    metadata: JSON.parse((row.metadata as string) || "{}"),
    timestamp: row.timestamp as string,
  }));

  // Get active timers
  const timerRows = db
    .prepare(
      `SELECT * FROM timers WHERE game_id = ? AND triggered = 0`
    )
    .all(gameId) as Record<string, unknown>[];

  const activeTimers: Timer[] = timerRows.map((row) => ({
    id: row.id as string,
    gameId: row.game_id as string,
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
      `SELECT * FROM scheduled_events WHERE game_id = ? AND triggered = 0`
    )
    .all(gameId) as Record<string, unknown>[];

  const pendingScheduledEvents: ScheduledEvent[] = scheduledRows.map((row) => ({
    id: row.id as string,
    gameId: row.game_id as string,
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

GAME: ${game.name}
SETTING: ${game.setting} (${game.style})
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
      game,
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
  gameId: string;
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
  const existing = getPauseState(params.gameId);

  if (existing) {
    // Update volatile fields only
    const stmt = db.prepare(`
      UPDATE pause_states SET
        immediate_situation = ?,
        player_apparent_goals = COALESCE(?, player_apparent_goals),
        npc_attitudes = COALESCE(?, npc_attitudes),
        created_at = ?
      WHERE game_id = ?
    `);

    stmt.run(
      params.situation,
      params.playerIntent,
      params.npcMood ? JSON.stringify(params.npcMood) : null,
      new Date().toISOString(),
      params.gameId
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
        id, game_id,
        current_scene, immediate_situation,
        player_apparent_goals, npc_attitudes,
        active_threads, upcoming_reveals, active_conversations, unresolved_hooks,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, '[]', '[]', '[]', '[]', ?)
    `);

    stmt.run(
      id,
      params.gameId,
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
        "Consider using prepare_pause and save_pause_state before ending the game for a complete save.",
    };
  }
}

// ============================================================================
// DELETE PAUSE STATE
// ============================================================================

export function deletePauseState(gameId: string): boolean {
  const db = getDatabase();
  const result = db
    .prepare(`DELETE FROM pause_states WHERE game_id = ?`)
    .run(gameId);
  return result.changes > 0;
}

// ============================================================================
// CHECK IF CONTEXT NEEDS SAVE
// ============================================================================

/**
 * Returns a reminder if context hasn't been saved recently.
 * Use this to nudge agents to save context during long sessions.
 */
export function checkContextFreshness(gameId: string): {
  needsSave: boolean;
  lastSaved: string | null;
  minutesSinceLastSave: number | null;
  suggestion: string;
} {
  const pauseState = getPauseState(gameId);

  if (!pauseState) {
    return {
      needsSave: true,
      lastSaved: null,
      minutesSinceLastSave: null,
      suggestion:
        "No context has been saved for this game. Consider calling save_context_snapshot to preserve current state.",
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
  gameId: string;
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
      id, game_id,
      source_agent, source_description,
      update_type, category, title, content, structured_data,
      target_entity_id, target_entity_type,
      priority, status, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `);

  stmt.run(
    id,
    params.gameId,
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
    gameId: params.gameId,
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
 * Get all pending updates for a game.
 * Call this to check for new information from external agents.
 */
export function getPendingUpdates(gameId: string): PendingUpdatesResult {
  const db = getDatabase();

  const rows = db
    .prepare(
      `SELECT * FROM external_updates
       WHERE game_id = ? AND status = 'pending'
       ORDER BY
         CASE priority
           WHEN 'urgent' THEN 1
           WHEN 'high' THEN 2
           WHEN 'normal' THEN 3
           WHEN 'low' THEN 4
         END,
         created_at DESC`
    )
    .all(gameId) as Record<string, unknown>[];

  const updates: ExternalUpdate[] = rows.map((row) => ({
    id: row.id as string,
    gameId: row.game_id as string,
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
    gameId,
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
    gameId: row.game_id as string,
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
 * List all updates for a game with optional status filter.
 */
export function listExternalUpdates(
  gameId: string,
  status?: ExternalUpdate["status"]
): ExternalUpdate[] {
  const db = getDatabase();

  let query = `SELECT * FROM external_updates WHERE game_id = ?`;
  const params: (string | undefined)[] = [gameId];

  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }

  query += ` ORDER BY created_at DESC`;

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as string,
    gameId: row.game_id as string,
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
