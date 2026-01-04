# DMCP Improvement Plan

Audit completed 2026-01-03. This document outlines improvements across three dimensions:
- **UX** (User Experience) - Web UI for players
- **DX** (Developer Experience) - Codebase maintainability
- **AgentX** (Agent Experience) - AI agent tool ergonomics

---

## Executive Summary

| Dimension | Current State | Key Gaps |
|-----------|---------------|----------|
| **UX** | Functional but basic | No error states, limited interactivity, accessibility gaps |
| **DX** | Well-structured but missing infrastructure | Zero tests, no linting, no CI/CD, code duplication |
| **AgentX** | Comprehensive tools (~170) | Verbose outputs, no batch operations, inconsistent naming |

---

## 1. User Experience (UX) Improvements

### 1.1 Critical Issues

#### A. Error Handling & Feedback
**Current:** Errors silently return empty arrays/null, no user-visible feedback
**Location:** `client/src/composables/useApi.ts`

```typescript
// Current pattern - errors are swallowed
catch (e) {
  error.value = (e as Error).message  // Set but not displayed
  return []  // User sees empty state, not error
}
```

**Improvements:**
- [ ] Add error toast/notification component
- [ ] Display contextual error messages ("Game not found" vs generic "Error")
- [ ] Add retry buttons for failed requests
- [ ] Implement error boundaries for component crashes

#### B. Loading States
**Current:** Basic `loading` ref, inconsistent skeleton usage
**Improvements:**
- [ ] Consistent skeleton loaders for all views
- [ ] Progressive loading for large datasets
- [ ] Optimistic updates for better perceived performance

#### C. Accessibility (a11y)
**Current:** No visible a11y considerations
**Improvements:**
- [ ] Add ARIA labels to interactive elements
- [ ] Ensure keyboard navigation works everywhere
- [ ] Add skip links for main content
- [ ] Ensure color contrast meets WCAG AA
- [ ] Screen reader announcements for dynamic content

### 1.2 Medium Priority

#### A. Theme Switching
**Current:** Themes exist in code but no UI toggle
**Location:** `client/src/composables/useTheme.ts`
**Improvements:**
- [ ] Add theme picker in settings
- [ ] System preference detection (prefers-color-scheme)
- [ ] Per-game theme preview

#### B. Mobile Experience
**Current:** Basic responsive design
**Improvements:**
- [ ] Test and fix mobile breakpoints
- [ ] Touch-friendly tap targets
- [ ] Swipe gestures for navigation
- [ ] Collapsible sidebar navigation

#### C. Enhanced Footer
**Current:** `client/src/components/AppFooter.vue` - Just text
**Improvements:**
- [ ] Add helpful links (GitHub, docs)
- [ ] Version display
- [ ] Connection status indicator
- [ ] Quick actions

### 1.3 Nice-to-Have

- [ ] PWA support for offline viewing
- [ ] Image lazy loading with blur-up placeholders
- [ ] Infinite scroll for history/events
- [ ] Keyboard shortcuts help modal
- [ ] Print-friendly character sheets
- [ ] Export game data (PDF, JSON)

---

## 2. Developer Experience (DX) Improvements

### 2.1 Critical: Testing Infrastructure

**Current State:** Zero tests in the project

#### A. Unit Tests
```bash
# Recommended setup
npm install -D vitest @testing-library/vue happy-dom
```

**Priority test targets:**
- [ ] `src/tools/*.ts` - Core business logic
- [ ] `src/db/schema.ts` - Schema migrations
- [ ] `src/utils/*.ts` - Utility functions
- [ ] `client/src/composables/*.ts` - Vue composables

#### B. Integration Tests
- [ ] HTTP API endpoint tests
- [ ] MCP tool round-trip tests
- [ ] Database transaction tests

#### C. E2E Tests
```bash
# Playwright for browser testing
npm install -D @playwright/test
```
- [ ] Critical user flows (view game, navigate, search)

### 2.2 Critical: Code Quality Tools

#### A. Linting & Formatting
```json
// Add to package.json devDependencies
"eslint": "^8.0.0",
"@typescript-eslint/eslint-plugin": "^7.0.0",
"prettier": "^3.0.0"
```

