# 0003. Lyrics and tabs are only what the player enters

Status: Accepted
Date: 2026-10-04

## Context

Singing while playing and learning lead parts are both goals of the app, so it needs lyrics and tab. The first version kept lyrics out entirely.

Song lyrics are copyrighted, and tabs are arrangements of copyrighted songs. The app is open source and the repo is public (see [0004](0004-public-repo-and-future-users.md)), so anything in the repo or the app can be copied by anyone.

## Options

- Keep lyrics and tabs out of the app. This fails two of the app's goals.
- Fetch lyrics and tabs from a website or an API, or generate them. This redistributes content the project has no right to.
- Let the player type or paste lyrics and tabs from their own sources, and keep them on their own device.

## Decision

Lyrics, tabs, record figures and cue text are only what the player types or pastes. The app has no feature that fetches or generates them.

- Song files that hold any of this stay on the player's device, and in my case in the git-ignored `songs/` folder.
- Built-in songs ship chords only.
- Later, lead parts can be imported from Guitar Pro files the player owns.

## Consequences

- Adding a song takes the player some typing. Tap to sync keeps lyric timing quick, and the target is under 20 minutes for a song's chords and lyrics.
- The repo can stay public without carrying anyone else's lyrics or tabs.
- No integration with lyric or tab services, even if a future user asks for one.
