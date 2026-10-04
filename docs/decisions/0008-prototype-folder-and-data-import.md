# 0008. The prototype moves to its own folder, and its data is imported

Status: Accepted
Date: 2026-10-04

## Context

Milestone 1 rebuilds the prototype as a Vite app ([0005](0005-typescript-pwa.md)). Vite's entry point is `index.html` at the repository root, where the prototype lived. The prototype stays in daily use until the rebuild matches it.

The prototype saved charts, tempos, custom patterns and pattern overrides in localStorage. The brief puts the app's storage in IndexedDB. Browsers keep both per origin, so the app can only read the prototype's data when both run from the same address. The prototype was opened either as a local file or from `http://localhost:8642`.

## Options

- Keep the prototype at the root and put the app in a subfolder. Nothing moves, but the main project would live one level down, and the deploy would build from a subfolder.
- Move the prototype to `prototype/` and put the app at the root. A normal Vite layout, and the README points to both.
- Keep the app on localStorage under the prototype's keys. No import needed, but storage would stay tied to the prototype's format, against the brief.
- Move to IndexedDB, and import the prototype's data once: directly when the app runs on the same origin, and from a backup file otherwise.

## Decision

The prototype moves to `prototype/index.html`, unchanged apart from a Download backup button in its editor and the path to `songs/personal.js`. The app sits at the root.

The app stores its data in IndexedDB. On its first run it looks for the prototype's keys in localStorage and imports them. The dev and preview servers use port 8642, the prototype's old address, so this works without a file. For a prototype opened as a local file, its Download backup button saves a JSON file that the app's menu imports. Charts, ids and the chart format stay the same, so every saved song keeps working.

## Consequences

- One import on first run, then the app no longer reads localStorage. Changes made in the prototype after that need a new backup file.
- The dev server and the prototype's old Python server both want port 8642, so only one runs at a time. The dev server also serves `prototype/` and `songs/`, so the prototype still runs from there.
- Built-in song ids and the `songs/personal.js` format are unchanged, so personal songs load in both.
