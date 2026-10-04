# Changelog

Changes to the app and the project, newest first. Each change goes under Unreleased when it lands, and moves under a version or milestone when that ships.

## Unreleased

### Changed

- The prototype moved to `prototype/index.html` ([decision 0008](docs/decisions/0008-prototype-folder-and-data-import.md)).

### Added

- The prototype has a Download backup button in its editor, which saves its charts, tempos and patterns as a file for the app.

### Project

- Unit tests for the chart format, theory, patterns, timeline and transport.
- Set up the repo for publishing on GitHub: README, this changelog, decision notes, a milestone review template, and `.gitignore` rules that keep personal song files out of the repo.
- `CLAUDE.md` lists which doc each kind of change updates, so the docs stay current with the code.
- Product brief draft 4: written in my own voice, adds future users as a second audience, and moves accounts, a server and sharing from "Not doing" to "Not yet".
- Chose the platform for the rebuild: a TypeScript PWA built with Vite and React, one codebase for the Mac and Android tablets ([decision 0005](docs/decisions/0005-typescript-pwa.md)).
- Chose the design system for the rebuild: shadcn/ui on React Aria Components with Tailwind CSS v4, plus contrast and touch target rules for play mode ([decision 0001](docs/decisions/0001-design-system.md)).

## Prototype, 2026-10-04

### Added

- Single-file player (`index.html`) that runs from a local file with no build step.
- Synthesized acoustic guitar and click on a Web Audio lookahead scheduler, with a one-bar count-in.
- Current and next chord with diagrams, a beat countdown to the next change, a strum strip, a pattern-change warning, and a clickable song map.
- Beginner, Arranged and Record levels, and Simplify chords.
- Section loop and a speed trainer.
- Text chart editor with errors marked by line, custom strum and pick patterns, and songs saved in the browser.
- Amazing Grace, a public domain hymn in 3/4, as the built-in demo song, chords only.
- Personal songs load from a git-ignored `songs/personal.js`, so private charts stay out of the repo.
