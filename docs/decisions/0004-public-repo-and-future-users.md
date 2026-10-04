# 0004. Public repo, built for future users too

Status: Accepted
Date: 2026-10-04

## Context

Until now the brief treated me as the app's only user. I'm publishing the project on GitHub to show how I build a product, from the problem through decisions to shipped software. I also want other guitarists to use the app once it works well for me, and it may grow beyond a personal tool.

## Options

- Keep the repo private and publish later. The history and the reasoning behind early decisions would be lost or rewritten.
- Make it public now, and keep building only for myself.
- Make it public now, keep myself as the first user, and avoid choices that would lock other people out.

## Decision

The repo is public from the first commit. I stay the first user: features ship after I've used them in real practice. Where it costs little now, the app is built so other people can use it later.

## Consequences

- The docs are part of the work. The README, product brief, decision notes, milestone reviews and changelog are updated in the same commit as the code. `CLAUDE.md` lists which doc each kind of change updates.
- Features stay generic even when my setup inspired them: an amp settings field instead of a Katana field, any Android tablet instead of mine.
- My song files, with lyrics, tabs and record figures, stay out of the repo in a git-ignored `songs/` folder. Built-in songs ship chords only (see [0003](0003-lyrics-and-tabs-are-user-entered.md)).
- A first-time visitor must be able to play a built-in song without reading docs.
- Accounts, a server and sharing move from "Not doing" to "Not yet". They wait until other people use the app and ask for them. Storage already sits behind an interface, so a sync backend can be added later.
- The commit history is public, so commits are small, with clear messages, under my own Git identity.
- Proposed: a live demo on GitHub Pages. It gives the README a link to try the app, and it also provides the HTTPS hosting a PWA needs to install on the tablet.
- Still open: which song ships built in, and the license. Both are in the brief's open questions.
