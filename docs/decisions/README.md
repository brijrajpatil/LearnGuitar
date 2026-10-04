# Decisions

One note per decision that had alternatives worth remembering. Each note says what was decided and why, so the reasoning survives after the details are forgotten.

| # | Decision | Status |
|---|---|---|
| [0001](0001-design-system.md) | Design system: shadcn/ui on React Aria, with Tailwind CSS v4 | Accepted, 2026-10-04. Partly superseded by 0009 |
| [0002](0002-single-file-prototype.md) | Start with a single-file prototype | Accepted, 2026-10-04 |
| [0003](0003-lyrics-and-tabs-are-user-entered.md) | Lyrics and tabs are only what the player enters | Accepted, 2026-10-04 |
| [0004](0004-public-repo-and-future-users.md) | Public repo, built for future users too | Accepted, 2026-10-04 |
| [0005](0005-typescript-pwa.md) | Rebuild as a TypeScript PWA | Accepted, 2026-10-04 |
| [0006](0006-public-domain-demo-song.md) | A public domain demo song, and personal songs outside the repo | Accepted, 2026-10-04 |
| [0007](0007-luma-style-and-inter.md) | shadcn's Luma style, with Inter as the font | Superseded by 0009 |
| [0008](0008-prototype-folder-and-data-import.md) | The prototype moves to its own folder, and its data is imported | Accepted, 2026-10-04 |
| [0009](0009-birch-light-theme-and-session-modes.md) | Birch: a light theme, session modes, and a layout that scales | Accepted, 2026-10-04. Color and type superseded by 0010 |
| [0010](0010-monochrome-theme-and-geist.md) | A monochrome theme, with Geist | Accepted, 2026-10-04 |

## Writing a note

Copy the template below into `NNNN-short-title.md`, using the next number, and add a row to the table above.

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
