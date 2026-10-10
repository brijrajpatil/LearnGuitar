# Decisions

One note per decision that had alternatives worth remembering. Each note says what was decided and why, so the reasoning survives after the details are forgotten.

| # | Decision | Area | Status |
|---|---|---|---|
| [0001](0001-design-system.md) | Design system: shadcn/ui on React Aria, with Tailwind CSS v4 | Design | Accepted, 2026-10-04. Partly superseded by 0009 |
| [0002](0002-single-file-prototype.md) | Start with a single-file prototype | Tech | Accepted, 2026-10-04 |
| [0003](0003-lyrics-and-tabs-are-user-entered.md) | Lyrics and tabs are only what the player enters | Product | Accepted, 2026-10-04. Partly superseded by 0017, which lets the AI draft chords |
| [0004](0004-public-repo-and-future-users.md) | Public repo, built for future users too | Product | Accepted, 2026-10-04 |
| [0005](0005-typescript-pwa.md) | Rebuild as a TypeScript PWA | Tech | Accepted, 2026-10-04 |
| [0006](0006-public-domain-demo-song.md) | A public domain demo song, and personal songs outside the repo | Product | Accepted, 2026-10-04. The single demo song is superseded by 0015 |
| [0007](0007-luma-style-and-inter.md) | shadcn's Luma style, with Inter as the font | Design | Superseded by 0009 |
| [0008](0008-prototype-folder-and-data-import.md) | The prototype moves to its own folder, and its data is imported | Tech | Accepted, 2026-10-04. Where the app lives is superseded by 0012 |
| [0009](0009-birch-light-theme-and-session-modes.md) | Birch: a light theme, session modes, and a layout that scales | Design, product | Accepted, 2026-10-04. Color and type superseded by 0010, layout by 0011, session modes by 0020 |
| [0010](0010-monochrome-theme-and-geist.md) | A monochrome theme, with Geist | Design | Accepted, 2026-10-04 |
| [0011](0011-play-screen-fits-the-window.md) | The play screen fits the window | Design | Accepted, 2026-10-04 |
| [0012](0012-repo-layout.md) | Repo layout: the app in app/, the docs grouped by product and design | Tech | Accepted, 2026-10-04. The AI tools' notes moved to AGENTS.md in 0022 |
| [0013](0013-github-pages-hosting.md) | Host the app on GitHub Pages, from the LearnGuitar repo | Tech | Accepted, 2026-10-04 |
| [0014](0014-library-page.md) | The library is a page of its own | Design | Accepted, 2026-10-04. Partly superseded by 0018, which remembers the family filter |
| [0015](0015-built-in-library-contents.md) | The built-in library: progression studies and public domain songs | Product | Accepted, 2026-10-08 |
| [0016](0016-key-and-capo.md) | Play a song in another key, with a capo to keep the record's sound | Product, design, tech | Accepted, 2026-10-08 |
| [0017](0017-ai-chord-drafts.md) | Draft chords with the player's own AI key | Product, tech | Accepted, 2026-10-08 |
| [0018](0018-library-family-filter.md) | Filter the library by chord family | Product, design | Accepted, 2026-10-08 |
| [0019](0019-react-doctor-in-ci.md) | Scan the React code with React Doctor in CI | Tech | Accepted, 2026-10-08. Partly superseded by 0023, which turns the score off |
| [0020](0020-loop-button-and-typed-speed.md) | A loop button and a speed-up switch, and speed typed in BPM or % | Product, design | Accepted, 2026-10-08 |
| [0021](0021-lyrics-on-the-strum-grid.md) | Lyrics on the strum grid, synced by tapping each word | Product, design, tech | Accepted, 2026-10-08 |
| [0022](0022-one-instruction-file-for-ai-tools.md) | One instruction file for every AI coding tool | Tech | Accepted, 2026-10-08 |
| [0023](0023-react-doctor-score-off.md) | Turn off React Doctor's score in CI | Tech | Accepted, 2026-10-08 |

## Writing a note

Copy the template below into `NNNN-short-title.md`, using the next number, and add a row to the table above. Its area is product, design or tech, or two of them when the decision covers both.

A note is never rewritten once accepted. When a decision changes, write a new note that supersedes the old one, and change the old one's status to "Superseded by NNNN".

```markdown
# NNNN. Title in sentence case

Status: Proposed | Accepted | Superseded by NNNN
Date: YYYY-MM-DD

## Context

What made a decision necessary. The facts and constraints at the time.

## Options

The alternatives considered, each with its main cost.

## Decision

What was chosen.

## Consequences

What follows from it, good and bad. What it rules out or makes harder.
```
