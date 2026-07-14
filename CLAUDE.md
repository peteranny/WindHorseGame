# WindHorseGame

> **For AI:** Keep this file up to date as the codebase evolves. After any task that changes the architecture, adds a new concept, or modifies how a key system works, update the relevant section here before committing.

A browser-based maze/monster-capture game built with React, TypeScript, and webpack. Full design rationale and decisions live in `PLAN.md`.

## What it does

The player navigates a 2D grid maze from a top-down perspective by clicking cells, in straight lines only (no diagonals, no jumping over walls). The maze holds 39 monster nodes plus one goal tile (39 + 1 = 40, a nod to the "40 years of life" framing); an uncaptured monster (or the goal) blocks its cell like a wall. Tapping one from a distance walks the player up to it; walking directly adjacent to a monster starts a short conversation, which transitions into a real-time battle — the player attacks with their already-captured monsters (each on its own cooldown) until the wild monster's HP hits 0 (captured) or the player's HP hits 0 (returned to the map, monster stays uncaptured, retryable anytime). The goal tile leads into a conversation instead, gated on whether all 39 monsters are captured yet. Every captured monster trails behind the player on the map as a small "duckling train."

## Current state

Core loop is implemented end-to-end: map traversal, capture-gated blocking, conversation, real-time battle, and persistence. Content is a first draft, not final: the 39 monster definitions and their conversation scripts were bulk-generated from source material and are meant to be hand-revisited (see `PLAN.md`'s Open Questions).

## App structure

```
src/
  index.tsx            # Entry point. Imports scale first to set --scale CSS var, mounts <App> in a Router.
  scale.ts              # Single source of truth for global UI scale. Change SCALE here to resize everything.
  globals.d.ts          # __DEPLOY_DATE__, the google.script.run (GAS) surface, and *.css/*.txt module typings.
  components/
    App.tsx             # Router shell: "/" -> Game, "/settings" -> Settings.
    Game/                # The main screen: wires MouseContext, Screen, Maze, Dialog, Battle.
    Screen/              # Full-viewport container div. Sets base font-size via calc(13pt * var(--scale)).
    Maze/                 # Core game logic. Grid rendering, click-to-move, monster/goal blocking/markers, player sprite.
                          # compileMap.ts/monsterPositions.ts are shared with MiniMap. goalPosition.ts finds the
                          # map's single 'F' goal tile. exploration.ts: computeTraversedCells/revealCells for fog
                          # of war, cellBeforeTarget (the cell just before an obstacle) and findStoppingPoint (walks
                          # a tapped straight-line move as far as it actually can, stopping short of whatever
                          # blocks it first instead of refusing the whole move).
                          # followerTrail.ts: pure helpers behind the trailing captured-monster followers - an
                          # ephemeral (non-persisted) cell-by-cell history of the player's own path, and
                          # resamplePath, which turns that into fine, evenly-spaced pixel points to render at.
    Dialog/               # Bottom panel; renders ConversationView while a conversation is active.
                          # paginateText.ts splits a page's full text into <=2-line, DOM-measured
                          # chunks (joined with "..."); useTypewriter.ts types out the current chunk.
    Battle/               # Full-screen real-time battle UI (replaces Maze/Dialog while mode === "battle").
    MiniMap/              # Small corner overview of the whole map: player position, uncaptured monsters, and
                          # the goal tile - the latter two always visible as beacons even through unexplored fog.
    StateKeyGate/         # Blocks rendering until the save-state key is set and state is hydrated.
    Settings/             # /settings route: view/change the save-state key.
  data/
    monsters/
      monsters.generated.json  # The 39 monster definitions (name, description, family, isHealer/healAmount -
                                # no icon field, see icons/ below). Sourced from a separate WindHorseNote
                                # project's creatures data (copied, not referenced live) plus 1 placeholder.
      icons/<id>.png            # One real image file per monster (39 are .png; the placeholder monster's
                                # (id 39) is .svg) - types.ts, monsters.ts imports every one by id and merges
                                # it into the metadata from the JSON above to build the final Monster[].
      types.ts, monsters.ts    # Monster type and the typed loader that merges monsters.generated.json with icons/.
      captureLogic.ts          # Pure captureMonster/isFullyCaptured helpers (used by gameStore and the goal tile).
      battleFormulas.ts        # computeWildMaxHp and the battle constants (cooldown, damage, HP, tick rate).
    conversations/
      <id>.json           # One file per monster (id = its index/position in monsters.generated.json), a plain
                           # array of {speaker, text, action?} pages - linear, no branching.
      goalHint.json, goalFinal.json  # The map's 'F' goal tile's two conversations - hint (shown until all 39
                           # are captured) and final (shown after), picked in ConversationView via isFullyCaptured.
      engine.ts            # Pure parseConversation/isTerminalPage/nextPageIndex/terminalAction helpers, plus
                           # buildOutcomeConversation for the post-battle win/lose/escape recap.
      index.ts              # Imports all 39 monster files (parsed, keyed by id) plus the two goal conversations.
  store/
    gameStore.ts          # Zustand store: position, facing, captured, cooldowns - the persisted slice (see below).
    flowStore.ts          # Zustand store: mode ("map"|"conversation"|"battle"), activeMonsterId, isGoalEncounter,
                           # battle HP, devBattleShortcutsEnabled - all ephemeral, never persisted.
    persistence.ts        # localStorage (per-key) + google.script.run read/write helpers, plus the pure
                           # resolveHydratedState local-vs-remote merge decision.
    remoteSync.ts          # createRemoteSync: DI'd retry controller for not-yet-synced remote writes.
    types.ts              # PersistedGameState shape.
  assets/
    playerSprite.png            # wind-1.png flipped to face right - the protagonist's left/right map sprite,
                                # and its only battle sprite.
    playerSpriteFront.png       # Dedicated front-facing map sprite, used while moving down.
    playerSpriteBack.png        # Dedicated back-facing map sprite, used while moving up.
    goalSprite.png              # The map's 'F' goal tile's sprite.
  contexts/
    MouseContext.ts       # Provides global mouse position to the tree.
  hooks/
    useMouse.ts           # Tracks click coordinates, exposed via MouseContext.
    useQuery.ts           # URL query param helper (unused in main flow).
gas/
  Code.js                 # GAS server functions: doGet (serves the app), saveState, loadState.
  index.html              # Production build output — inlined React bundle, generated by npm run build.
```

Every image in the repo (all 39 monster icons, the goal sprite, the player's 3 map sprites) is a real `.png` file, imported normally in code - webpack's `url-loader` (see `webpack.config.js`, `test: /\.(png|svg)$/` - `.svg` supported too even though nothing currently uses it) always inlines them as base64 data URIs at build time regardless of size, so the final deployed app still ships as one self-contained JS bundle - the GAS web app only serves a single HTML file, there's no separate static asset serving.

### Global scale

`src/scale.ts` exports a `SCALE` constant (currently `3`) and sets it as the `--scale` CSS custom property on `<html>`. All sizing derives from this:
- JS: `CELL_SIZE = 100 * SCALE`
- CSS: `font-size: calc(13pt * var(--scale))`, dialog height `calc(120px * var(--scale))`, etc.

To make the UI bigger or smaller, change only `SCALE` in `scale.ts`.

### Game state & persistence

The persisted slice (`store/gameStore.ts`) holds only: player map coordinate, the sprite's last facing direction (`"left" | "right" | "up" | "down"`, updated automatically by `setPosition` based on whichever axis actually changed - x takes priority over y since movement is always purely horizontal or vertical, never both at once), captured monsters (id -> ISO capture date), per-attack cooldowns (monster id, or `"innate"` for the protagonist's own attack -> next-available timestamp in ms), and explored cells (see "Fog of war" below). Everything else — conversation progress, in-battle HP, which page/screen is showing — lives in the ephemeral `store/flowStore.ts` and is never persisted, so a reload mid-conversation or mid-battle just drops back to the map with no side effects (cooldowns already spent still apply).

On first launch (or whenever no key is stored), `StateKeyGate` blocks rendering: in local dev it silently assigns `"local-dev"`; in the deployed GAS environment it prompts the player for a save-state key. The key is stored in `localStorage` and used to look up/save a single JSON blob (position + captured + cooldowns + a timestamp), both to `localStorage` (for instant reload) and to the Google Sheet (via `google.script.run`, guarded by `typeof google !== "undefined"` so local dev is unaffected). The local cache is itself scoped per state key (`gameState:<key>`, not a single shared slot) — critical for `/settings`: changing the key calls `hydrate()` for the *new* key, and since its local cache starts genuinely empty (or reflects only what this device has saved under that specific key before), a fresh remote snapshot is never crowded out by another key's stale local data. Within the same key, `resolveHydratedState` (`store/persistence.ts`) picks whichever of local/remote has the newer timestamp.

Remote saves go through `store/remoteSync.ts`'s `createRemoteSync` — a small controller (DI'd with the actual `saveRemoteState` call) that tracks at most one not-yet-synced write at a time. A failed save (offline, GAS error, etc.) is never retried in a busy-loop; it just stays pending until something external asks again — `gameStore` wires that up via the browser's `online` event plus a 30s fallback timer, so a write made while offline reaches the Sheet once connectivity returns, without the player having to do anything. A newer write always supersedes an older still-pending/in-flight one. Switching state keys (`setStateKey`) calls `clearPending()` first, so an unsynced write for the *old* key doesn't linger and get retried against the wrong slot — it's still safely cached in that old key's local storage, just not pushed further until the player switches back and changes something again.

