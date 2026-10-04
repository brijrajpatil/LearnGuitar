# Changelog

Changes to the app and the project, newest first. Each change goes under Unreleased when it lands, and moves under a version or milestone when that ships.

## Unreleased

### Changed

- The player is rebuilt as a TypeScript web app (milestone 1). It does everything the prototype did, from the same charts, and installs as an app that works offline.
- A new look: a light, monochrome theme in neutral greys, with the Geist typeface ([decisions 0009](docs/decisions/0009-birch-light-theme-and-session-modes.md) and [0010](docs/decisions/0010-monochrome-theme-and-geist.md)). Black marks the beat you're on, where you are in the song, progress and Play. Red appears only on errors.
- The play screen asks what you're practising: Learn a section, Build speed or Play the song. Each mode shows only the controls it needs.
- Tempo is now Speed, shown with its share of the record, for example "70 BPM, 88% of the record". Quick picks set 60%, 75%, 90% or the record's speed, and a short note explains how to use speed to learn.
- The play screen fits in the window and follows browser zoom ([decision 0011](docs/decisions/0011-play-screen-fits-the-window.md)). On a laptop at 100% or 125% zoom everything is in view without scrolling. When it can't all fit, the middle scrolls and Play stays at the bottom.
- Fewer things on screen: Simplify chords and the volumes moved to Practice settings in the menu, Level sits beside the strum pattern it changes, and the banner and status rows are merged into the rest.
- The prototype's Mode (Beginner, Arranged, Record) is called Level, as in the product brief.
- The chart editor opens beside the play screen instead of over it, so the chords stay visible while you edit.
- Reset to original and Delete song ask for confirmation in a dialog.
- Songs and settings are stored in IndexedDB.
- The prototype moved to `prototype/index.html` ([decision 0008](docs/decisions/0008-prototype-folder-and-data-import.md)).

### Added

- A "How to practise" note beside the modes, which walks through Learn a section, Build speed and Play the song in order.
- Build speed shows where it started, its goal, and a progress bar.
- The app imports what the prototype saved: by itself on first run when it opens at the prototype's old address, or from a backup file through Import prototype backup in its menu.
- The prototype has a Download backup button in its editor, which saves its charts, tempos and patterns as a file for the app.

### Project

- The app's code moved into `app/`, so the repo's front page shows the README and docs first. Run npm commands from `app/` ([decision 0012](docs/decisions/0012-repo-layout.md)).
- The docs are grouped by area. The product brief and the milestone reviews are in `docs/product/`, the decisions index shows each note's area, and `docs/README.md` gives a reading order.
- Unit tests for the chart format, theory, patterns, timeline, transport, storage and practice modes, and browser tests for the main flows.
- A theme test that checks the contrast rules on every run, and a layout test across zoom levels from 100% to 400% and window widths from 360 to 1920 px.
- The prototype's timing check is an automated test: it plays for two minutes and fails on any late audio event or drift.
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
