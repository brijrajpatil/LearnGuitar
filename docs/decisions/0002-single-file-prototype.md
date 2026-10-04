# 0002. Start with a single-file prototype

Status: Accepted
Date: 2026-10-04

## Context

I wanted a play-along for Let Down that played only my guitar part and a click, showed the current and next chord, and let me slow it down. Nothing I used did that. Before planning a full app, I wanted something I could practise with right away.

## Options

- A single HTML file with inline CSS and JavaScript. Nothing to install or build.
- A proper project from the start, with a build step, modules and tests. Slower to reach something playable.

## Decision

The first version is one `index.html` with no dependencies and no build step. It runs by opening the file in a browser. Songs are text charts edited in the app and saved in the browser's local storage.

## Consequences

- It was playable the day it was built, with nothing to set up.
- Its Web Audio scheduler measured zero drift and no late events over two-minute runs at 70 and 103 BPM. The planned rebuild keeps that engine.
- The file is about 2,000 lines with no tests and no module boundaries. Adding lyrics, lead parts and a song library on top of it would be hard to change safely, which is why milestone 1 rebuilds it (see [0005](0005-typescript-pwa.md)).
- Its chart text format becomes the import format for the rebuild, so songs saved now keep working.
