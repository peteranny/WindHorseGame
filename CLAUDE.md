# WindHorseGame

A browser-based maze navigation game built with React and webpack.

## What it does

The player sees a 2D grid maze from a top-down perspective and navigates by clicking cells. Movement is only allowed in straight lines (horizontally or vertically) with no walls in between — diagonal moves and jumps over walls are rejected. The player character is always centered on screen; the viewport shifts around them as they move.

## Current state

Early-stage prototype. The maze layout is hardcoded, and the only UI beyond the maze is a placeholder dialog below it. React Router is wired up but only one route exists.

## Dev setup

Uses webpack 4 + Node 18, which requires `NODE_OPTIONS=--openssl-legacy-provider` — already set in the npm scripts, so `npm start` and `npm build` work as-is.