### Fog of war (mini-map)

`gameStore.exploredCells` is a `Record<"x,y", true>` (see `components/Maze/exploration.ts` for the `cellKey`/`computeTraversedCells`/`revealCells` helpers), persisted like everything else. Every `goto` move — including the multi-cell slides this game already supports, not just single steps — reveals every cell along the traversed line, not merely the destination. `MiniMap` renders any cell missing from this set as solid fog regardless of what's actually there (wall/road), so the overview fills in only as the player actually walks past that area; the player's own current cell is always shown regardless. Every uncaptured monster and the goal tile are exceptions - they punch through the fog as beacons so the player always knows *something* is there, even in unexplored territory, since finding the actual path there on foot is the point. Only `MiniMap` respects fog — the main `Maze` view always shows everything.

### Monster blocking, capture

`Maze` scans `map.txt` top-to-bottom/left-to-right; the *n*th `M` it finds is `MONSTERS[n]`. An uncaptured monster cell blocks movement like a wall — it's still a valid tap target from anywhere along a clear straight line, but `goto` only starts the encounter (`flowStore.startEncounter`) when the player is already adjacent; tapping it from further away instead walks the player up to the cell just before it, same as approaching any other obstacle. Tapping any cell whose straight-line path is blocked partway (by a wall, an uncaptured monster, or the goal) - not just the obstacle itself - now walks the player as far as `findStoppingPoint` (`exploration.ts`) says is actually reachable, stopping just short of the first blocker, rather than refusing the move outright. A captured monster's cell is just a normal road from then on. Every monster can be challenged at any time — there's no unlock condition or time window of any kind.

