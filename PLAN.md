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
- The player's map sprite is copied from `wind-1.png` (a facing-left illustration) — mirrored horizontally when moving right so it always faces its direction of travel
- Every sprite on the map (the player, and each uncaptured monster) renders a small soft-edged ellipse shadow under its feet, for a bit of ground contact/depth

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

The battle screen shows the protagonist on the left and the wild monster on the right, each paired with its own name/HP bar (protagonist's above its sprite, wild monster's below its sprite) — never crossed with the other side's. The battlefield half of the screen is flexible height; the button row below it — one per captured monster, plus the protagonist's own innate attack, used to attack — is capped at 40% of the screen height and scrolls internally once there are more buttons (up to 41, as the roster grows) than fit, so it can never push content off-screen. A button still on cooldown shows its remaining wait time instead of being usable. Attacking plays a brief lunge toward the opponent; being hit plays a knocked-down stumble (rotate + drop) rather than a plain shake; healing plays a glow on the protagonist instead — all simple CSS keyframe animations so actions read clearly in real time.

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
- Each of the 40 monsters has an **unlock condition** — a battle time window drawn from a fixed pool of rule types: specific weekday (e.g. Monday only), time-of-day (morning 6-12 / afternoon 12-18 / evening 18-22 / night 22-6, device local time), date parity (even-numbered day of month), or date divisibility (e.g. multiples of 3). Conditions are assigned independently across the 40 (not tied to each monster's own source date), overlapping only slightly so no two monsters are simultaneously available too often, and calibrated so no single monster is trivially always-on or near-impossible. A monster's cell still blocks movement like a wall while its condition is unmet, but tapping it still starts a (shorter) conversation — one that tells the player the condition itself (e.g. "只有在星期三才會出現") instead of leading into a challenge
- Successfully defeating a monster **captures it** and records the capture date
- Losing a challenge simply returns the player to the map — the monster stays uncaptured and can be retried immediately
- However a battle ends — win, lose, or escape — a short one-line conversation (小風 reacting: "太好了，成功抓到...", "小風被...打倒了...", "先撤退好了...") plays before dropping back to the map, so the outcome is acknowledged rather than just silently returning

### Monster Index

- During map wandering (not during a battle or conversation), the player can open a **monster index** via a persistent on-screen button
- The index shows only **captured** monsters, each with its capture date — uncaptured/locked monsters don't appear in the index at all
- Monster nodes on the map look the same whether challengeable or locked (the conversation is what reveals lock state); once captured, the cell is plain road with no marker

### Win Condition

The game is cleared when all 40 monsters are captured.

## Game State

### State management

**Decision:** Zustand — less boilerplate than Redux and easy to unit test. All game logic is driven by this state.

### What the state includes (persisted)
- Player map coordinate
- List of captured monsters with their capture dates
- Each captured monster's attack cooldown, plus the protagonist's innate-attack cooldown (next time each is available to attack again)
- Any other core business logic state (TBD)

### What the state excludes (not persisted)
- UI / rendering state (animation frame progress, transition state)
- Conversation progress (resets to beginning on reload — acceptable)
- In-progress battle state (wild monster's current HP, protagonist's current HP) — if the app reloads mid-battle, the battle is abandoned and the player returns to the map with the monster still uncaptured; only cooldowns survive

### Persistence

State is serialised as JSON and saved to the connected Google Sheet, keyed by a **user-defined state key**.

- On first launch, the app **prompts the user to enter their state key**
- The key is used to load the matching state from the Sheet and sync to it
- A **Settings page** allows the user to change their key at any time, which loads the corresponding memory
- Multiple users (or save slots) are supported naturally through different keys

## Testing

Unit tests are required for the two core systems to ensure robustness as the game grows.

### Scoring / capture system
- Capturing a monster records it correctly with a timestamp
- Capturing the same monster twice does not duplicate it
- Win condition triggers correctly when all 40 monsters are captured
- Unlock conditions are evaluated correctly for each rule type (weekday, time-of-day, date parity, date divisibility)
- State serialises and deserialises correctly

### Conversation system
- Parsing a conversation file into pages correctly
- Advancing through pages in order
- Reaching the end of the conversation correctly signals challenge entry
- Graceful handling of malformed files (empty text, etc.)

Test framework TBD (likely Jest, given the React/webpack stack).

## Open Questions

- Placeholder content (name, description, icon) for the 40th monster, since the source data only has 39
- The exact per-monster unlock condition values (which weekday/time-window/date-rule goes to which of the 40) — the rule pool and assignment approach are decided, the concrete table is an implementation-time content task
- Conversation script content for each of the 40 monsters (still needs writing, one file per monster)
