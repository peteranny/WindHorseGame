# WindHorseGame

A browser-based maze navigation game built with React and webpack.

## What it does

The player sees a 2D grid maze from a top-down perspective and navigates by clicking cells. Movement is only allowed in straight lines (horizontally or vertically) with no walls in between — diagonal moves and jumps over walls are rejected. The player character is always centered on screen; the viewport shifts around them as they move.

## Current state

Early-stage prototype. The maze layout is hardcoded, and the only UI beyond the maze is a placeholder dialog below it. React Router is wired up but only one route exists.

## Dev setup

Uses webpack 4 + Node 18, which requires `NODE_OPTIONS=--openssl-legacy-provider` — already set in the npm scripts, so `npm start` and `npm build` work as-is.

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

The GAS project is container-bound to a Google Sheet. Each time the player moves, the app calls `google.script.run.savePosition(x, y)` which overwrites cells A1:B1 with the current position. The `google` global is only available in the deployed GAS environment — the call is guarded with `typeof google !== "undefined"` so local dev is unaffected.