### The goal tile

The map's single `'F'` cell (found via `Maze/goalPosition.ts`'s `findGoalCell`) works like a monster for movement purposes — blocks like a wall, walk-up-then-tap same as above — but leads into a conversation instead of a battle (`flowStore.startGoalEncounter`, a separate ephemeral flag from `activeMonsterId` since there's no specific monster involved). `ConversationView` picks between `GOAL_HINT_CONVERSATION` (not all 39 captured yet) and `GOAL_FINAL_CONVERSATION` (`captureLogic.isFullyCaptured`), rendering the goal's own sprite/name in place of a monster's for any `"monster"`-speaker page. Its map icon mirrors to face the player the same way a monster's does while its conversation is active.

### Conversation -> Battle flow

Walking into a monster shows its portrait conversation (`Dialog`/`ConversationView`) — linear pages alternating between the protagonist (小風) and the monster, tap to advance. While a page is being typed out, `ConversationView` writes the current speaker into `flowStore.talkingSpeaker` ("protagonist" | "monster" | null); `Maze` reads that to play a small looping "jump" animation on the actual map sprite that's talking (the player's sprite, or the active monster's icon) rather than animating the dialog's own portrait image. The terminal page's `enter_challenge` action computes the wild monster's max HP from the player's current capture count (`computeWildMaxHp`) and switches `flowStore.mode` to `"battle"`, which swaps `Maze`/`Dialog` out for the full-screen `Battle` component. Battles are real-time: the protagonist (left, HP above its sprite) and the wild monster (right, HP below its sprite) each show their own name/HP paired only with their own sprite; the player can tap any captured monster (plus their own innate attack) to deal 1 damage, each on an independent 1-minute cooldown persisted in `gameStore`; the wild monster automatically deals 1 damage every 10 seconds; healer monsters (~5% of the roster) restore HP instead of dealing damage; an escape button leaves the battle at any time with the same outcome as losing. Attacking/being-hit/healing each trigger a brief CSS animation (lunge, knocked-down stumble, or glow respectively) on the relevant sprite via `flowStore`-adjacent local component state, not persisted. However the battle ends — win (`flowStore.concludeBattle("win")`), lose, or escape — `mode` returns to `"conversation"` with `battleOutcome` set, so `ConversationView` shows a short generated reaction (`buildOutcomeConversation`) before actually dropping back to the map (`endEncounter`, which also clears `battleOutcome`). A win only actually calls `captureMonster` once the post-battle pause+fade finishes (not the instant HP hits 0), so the just-defeated monster doesn't show up in the attack grid while its own defeat is still playing out.

Settings has a dev-only toggle (`flowStore.devBattleShortcutsEnabled`, visible only under the `"peteranny"` save key) that adds "Capture"/"Lose" buttons to `Battle` - each just deals lethal damage through the normal `damageWild`/`damageProtagonist` path, so they behave exactly like a real killing blow (capture, fade, outcome conversation, all included) rather than a separate force-win code path.

### Deploy date label

`src/scale.ts` aside, the other build-time injection is `__DEPLOY_DATE__` — a webpack `DefinePlugin` value set to `DEPLOY_DATE=$(date "+%Y-%m-%d %H:%M")` by the deploy script. Shown as an "advanced info" field on the `/settings` page rather than on the map screen. Empty in production if not set; shows `1970-01-01 00:00` stub in local dev.

## Dev setup

Uses webpack 4 + Node 18, which requires `NODE_OPTIONS=--openssl-legacy-provider` — already set in the npm scripts, so `npm start` and `npm build` work as-is.

```sh
npm run typecheck   # tsc --noEmit
npm test            # jest — unit tests for the capture and conversation systems
```

## Deployment (Google Apps Script)

Deployed via clasp as a standalone web app (not gh-pages). React source lives in `src/`; production build outputs inlined `gas/index.html` alongside `gas/Code.js` (doGet handler).

```sh
npm install
npm run login          # authenticate with Google
npm run setup          # first time only — creates GAS project, writes scriptId to .clasp.json
npm run deploy         # build, push, and activate the live deployment
```

| Command | Description |
|---|---|
| `npm run pull` | Pull latest scripts from GAS editor |
| `npm run push` | Build, push to GAS (also pushes git) |
| `npm run open` | Open GAS editor in browser |

## Google Sheet integration

The GAS project is container-bound to a Google Sheet, storing one row per save-state key: column A = key, column B = the full state JSON blob (position, captured monsters, cooldowns, timestamp — see `store/types.ts`). `google.script.run.saveState(key, json)` finds the key's row and overwrites column B (appending a new row if the key is new); `loadState(key)` reads it back. There's no more per-field (x/y) column layout — the whole persisted slice travels as one JSON string.
