# Song Practice

A guitar practice app for learning songs you can sing along to. It plays your guitar part and a click, shows the chord you're on and the one coming next, and takes each song from easy chords up to the way it's played on the record.

It's a working prototype that I use for my own practice. I'm now rebuilding it as an installable web app ([milestone 1 of 6](docs/product-brief.md#milestones)).

## Why I'm building it

I'm a self-taught guitarist. YouTube tutorials show the chords and the strum, but you can't play along with them, and for many songs there's no tutorial at all. Ultimate Guitar's play-along mixes several instruments, so I couldn't hear my own part or see where the chords and strums change.

I wanted one screen that plays only my part with a click, slows down when I need it to, and has a simpler version of every part as a step toward the recorded one. I'm the first user. Once it works well for me, I want other guitarists to use it too.

The [product brief](docs/product-brief.md) has the full problem, goals, features and plan.

## What it does now

- Plays a synthesized acoustic guitar part and a click in time, with a one-bar count-in.
- Shows the current and next chord with diagrams, and counts down the beats to the next change.
- A strum strip shows each down, up and missed strum as it plays, and a banner warns before the pattern changes.
- Three levels for every song. Beginner strums one downstroke per beat. Arranged uses each section's own pattern. Record plays the figure from the record where the chart has one.
- Simplify chords swaps hard shapes for easier ones, for example F#m for a four-string version.
- Loops a section, and a speed trainer adds a few BPM on each pass up to a target.
- A song map along the bottom: click a bar to jump to it, or a section name to loop it.
- Songs are text charts you write in the built-in editor, with errors marked by line. Custom strum and pick patterns can be any length and run on across bar lines.
- Works from the keyboard: Space plays and pauses, the arrow keys change section and tempo, L loops.

Songs and settings are saved in your browser. Nothing is sent anywhere.

## Run it

Download or clone the repo and open `prototype/index.html` in Chrome or Safari. There's nothing to install and no build step. It opens on Amazing Grace, a public domain hymn in 3/4 with easy open chords.

To keep your own charts out of git, put them in `songs/personal.js`. The `songs/` folder is git-ignored, and the app loads the file when it exists:

```js
window.PERSONAL_SONGS = [
  { id: 'my-song', chart: `title: My song
tempo: 90

[Verse 1] pattern=C
G | C | Em | D` },
];
```

Keep each `id` the same once you've used a song. The app saves your edits and tempos under it.

## Writing a song chart

A chart is plain text. This one has two sections:

```text
title: New song
key: G
time: 4/4
tempo: 90

[Verse 1] pattern=C
G | G | C | C | Em | Em | D | D
[Chorus] pattern=B record=D.DU.UDU
C | G | D | Em*2
```

- `pattern=` picks a preset strum (A to E) or a figure. `record=` is the figure as played on the record, used at the Record level.
- Figures have one character per eighth note: `D` and `U` strum down and up, `.` misses, `1` to `6` pick a string (1 is high E), `B` picks the chord's bass note.
- Bars are separated by `|`. Two chords in a bar split it. `Em*2` repeats a bar.

The full reference is in the app: Edit chart, then Chart format.

The app never fetches lyrics or tabs. Anything like that in a chart is what you typed from your own sources ([why](docs/decisions/0003-lyrics-and-tabs-are-user-entered.md)).

## Where it's going

1. Foundation: rebuild the prototype as a TypeScript PWA, with tests.
2. A song library, capo and lyrics with tap to sync.
3. Levels per part, marking passes clean, and a practice log.
4. Rhythm technique: chord change drill, gap click, sixteenth notes and triplets.
5. Lead parts: riffs and solos in tab, with a mixer.
6. Tablet support and recording yourself.

Each milestone ends with a week of real practice and a written review before the next one starts.

## Project docs

- [Product brief](docs/product-brief.md): problem, users, goals, features, architecture and milestones
- [Decisions](docs/decisions/): what was decided and why
- [Milestone reviews](docs/reviews/): what happened after each milestone, and what changed
- [Changelog](CHANGELOG.md): what changed in the app

## License

No license yet, so the code is all rights reserved. You're welcome to read it and try the app. Reusing the code needs my permission.
