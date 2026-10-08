# 0012. Repo layout: the app in app/, the docs grouped by product and design

Status: Accepted. The working notes for AI tools moved from `CLAUDE.md` to `AGENTS.md` in [0022](0022-one-instruction-file-for-ai-tools.md).
Date: 2026-10-04

Supersedes where [0008](0008-prototype-folder-and-data-import.md) put the app. The rest of 0008 stands: the prototype stays in `prototype/`, the dev server keeps it at its old address, and the app imports what it saved.

## Context

The repo goes public as a portfolio piece ([0004](0004-public-repo-and-future-users.md)). On GitHub, a folder's file list comes first and its README renders below it. The root's list had 23 entries, and 13 of them were package and tool config: four tsconfig files, Vite, ESLint, Playwright, Prettier, shadcn, `.gitignore` and the npm files. A reader had to scroll past them to reach what the product is and why it exists.

The docs had the product brief at the top of `docs/`, milestone reviews and decision notes in their own folders, and no design doc. The app's current look was spread over four decision notes (0001, 0009, 0010 and 0011), each describing one change.

## Options

For the code:

- Keep the app at the root, the usual layout for a single JavaScript app. Developers expect it and commands run from the root, but the root list stays long. 0008 chose this layout.
- Move the app into `app/`. The root then shows the README, the changelog and a few folders. Commands run from `app/`, and a deploy builds from a subfolder.

For the docs:

- Keep them flat and add a `design/` folder. Fewer links change.
- Group them into `product/`, `design/` and `decisions/`. Product and design docs sit side by side, with room for research and roadmaps later.
- Split the decision notes by area as well. Many notes cross areas (0009 covers the theme, practice modes and layout), so the split would break the numbering and the chain of superseded notes.

## Decision

The app moves into `app/`, and the docs are grouped into `product/`, `design/` and `decisions/`. Decision notes stay one numbered series for every area.

| At the root | What it holds |
|---|---|
| `README.md` | What the app is, why it exists, how to run it, and a map of the repo |
| `CHANGELOG.md`, `CLAUDE.md` | The changelog, and working notes for Claude |
| `app/` | The web app and everything npm runs: package files, tool config, `index.html`, `public/`, `src/` and `tests/` |
| `docs/product/` | The product brief and the milestone reviews |
| `docs/design/` | The design system as it is now, with screenshots |
| `docs/decisions/` | These notes |
| `prototype/` | The single-file prototype |
| `songs/` | Personal charts, git-ignored. It stays at the root because both the app and the prototype load it |

The dev server serves `songs/` and the prototype from the repo root at the addresses they had before, so the prototype still runs at `http://localhost:8642/prototype/` with what it saved. The preview server serves `songs/` too. Neither folder is copied into a build.

## Consequences

- The root's list on GitHub has 8 entries, and the README follows soon after.
- npm commands run from `app/`. CI and a GitHub Pages deploy set their working directory to `app/`.
- Developers who expect a single app at the root need one more click. `app/README.md` has the commands and the code map, and GitHub shows it when they open `app/`.
- Earlier decision notes keep the paths they were written with, such as `src/index.css` or `docs/product-brief.md`. Code paths now start with `app/` (`app/src/index.css`), and the brief is in `docs/product/`.
- The files moved with `git mv`, so `git log --follow` shows each file's history from before the move.
