# 0006. A public domain demo song, and personal songs outside the repo

Status: Accepted
Date: 2026-10-04

## Context

The prototype shipped one built-in song, a chords-only chart of Let Down by Radiohead. Once the repo is public (see [0004](0004-public-repo-and-future-users.md)), every built-in song is published to anyone who copies the repo or opens the demo. Chord progressions on their own are rarely protected, but a chart of a commercial song still raises the question.

Removing Let Down from the code has a cost for me. The app stores my edits, tempos and pattern choices for a built-in song under its id in the browser, so deleting the song would hide all of that.

## Options

- Keep Let Down built in. Simple, but it publishes a chart of a commercial song.
- Replace it with a public domain song and delete Let Down. I lose my saved edits to it.
- Replace it with a public domain song, and load Let Down from a personal file that never enters the repo.

## Decision

Amazing Grace is the built-in demo. The hymn and its words (John Newton, 1779) are in the public domain. The chart is chords only and in 3/4, so it also shows a time signature other than 4/4. Its three levels are a downstroke per beat, a bass note then strums, and a fingerpicked version.

`index.html` loads `songs/personal.js` when it exists. The file sets `window.PERSONAL_SONGS` to a list of `{ id, chart }`, and those songs join the song list after the demo. The `songs/` folder is git-ignored. Let Down lives there with its original id, so my saved edits still apply to it.

## Consequences

- The public repo and the demo hold no charts of commercial songs.
- Someone opening the app for the first time gets a song they can play, in a key with easy open chords.
- When `songs/personal.js` is missing, which is the case for everyone but me, the browser logs one failed request and the app runs without it.
- Anyone who clones the repo can keep their own charts out of git the same way.
- The rebuild (milestone 1) replaces this file with proper song import and export, and has to import `songs/personal.js` so nothing is lost.
