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
- Walking into a monster cell (adjacent move onto it) triggers the conversation system, then the challenge

### Conversation System (entry point to every challenge)

All conversation and displayed text in the game is written in **Traditional Chinese (繁體中文)**.

Before challenging a monster, the player goes through a conversation. The conversation:

- Is **stored in a file** (one file per monster node), loaded and displayed in the existing dialog box
- Is presented **page by page** — one speaker per page, text must not overflow the dialog box
- The player **taps to advance** through pages
- Can include **choices** — when a page presents options, each option can branch to a different path within the same conversation file
- The **end of the conversation** (or a specific terminal page) transitions into the challenge

#### Conversation file format (TBD, but should express)
- Speaker identity per page
- Page text content
- Optional choices with labels and target page references (for branching)
- A terminal flag or action (e.g. `enter_challenge: monster_id`) to trigger the challenge on completion

Example flow:
```
Page 1 [Monster]: "You dare face me?"
  → tap to continue

Page 2 [Monster]: "Then choose how you approach."
  Option A → Page 3
  Option B → Page 4

Page 3 [Monster]: "So be it. Fight!" → enter_challenge
Page 4 [Monster]: "Come back when you're ready." → end (no challenge)
```

### Monster Challenges

#### Battle UI

The battle screen follows a Pokémon-style layout:

```
┌─────────────────────────────────────────┐
│  [Enemy name / lv / HP bar]             │
│                          [Enemy sprite] │
│  [Player sprite]                        │
│                [Player name / lv / HP]  │
├───────────────────┬─────────────────────┤
│  What will        │  [FIGHT]  [BAG]     │
│  {monster} do?    │  [MON ]  [RUN]      │
└───────────────────┴─────────────────────┘
```

- **Top half:** battlefield with enemy sprite (top-right, facing player) and player's active monster sprite (bottom-left, back-facing)
- **Enemy info panel** (top-left): monster name, gender, level, HP bar
- **Player info panel** (bottom-right): monster name, gender, level, HP bar with numeric HP
- **Bottom bar** splits into:
  - Left: dialogue text (e.g. "野生的 皮丘 出現了！")
  - Right: 2×2 action button grid — **戰鬥 / 道具 / 寶可夢 / 逃跑** (or equivalent in Traditional Chinese)

- There are **40 monsters**, each associated with a node on the map
- Each challenge is a battle: the player uses their **currently captured monsters** to attack
- Force/damage calculation is TBD
- Each unchallenged monster may have **unlock conditions** before it can be challenged, e.g.:
  - Only available during a specific time window
  - Only available after a specific other monster is captured
  - Specific conditions TBD per monster
- Successfully defeating a monster **captures it** and records the capture date

### Monster Index

- During map wandering (not during a battle or conversation), the player can open a **monster index**
- The index shows all 40 monsters, indicating which are captured and which are not yet encountered
- Captured monsters show their capture date

### Win Condition

The game is cleared when all 40 monsters are captured.

## Game State

### State management

The game's core state is managed with a **state container** (Redux, Zustand, or similar — chosen for ease of unit testing). All game logic is driven by this state.

### What the state includes (persisted)
- Player map coordinate
- List of captured monsters with their capture dates
- Any other core business logic state (TBD)

### What the state excludes (not persisted)
- UI / rendering state (animation frame progress, transition state)
- Conversation progress (resets to beginning on reload — acceptable)

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
- Unlock conditions are evaluated correctly (time window, prerequisite capture, etc.)
- State serialises and deserialises correctly

### Conversation system
- Parsing a conversation file into pages correctly
- Advancing through pages in order
- Branching to the correct target page when an option is chosen
- Terminal page correctly signals challenge entry (or conversation end)
- Graceful handling of malformed files (missing target page, empty text, etc.)

Test framework TBD (likely Jest, given the React/webpack stack).

## Open Questions

- What are the 40 monsters? Names, types, artwork?
- What is the force/damage calculation in battles?
- What are the specific unlock conditions per monster?
- Conversation file format — JSON, YAML, plain text with custom syntax?
- How is speaker identity shown in the dialog UI? (name label, avatar, bubble style?)
- Can a conversation be skipped / re-entered after the first time?
- What happens if the player loses a challenge — can they retry?
- State container choice — Redux, Zustand, or other?
- How is the monster index triggered — a button on screen, a specific cell on the map?
- Is there a map indicator showing which monster nodes are locked / unlocked / captured?