**Files to create:**
- [ ] `.eslintrc.js` - ESLint configuration
- [ ] `.prettierrc` - Prettier configuration
- [ ] `lint-staged.config.js` - Pre-commit linting

#### B. Pre-commit Hooks
```bash
npm install -D husky lint-staged
npx husky install
```
- [ ] Run linting on staged files
- [ ] Run type checking
- [ ] Run affected tests

### 2.3 High Priority: CI/CD

#### A. GitHub Actions Workflow
**Create:** `.github/workflows/ci.yml`
```yaml
# Suggested workflow
- Type check (tsc --noEmit)
- Lint (eslint)
- Unit tests (vitest)
- Build verification
- E2E tests (on PR)
```

#### B. Automated Release
- [ ] Version bumping
- [ ] Changelog generation
- [ ] npm publish workflow

### 2.4 Medium Priority: Code Organization

#### A. Reduce Code Duplication in useApi.ts
**Current:** 330 lines with repetitive try/catch/finally
**Improvement:** Generic request wrapper

```typescript
// Proposed refactor
async function apiRequest<T>(
  url: string,
  fallback: T
): Promise<T> {
  loading.value = true
  error.value = null
  try {
    return await fetchJson<T>(url)
  } catch (e) {
    error.value = (e as Error).message
    return fallback
  } finally {
    loading.value = false
  }
}

// Usage becomes:
const getGame = (id: string) => apiRequest<GameState | null>(
  `${API_BASE}/games/${id}`,
  null
)
```

#### B. Split Large Files
| File | Size | Suggested Split |
|------|------|-----------------|
| `src/register/core.ts` | 47KB | `game.ts`, `rules.ts`, `preferences.ts`, `presets.ts` |
| `src/http/server.ts` | 800+ lines | `routes/games.ts`, `routes/characters.ts`, `routes/images.ts` |
| `src/tools/pause.ts` | 56KB | `pause.ts`, `context.ts`, `external-updates.ts` |

#### C. Documentation
- [ ] `DEVELOPMENT.md` - Setup instructions
- [ ] `ARCHITECTURE.md` - System design
- [ ] Environment variable docs (`.env.example`)
- [ ] API documentation (OpenAPI spec)

### 2.5 Nice-to-Have

- [ ] Hot reload for development
- [ ] Database seeders for testing
- [ ] Performance profiling setup
- [ ] Docker Compose for full stack dev
- [ ] Storybook for component development

---

## 3. Agent Experience (AgentX) Improvements

### 3.1 Critical: Response Optimization

#### A. Reduce Verbosity
**Current:** All tools return full JSON with all fields
**Improvement:** Tiered response modes

```typescript
// Add optional verbosity parameter to tools
inputSchema: {
  verbosity: z.enum(["minimal", "standard", "full"]).default("standard")
}

// minimal: Just IDs and names
// standard: Common fields
// full: Everything including metadata
```

**Priority tools to optimize:**
- [ ] `list_characters` - Often only need name/id/location
- [ ] `get_game_state` - Currently returns everything
- [ ] `list_locations` - Could skip description for overview

#### B. Structured Error Responses
**Current:** `{ isError: true, content: "Game not found" }`
**Improvement:** Actionable error objects

```typescript
{
  isError: true,
  errorCode: "ENTITY_NOT_FOUND",
  entityType: "game",
  entityId: "xyz123",
  suggestions: [
    "Use list_games to see available games",
    "Create a new game with create_game"
  ]
}
```

### 3.2 High Priority: Batch Operations

**Current:** Many operations require multiple round trips
**Improvement:** Compound tools for common workflows

#### A. New Batch Tools
```typescript
// Create multiple entities at once
"batch_create_npcs" - Create several NPCs in one call
"batch_move_characters" - Move multiple characters
"batch_update_resources" - Update several resources

// Common workflows
"setup_combat_encounter" - Create NPCs + start combat + roll initiative
"complete_quest_with_rewards" - Mark complete + give items + update relationships
"scene_transition" - Move characters + advance time + log event
```

