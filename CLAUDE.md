# Song Practice: working notes for Claude

A guitar practice app for learning songs from easy chords up to the recorded version. Read `docs/product-brief.md` before any product or architecture decision.

## Who reads this repo

The repo is public on GitHub. Weigh every decision for three readers:

1. The owner, who practises with the app every day. This is the user the app is built for first.
2. Future users: other self-taught guitarists. Features must not depend on the owner's own gear, songs or devices.
3. People reviewing the repo, such as hiring managers. They read the README, the docs and the commit history to see how the product was framed, decided and built.

## Keep the docs current

Update the docs in the same change as the code. A change is not done until its docs are.

| When you change | Update |
|---|---|
| Anything a user can see or do | `CHANGELOG.md` under Unreleased, and the README's feature list if it changes what the app does |
| Scope, goals, users, principles or milestones | `docs/product-brief.md`, plus a line in its decision log |
| A choice with alternatives worth remembering (stack, data format, storage, a scope cut) | A new note in `docs/decisions/`, and add it to the index there |
| Milestone status | The status line in the README and the milestone list in the brief |
| The end of a milestone | A review in `docs/reviews/`, using the template there |
| How to run, build or test | The README's "Run it" section |
| The chart format | The in-app help in the editor, and the README example |

Never rewrite an accepted decision note. Write a new one that supersedes it, and mark the old one superseded.

## Content rules

- Lyrics, tabs and record figures are only what the owner types into the app. Never fetch, generate or copy them from websites into the app, the repo or the docs.
- Song files with lyrics, tabs or record figures stay out of the repo. They go in `songs/`, which is git-ignored. The owner's charts, starting with Let Down, are in `songs/personal.js`.
- Songs built into the app ship to everyone, so they are public domain songs with chords only, with no lyrics or tabs (see `docs/decisions/0006-public-domain-demo-song.md`).
- No personal data in the repo beyond what the owner chose to put in the brief.

## Code

- Current code: `prototype/index.html`, a single-file prototype with no build step. It runs from `file://`.
- The rebuild, a TypeScript PWA with Vite and React, is in progress in `src/` (see the brief's Architecture section and `docs/decisions/0005-typescript-pwa.md`). `src/core`, `src/audio` and `src/practice` never import React or anything from `src/ui`. `npm test` runs the unit tests, and `npm run lint` and `npm run typecheck` the checks.
- Keep the chart text format backwards compatible. Songs already saved must keep loading.
- The app stores edits, tempos and pattern choices per song id in localStorage. Never change or drop a song's id, or the owner loses that data.
- To test over HTTP (as on GitHub Pages), serve the folder with `python3 -m http.server 8642` and open `http://localhost:8642/prototype/`.
- In the browser console, `window.__practice.sync()` reports timing stats for the audio scheduler.

## Commits

- Small commits, one change each.
- Subject in the imperative, under 72 characters ("Add gap click to practice tools"). Body says why when it isn't obvious.
- Ask before committing or pushing.
