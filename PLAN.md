# Game Plan

## Core Concept

A maze navigation game where the player explores a map and encounters **40 pocket monsters**. Each monster must be challenged and captured. The game is cleared when all 40 are captured.

## Structure

### The Maze (already built)
- The player navigates a 2D grid by clicking cells
- The map is defined in `src/components/Maze/map.txt` (29×29 cells), where `X` = wall and space = road
- Monster positions are marked with `M` in the map file — all monsters share the same symbol; they are identified by their **index**: the order they appear scanning the file top-to-bottom, left-to-right (0-indexed)
- An **uncaptured** monster cell acts like a wall — it blocks movement and must be challenged before the player can pass through
- A **captured** monster's cell becomes a road — it is permanently passable and the monster no longer appears there
- Tapping a monster cell from a distance (clear straight-line path) walks the player up to the adjacent cell, same as approaching any other obstacle; tapping it again once already adjacent triggers the conversation system, then the challenge
- The player's map sprite tracks the direction of their last move: moving left/right uses `wind-1.png` (flipped horizontally to face right, mirrored back for left), while moving up/down swaps in a dedicated back-facing or front-facing sprite instead of flipping
- Every sprite on the map (the player, and each uncaptured monster) renders a small soft-edged ellipse shadow under its feet, for a bit of ground contact/depth
- Every captured monster trails behind the player on the main map (not the mini-map) as a raw, un-decorated icon (no background/border), most-recently-captured closest — like ducklings following their mother, purely for visual flavor, and each mirrored to match the player's own current facing direction (monster icon art is natively left-facing, the opposite convention from the player's own right-facing sprite, so the two mirror on opposite conditions). Rather than one slot per grid cell (which reads as jumpy, blocky steps), followers sit at fine, evenly-spaced points resampled directly along the actual pixel path the player walked (not persisted, reset every session), packed close enough together that most of even a large captured roster stays visible on screen at once instead of trailing off past the edge. The closest follower sits half a cell behind the player; every one after that is spaced much tighter, keeping the line itself compact. The whole trail always renders behind (lower z-index than) the player's own sprite
- A corner **mini-map** shows the whole grid at a glance (player position, uncaptured monsters) — but only for cells the player has actually walked past; unexplored cells render as fog until then, revealing progressively as the player explores (not just the destination of each move, but every cell along the way, since a single tap can slide through several cells at once). The fogged/revealed state persists like the rest of the save data. The main map view itself is never fogged — only the mini-map is. The player's own dot pulses with a looping radar-ping ring (an expanding, fading circle) so it stays visually distinct from the monster/road dots at that scale

### Monster Data