#### B. Query Tools
```typescript
// Get related data in one call
"get_character_context" - Character + inventory + location + active quests
"get_location_context" - Location + present characters + items + exits
"get_combat_summary" - Combat state + all participant details
```

### 3.3 High Priority: Naming Consistency

**Current Issues:**
| Pattern A | Pattern B | Recommendation |
|-----------|-----------|----------------|
| `modify_health` | `update_character` | Use `update_*` for changes |
| `remove_combatant` | `delete_character` | Use `delete_*` for removal |
| `get_character_by_name` | `list_characters` | Consistent |

**Standardization:**
- `create_*` - Create new entity
- `get_*` - Retrieve single entity
- `list_*` - Retrieve multiple entities
- `update_*` - Modify existing entity
- `delete_*` - Remove entity
- `batch_*` - Multiple entities at once

### 3.4 Medium Priority: Tool Discovery

#### A. Tool Categories Endpoint
```typescript
// New MCP resource: tool categories
{
  "game_management": ["create_game", "load_game", ...],
  "character_management": ["create_character", ...],
  "combat": ["start_combat", "next_turn", ...],
  // ...
}
```

#### B. Tool Relationships
```typescript
// Tool metadata: related tools
{
  name: "create_character",
  relatedTools: {
    before: ["create_game"],  // Prerequisites
    after: ["create_item", "move_character"],  // Common follow-ups
    alternatives: ["get_character_by_name"]  // Instead of creating
  }
}
```

### 3.5 Medium Priority: Context Awareness

#### A. Smart Defaults
```typescript
// If only one game exists, use it as default
"get_player_character" - Auto-detect player in current game
"current_location" - Track where player is, avoid needing locationId
```

#### B. Session Context Resource
```typescript
// MCP Resource with current context
{
  activeGameId: "...",
  playerCharacterId: "...",
  currentLocationId: "...",
  activeCombatId: "...",
  recentEntities: ["char_123", "loc_456"]  // For quick reference
}
```

### 3.6 Nice-to-Have

- [ ] Tool execution metrics (for optimization)
- [ ] Undo support for destructive operations
- [ ] Dry-run mode for validation
- [ ] Natural language intent detection
- [ ] Automatic context saving every N operations

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
1. Add testing infrastructure (Vitest)
2. Add linting/formatting (ESLint + Prettier)
3. Set up CI/CD pipeline
4. Fix error handling in client

### Phase 2: DX Improvements (Week 3-4)
1. Refactor useApi.ts to reduce duplication
2. Split large files (register/core.ts, http/server.ts)
3. Add development documentation
4. Create component tests

### Phase 3: AgentX Improvements (Week 5-6)
1. Add verbosity parameter to list tools
2. Create batch operation tools
3. Improve error response structure
4. Add tool category metadata

### Phase 4: UX Polish (Week 7-8)
1. Error toasts and feedback
2. Theme switcher UI
3. Accessibility audit and fixes
4. Mobile responsiveness

### Phase 5: Advanced Features (Ongoing)
1. PWA support
2. E2E test coverage
3. Smart context tools
4. Performance optimization

---

## Metrics for Success

| Dimension | Metric | Current | Target |
|-----------|--------|---------|--------|
| **DX** | Test coverage | 0% | 70%+ |
| **DX** | Build time | ~30s | <20s |
| **UX** | Lighthouse accessibility | Unknown | 90+ |
| **UX** | Time to interactive | Unknown | <2s |
| **AgentX** | Avg tool calls per action | ~3-5 | ~1-2 |
| **AgentX** | Error recovery rate | N/A | 90%+ |

---

## Quick Wins (Immediate Impact, Low Effort)

1. **Add `.env.example`** - Document environment variables
2. **Add error toasts** - 1 component, big UX improvement
3. **Refactor useApi.ts** - 50% code reduction
4. **Add tool categories resource** - Better agent discovery
5. **Fix AppFooter** - Add useful content
6. **Add `npm run lint`** - Catch issues early
7. **Verbosity param on list tools** - Reduce token usage
