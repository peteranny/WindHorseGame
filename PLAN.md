# Game Plan

## Core Concept

A maze navigation game where the player explores a map and discovers **sub-challenge nodes** scattered across it. Completing a sub-challenge rewards a **missing piece**. Collecting all pieces wins the game.

## Structure

### The Maze (already built)
- The player navigates a 2D grid by clicking cells
- Sub-challenge nodes are specific cells on the map — walking into one triggers a conversation

### Conversation System (entry point to every mini-game)

Before entering any mini-game, the player goes through a conversation with an NPC or entity associated with that cell. The conversation:

- Is **stored in a file** (one file per trigger node), loaded and displayed in the existing dialog box
- Is presented **page by page** — one speaker per page, text must not overflow the dialog box
- The player **taps to advance** through pages
- Can include **choices** — when a page presents options, each option can branch to a different path within the same conversation file
- The **end of the conversation** (or a specific terminal page) transitions into the mini-game

#### Conversation file format (TBD, but should express)
- Speaker identity per page
- Page text content
- Optional choices with labels and target page references (for branching)
- A terminal flag or action (e.g. `enter_game: bingo`) to trigger the mini-game on completion

Example flow:
```
Page 1 [NPC]: "Stranger, do you dare challenge me?"
  → tap to continue

Page 2 [NPC]: "Choose your path."
  Option A → Page 3
  Option B → Page 4

Page 3 [NPC]: "Brave! Let's begin." → enter_game
Page 4 [NPC]: "Another time, then." → end (no game)
```

### Sub-Challenges
Each node on the map leads to a distinct mini-game or interactive experience. Types under consideration:

| Type | Description |
|---|---|
| Find the Differences | Spot differences between two images |
| Draw Lots | Random luck-based outcome |
| Bingo | Classic bingo card game |
| Find Missing Cats | Hidden object / search challenge |
| Message Board | Leave / read messages (social) |
| Shop | Exchange collected items or currency |
| Fighting System | Turn-based or reflex-based combat |

All types are TBD in detail. Each challenge is independent from the others.

### Rewards & Win Condition
- Each sub-challenge, when completed, grants one **piece** (a fragment of something — TBD what)
- The player wins when all pieces are collected
- Pieces may be visual (assembled into an image?) or abstract collectibles — TBD

## Testing

Unit tests are required for the two core systems to ensure robustness as the game grows.

### Scoring system
- Awarding a piece upon challenge completion
- Not awarding a duplicate piece if already collected
- Win condition triggers correctly when all pieces are collected
- Piece state persists correctly (per-device, via Google Sheet)

### Conversation system
- Parsing a conversation file into pages correctly
- Advancing through pages in order
- Branching to the correct target page when an option is chosen
- Terminal page correctly signals mini-game entry (or conversation end)
- Graceful handling of malformed files (missing target page, empty text, etc.)

Test framework TBD (likely Jest, given the React/webpack stack).

## Open Questions

- How many sub-challenges / pieces total?
- What do the pieces represent? (puzzle image, story fragment, key, etc.)
- Can a challenge be replayed? Or is it one-shot per device?
- Is there a narrative or theme tying the challenges together?
- How is a challenge node visually represented on the maze map?
- Is there any ordering / prerequisite between challenges, or are they all open from the start?
- Multiplayer / shared state between devices, or purely per-device?
- Where does the Shop fit — is currency earned from challenges?
- What does the Fighting System fight against — NPCs, other players, random encounters?
- Conversation file format — JSON, YAML, plain text with a custom syntax?
- How is speaker identity shown in the dialog UI? (name label, avatar, bubble style?)
- Can a conversation be skipped / re-entered after the first time?