**Decision:** the 40 monster definitions are sourced from a separate personal project, `/Users/peteranny/Documents/WindHorseNote/src/models/creatures/index.json`. Its contents (and each entry's `icon` image) are **copied** into this app, not moved/referenced in place.

- The source file has 39 entries; all 39 are used, plus 1 placeholder monster to reach exactly 40
- Each entry's `family` (`wind` or `horse`) is carried over as flavor text only — no gameplay effect, both families are equally capturable
- Only the `icon` illustration is used in-game (map marker, battle sprite, dialog portrait) — the `descriptionImage` photo is not used
- Monster order/index follows the source file's existing order; the "one monster per year of life" framing is narrative flavor, not a literal date mapping

### Conversation System (entry point to every challenge)

All conversation and displayed text in the game is written in **Traditional Chinese (繁體中文)**.

Before challenging a monster, the player goes through a conversation. The conversation:

- Is **stored in a file** (one file per monster node), loaded and displayed in the existing dialog box
- Is presented **page by page** — one speaker per page, text must not overflow the dialog box
- The player **taps to advance** through pages, in order, with no branching
- The **end of the conversation** transitions into the challenge

#### Conversation file format

**Decision:** JSON, one file per monster. Each file holds an ordered array of pages (speaker, text) — plain enough to write by hand.

Conversation progress isn't persisted, so re-entering an uncaptured monster's cell always restarts its conversation from the top. A captured monster's cell is just road and never triggers a conversation again.

**Decision:** speaker identity is shown as a **full character portrait** (the monster's `icon` image) alongside the dialog text, not just a name label. While a page's text is being typed out, the current speaker's sprite *on the map itself* (the player's sprite, or the monster's map icon) plays a small looping "jump" animation to show who's talking; it stops once the line finishes typing.

**Decision:** each script is a short (2-3 page) back-and-forth between the protagonist (小風) and the monster, adapted from that monster's source `description` — playful, "cute", often with the monster being a bit dumb/confused (「？？？」) in tone, per the established 小風小馬 universe. The protagonist is just "小風" and has no special relation to the other 小風/小馬-named monsters — they're simply a big family the protagonist needs to capture.

### Monster Challenges

#### Battle UI

The battle screen shows the protagonist on the left and the wild monster on the right, each paired with its own name/HP bar (protagonist's above its sprite, wild monster's below its sprite) — never crossed with the other side's. The protagonist's sprite is noticeably larger than the wild monster's, anchored from the top of the battlefield (so it always clears its own info box regardless of viewport height) and hangs low enough to be partly covered by the button row below it, mimicking a "closer to the camera" perspective — the enemy, by contrast, is smaller and fully clear of the panel. The battlefield half of the screen is flexible height; the button row below it — one per captured monster, plus the protagonist's own innate attack, used to attack — is capped at 40% of the screen height and scrolls internally once there are more buttons (up to 41, as the roster grows) than fit, so it can never push content off-screen. Each button is a fixed size regardless of cooldown state — a countdown badge floats over its top-right corner only while it's on cooldown (no reserved space, so a ready button never differs in layout from one that isn't). Attacking plays a brief lunge toward the opponent; being hit plays a knocked-down stumble (rotate away from the attacker + drop) rather than a plain shake; healing plays a glow on the protagonist instead — all simple CSS keyframe animations so actions read clearly in real time. Attacking with a captured monster (not the innate attack, "小風溥儀", which has nothing to throw) also sends that monster's icon arcing from the player's side to the wild monster's, spinning and shrinking from near to far, like it's being thrown; the innate attack instead shoots a water drop straight across. Either way, the hit (damage + the enemy's hit reaction) only lands once its animation actually arrives, not the instant the button is pressed. In the last 2 seconds before the wild monster's next automatic attack, wiggling "？" marks appear over its sprite one at a time as the countdown runs out (all 3 visible only in the final stretch, doubling as a timer) — a nod to every monster's placeholder dialogue being "？？？".

- There are **40 monsters**, each associated with a node on the map
- Battles are **real-time, not turn-based** — there are no turns to pass; both sides act on their own clocks:
  - The protagonist has an **innate base attack**, always available (not tied to captured monsters), so the very first battle — before anything is captured — is still winnable. It deals the same flat damage and has the same cooldown as a regular monster attack (see below)
  - The player can tap any of their captured monsters (or the innate attack) to attack at any time, but each needs a **1-minute real-world cooldown** afterward before it can attack again
  - Every attack deals a **flat 1 damage** to the wild monster, regardless of which monster (or the innate attack) was used — no per-monster power stat
  - Cooldowns are tracked **per monster** (and for the innate attack) and **persisted**, so they carry over across leaving/re-entering a battle and across sessions
  - The wild monster attacks automatically, dealing **1 damage every 10 seconds**
  - The protagonist has **10 life points**, reset at the start of each battle (not persisted) — reaching 0 ends the battle as a loss
  - An **escape button** lets the player leave a battle at any time — same outcome as losing (monster stays uncaptured, no penalty, retryable immediately)
- The wild monster's life points scale with how many monsters the player has captured so far: `life = 2 × (capturedCount + 1)` — the very first battle (0 captured) starts at 2, the second battle (1 captured) at 4, and so on
- **5% of monsters are healers**: tapping one restores 1-2 (random) of the protagonist's life points instead of attacking the wild monster. Which monsters heal (and by how much) is defined per-monster in the monster table, same as any other stat — healers still have their own attack cooldown
- There's no unlock condition or time window of any kind — every monster can be challenged at any time, and re-challenged as many times as needed after a loss or escape
- Successfully defeating a monster **captures it** and records the capture date
- Losing a challenge simply returns the player to the map — the monster stays uncaptured and can be retried immediately
- A win or a loss (not an escape, which is instant) pauses briefly on the battlefield - attacking and escaping are disabled - then fades the whole battle screen out (to white for a win, to black for a loss) before actually leaving, so the defeated state has a moment to land instead of the screen just switching away
- However a battle ends — win, lose, or escape — a short one-line conversation (小風 reacting: "太好了，成功抓到...", "小風被...打倒了...", "先撤退好了...") plays before dropping back to the map, so the outcome is acknowledged rather than just silently returning

### Monster Index

- During map wandering (not during a battle or conversation), the player can open a **monster index** via a persistent on-screen button
- The index shows only **captured** monsters, each with its capture date — uncaptured monsters don't appear in the index at all. Each entry's name label is clamped to 2 lines (ellipsized beyond that) so a long name can't stretch the entry's block height
- Monster nodes on the map always look challengeable; once captured, the cell is plain road with no marker

### Win Condition

The game is cleared when all 40 monsters are captured.

## Game State

### State management

**Decision:** Zustand — less boilerplate than Redux and easy to unit test. All game logic is driven by this state.

### What the state includes (persisted)
- Player map coordinate
- List of captured monsters with their capture dates
- Each captured monster's attack cooldown, plus the protagonist's innate-attack cooldown (next time each is available to attack again)
- Which map cells have been explored, for the mini-map's fog of war
- Any other core business logic state (TBD)

### What the state excludes (not persisted)
- UI / rendering state (animation frame progress, transition state)
- Conversation progress (resets to beginning on reload — acceptable)
- In-progress battle state (wild monster's current HP, protagonist's current HP) — if the app reloads mid-battle, the battle is abandoned and the player returns to the map with the monster still uncaptured; only cooldowns survive

### Persistence

State is serialised as JSON and saved to the connected Google Sheet, keyed by a **user-defined state key**.

- On first launch, the app **prompts the user to enter their state key**
- The key is used to load the matching state from the Sheet and sync to it
- A **Settings page** allows the user to change their key at any time — this **pulls fresh from the remote immediately**: the local cache is scoped per key, so switching keys can never let a different key's stale local data outrank the new key's actual remote data
- Multiple users (or save slots) are supported naturally through different keys
- If a remote save fails (e.g. offline) while the key stays the same, the write **isn't lost** — it stays pending and automatically retries once the connection is restored (or periodically, as a fallback), without any action from the player

## Testing

Unit tests are required for the two core systems to ensure robustness as the game grows.

### Scoring / capture system
- Capturing a monster records it correctly with a timestamp
- Capturing the same monster twice does not duplicate it
- Win condition triggers correctly when all 40 monsters are captured
- State serialises and deserialises correctly

### Conversation system
- Parsing a conversation file into pages correctly
- Advancing through pages in order
- Reaching the end of the conversation correctly signals challenge entry
- Graceful handling of malformed files (empty text, etc.)

Test framework TBD (likely Jest, given the React/webpack stack).

## Open Questions

- Placeholder content (name, description, icon) for the 40th monster, since the source data only has 39
- Conversation script content for each of the 40 monsters (still needs writing, one file per monster)
