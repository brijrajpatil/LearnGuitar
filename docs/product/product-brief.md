# Product brief

Draft 4, 2026-10-04. This is the reference for why the app exists, who it's for and what it does. When a decision changes it, the decision goes in the log at the end. Decisions whose reasons need more than a line also get a note in [`decisions/`](../decisions/).

In this brief, "I" is me, the person building the app and its first user. "You" is whoever is playing.

## Problem

YouTube has plenty of guitar tutorials, but you can't play along with them. A tutorial shows the chords and the strum, and then you have to fit them together in time with the song on your own. For many songs there is no tutorial at all.

Ultimate Guitar Tab Pro has a play-along, but it didn't work for me when learning:

- It plays several instruments at once, so I can't hear my own part.
- Its strumming play-along isn't built for learning, and it's hard to see where the chords and strums change.
- It has many settings to get through before I can practise.

Singing while playing is a skill of its own. You need to see where each lyric line starts against the strum, in time, while your hands keep going.

Many songs also have a lead part: an intro riff, fills, a solo. Knowing a song means knowing that part too, and it's written as tab.

No single app takes you from a song's first chords to playing and singing it with a click at the record's tempo. So I'm building one, first for myself, made to grow as my playing does.

## Users

### First user: me

I'm a self-taught guitarist who knows the basic open chords. My gear:

- an acoustic guitar
- an electric guitar, a Yamaha Pacifica 112V, played through a Boss Katana Gen 3 amp
- a capo

I practise on a Mac, and later also on an Android tablet (a OnePlus Pad 4).

For now I'm learning popular songs I can sing along to. Later I want to move on to more complex pieces, so the app has to extend as I do.

### Later: other self-taught guitarists

The repo is public, and once the app works well for me I want other people to use it. The people I have in mind know some open chords, learn songs from tabs and videos, and want to play and sing whole songs in time.

What that means while I'm still the only user:

- Features ship after I've used them in real practice. I don't build for a guess about what other people want.
- Nothing in the app depends on my gear, songs or devices. My setup shapes the examples and defaults, and the features stay generic: an amp settings field, not a Katana field.
- Someone opening the app for the first time can play a built-in song without reading any docs.
- Accounts, a server and sharing wait until other people use the app and ask for them (see [Not yet](#not-yet)).

## Goals

The app exists to build these skills:

1. Steady tempo: play a whole song with a click at the record's tempo, without rushing or dragging.
2. Clean chord changes: land each change on the beat with no gap in the strum.
3. Strong technique: keep the strumming hand moving through missed strums, use the right down and up strokes, and fret clean chords.
4. Sound like the record: every part ends at its recorded version, reached through simpler levels.
5. Sing while playing: start each line on time and keep the strum steady while you sing.
6. Play the lead parts: riffs, fills and solos, from simple versions up to the recorded ones.

### How to tell it's working

Proposed targets, to revisit after a few weeks of use:

- I use the app in every practice session, without switching between YouTube, Ultimate Guitar and a metronome.
- Starting practice takes one click or key press and resumes where I stopped.
- Adding a new song's chords and lyrics takes under 20 minutes. A lead part takes longer, depending on its length.
- For each song I'm learning, the log shows my level and clean tempo going up week by week.
- Once the app is public: a first-time visitor is playing a built-in song within a minute of opening it.

## Principles

1. Play mode shows only what your hands and voice need next, readable from 1.5 m. Settings live in setup mode.
2. Your hands stay on the guitar. Everything in play mode works from the keyboard, so a Bluetooth foot pedal (which acts as a keyboard) can drive it.
3. You hear the guitar parts you choose and a click. Nothing comes from the original recording.
4. Every part has a simpler version. For rhythm, that goes down to easy chords and one downstroke per beat.
5. Your songs and practice history stay on your devices, as files you can export. Lyrics, tabs and cue text are only what you enter. The app has no way to fetch them, and its AI drafts chords only.
6. The app is built in small steps. Each milestone ends with a week of real practice and a short written review before the next one starts.
7. The work is done in the open. The docs say why each decision was made, and they change in the same commit as the code.

## A practice session

The design starts from this flow:

1. Open the app. It offers the song and section you last worked on, at the level and tempo you reached.
2. Warm up for a minute on the chord change you find hardest in that song.
3. Loop the section with the speed trainer. After each pass, press a key to mark it clean or not. The tempo goes up only after clean passes.
4. Once the guitar is steady, turn on lyrics. Speak the words in rhythm over the strum first, then sing them.
5. Play the whole song through at your current level.
6. On other days, work on the lead part the same way, with the rhythm part playing underneath if you want it.
7. If you want, record a take and listen back.
8. The session goes into the log and the song's progress updates.

## Features

Terms:

- A part is one guitar line in a song: rhythm, or a lead part such as a riff or a solo.
- A level is one version of a part. A part's levels form its ladder.
- A pattern is the strum or pick sequence a rhythm section uses at a level.

### Planned

Song library

- A library page lists every song with its chords and difficulty, with search and filters for collection and difficulty. Built 2026-10-04 (see [decision 0014](../decisions/0014-library-page.md)).
- Songs are saved on the device and can be exported and imported as text files.
- Each song has title, artist, key, tempo, time signature, tuning, capo fret, and which guitar it's for. Electric songs get a notes field for amp settings.
- Each song can link to its sources: the tab you learn from, and a tutorial video with a timestamp for each section.
- Cue text is only what you type.
- Add a song by name. The AI drafts its chords with your own free Gemini key, or the app converts a chord sheet you paste. Chords only, kept on your device. Built 2026-10-08 (see [decision 0017](../decisions/0017-ai-chord-drafts.md)).
- The app ships with a library of progression studies and public domain folk and traditional songs, so it's playable on first open. Built-in songs have chords only, with no lyrics or tabs. Built 2026-10-08 with 17 studies and 34 songs (see [decision 0015](../decisions/0015-built-in-library-contents.md)).

Parts and levels

- A song has a rhythm part and can have lead parts. Each part has its own ladder, from easy to the recorded version.
- A rhythm level sets the chords (simplified or full) and a pattern for each section. New songs start with three rhythm levels: Beginner, Arranged and Record.
- A lead level is a version of the lead you write, for example the main notes only, without bends, then the full part.
- The app tracks the tempo you've reached for each section of each part at each level.

What you hear

- A mixer with one row per part, plus the click. Each row has a volume and a mute.
- By default you hear only the part you're practising and the click. You can add the other part as backing, for example the rhythm part under a solo.

Play mode

- Everything in the current player: section and bar, current chord with diagram, next chord with beat countdown, strum strip, pattern-change warning, song map, count-in.
- Capo: diagrams show the shapes you finger, the header shows the capo fret, and the synth plays the pitch that sounds.
- Key and capo: the header shows the record's key, and you can play the song with the chords of another key. Picking a key sets the capo that keeps the record's sound, so I can learn one chord family at a time and still play the songs I want. Built 2026-10-08 (see [decision 0016](../decisions/0016-key-and-capo.md)).
- Missed strums show as faint arrows, so your hand keeps the down-up motion going.
- A sixteenth-note grid for patterns that need it, and triplets for shuffle feels.
- For lead parts, a scrolling tab view with the current note lit and the chord name above.

Lyrics

- You paste or type the lyrics. The app does not fetch them.
- Tap to sync: play the song and tap a key as each line starts. The app snaps each tap to the nearest beat. You can then move a word onto a different beat by hand.
- In play mode, the current line is shown large with chord names above the words where the chords change, and the next line below. The part being sung lights up in time.
- The sing layout shows lyrics and chord names only, at full size.

Practice tools

- Three modes on the play screen, each showing only its controls: Learn a section (loop it), Build speed (loop it and speed up each time through), and Play the song. Built in milestone 1 (see [decision 0009](../decisions/0009-birch-light-theme-and-session-modes.md)).
- Speed shown against the record's speed, with quick picks and a note on how to use it.
- Section loop with a speed trainer that steps up after clean passes.
- Chord change drill. The app lists every change in the song (A to E, E to F#m and so on), most frequent first. You pick one, loop it in time, and count clean changes per minute.
- Gap click. The click plays for a few bars, then drops out for a few, to check that you hold the tempo yourself.

Progress

- A session log: date, song, part, section, level, tempo, and clean or not for each pass.
- A song page with each section's level and best clean tempo for each part, and the suggested next step.

Editor

- The text editor from the current player, extended for lyrics and lead tab, with errors shown by line.
- A pattern grid: click slots to enter a rhythm pattern and hear it as you edit.
- A tab grid: click a string and beat, type the fret, and hear the note.
- Technique marks for lead: hammer-on, pull-off, slide, bend, vibrato, palm mute.

Sound and input

- Acoustic and clean electric tones, both synthesized. Lead parts can use a light overdrive tone.
- Record yourself over the click and listen back, through the computer's mic or an amp or audio interface connected over USB.

### Later

- Strum timing feedback: detect your strums from the recording input and show how early or late each lands against the click. This needs a test first to see how reliable it is.
- Import lead parts from Guitar Pro files you own.
- A vocal melody guide, played as one more part, to help you pitch the tune.
- Visual chord entry: click a bar, pick a chord.
- The tutorial video shown beside the chart, jumping to the current section's timestamp.
- Sync between devices.

### Not yet

These wait until other people use the app and ask for them. Until then, exporting and importing song files covers moving songs between devices.

- Accounts and a server.
- Sharing songs or progress with other people.

### Not doing

- Fetching or generating lyrics or tabs. You enter them from your own sources.
- Audio from original recordings.
- Grading whether you played the right notes or chords.

## Architecture

### Platform

A TypeScript web app, installable as a PWA and working offline. One codebase runs on the Mac (Chrome, or Safari's Add to Dock) and on an Android tablet (Chrome). It keeps the Web Audio engine from the current player, which measured zero drift and no late events over two-minute runs at 70 and 103 BPM. A web app also means anyone can try it from a link, with nothing to install.

Native apps would mean one for macOS and one for Android, or a cross-platform framework with its own audio code. If the app later needs a desktop window or direct file access, the same web app can be wrapped with Tauri, which builds for both macOS and Android.

Stack: TypeScript, Vite, React for the UI, Vitest and Playwright for tests. The design system is shadcn/ui on React Aria Components with Tailwind CSS v4 ([decision 0001](../decisions/0001-design-system.md)). The music and audio code is plain TypeScript with no React imports, so the UI library can change without touching it.

### Modules

Data flows one way: song, then timeline, then audio and screen.

| Module | What it does |
|---|---|
| `core/song` | Song data types (parts, sections, chords, lead notes, lyrics), with a schema version and migrations so old songs keep loading |
| `core/chart` | Reads and writes the text format, for import, export and the text editor |
| `core/theory` | Chords, voicings, tunings, capo and simplification rules |
| `core/pattern` | Strum and pick patterns: presets, custom patterns and figures written in a chart |
| `core/timeline` | Turns a song, the chosen parts and levels, and settings into one timed list of events: clicks, strums, picks, lead notes, chord changes, lyric syllables, section starts, pattern-change warnings |
| `audio` | Lookahead scheduler, instruments (click, acoustic, electric, overdrive), the mixer, and input for recording |
| `practice` | Transport (stopped, count-in, playing, looping), speed trainer, drills, gap click |
| `data` | Storage in IndexedDB behind a small interface, plus export, import and backup, and the one-time import from the prototype |
| `ai` | Adding a song: the Gemini client, the steps that draft and check a chart, and the converters from an AI draft or a pasted chord sheet to a chart |
| `app` | Connects the modules: loads saved data, holds the app's state, and saves changes |
| `ui` | Play mode (chord, strum strip, tab and lyric views), setup, library, editor, progress |

Audio and the play screen both read the timeline's event list, so what you see can't drift from what you hear. New features such as a drill, the sing layout or strum timing feedback are new readers of the same list.

Time is stored in ticks, 12 per beat. That covers eighth notes (6 ticks), sixteenths (3) and eighth-note triplets (4).

The tab view is our own scrolling six-line view, drawn from the timeline. The open source library alphaTab renders tab and standard notation and reads Guitar Pro files. It's the candidate for the Guitar Pro import later, converted into our song model on import.

Extension points, each an interface:

- instruments, for a new guitar tone or the vocal guide
- pattern symbols and technique marks
- drills
- input analysers, for strum timing
- importers, for Guitar Pro files
- storage backends, for sync

### Engineering practices

- Git from the first commit, with small commits under my own Git identity. The commit history is public.
- Docs change in the same commit as the code. [`CLAUDE.md`](../../CLAUDE.md) lists which doc each kind of change updates.
- [`CHANGELOG.md`](../../CHANGELOG.md) gets an entry for every change a user can see.
- Each decision with alternatives worth remembering gets a note in [`decisions/`](../decisions/) with its reason.
- Each milestone ends with a written review in [`reviews/`](reviews/).
- Song files with lyrics, tabs or record figures stay out of the repository, in a git-ignored `songs/` folder.
- Unit tests for the text parser, theory and timeline. Browser tests for the main flows.
- The timing check from the current player becomes an automated test: play a song for two minutes and fail on any late audio event or drift.
- GitHub Actions runs the checks and tests on every pull request and every push to `main`, and `main` deploys to GitHub Pages ([decision 0013](../decisions/0013-github-pages-hosting.md)).
- Keyboard first, a high contrast light theme, and large type that follows browser zoom.

## Milestones

Each milestone ends with a week of practice and a review: what I used, what got in the way, what to change.

0. Prototype. Done 2026-10-04. The single-file player in `index.html`, built around Let Down, with Amazing Grace as the public built-in demo.
1. Foundation. Project setup, the modules above, and the current player rebuilt on them, with Amazing Grace built in and my songs imported. Done when it matches the current player, timing test included. Built 2026-10-04 and in its week of practice. The milestone 1 review closes it.
2. Library, capo and lyrics. Multiple songs, song setup (capo, tuning, guitar, amp notes, source links), import and export, resume where you stopped. Lyrics entry with tap to sync, lyrics in play mode, and the sing layout. Add my next songs.
3. Levels and progress. Per-part ladders, marking passes clean, the trainer stepping up on clean passes, the session log and song page.
4. Rhythm technique. Chord change drill, gap click, faint arrows for missed strums, sixteenth and triplet grid, pattern grid editor.
5. Lead parts. Parts and the mixer, tab view and tab grid editor, technique marks, lead levels, electric and overdrive tones.
6. Tablet and recording. Touch layout, install on the Android tablet, recording and playback, then the strum timing test.

## Open questions

1. Which songs come after Let Down, and which of them have lead parts I want? They decide what milestones 2 and 5 need.
2. Should the speed trainer step up only after passes marked clean? Recommended: yes.
3. Do I have, or want, a Bluetooth foot pedal? It would let me start, stop and mark passes without taking a hand off the guitar.
4. Is a line's start time enough for lyric sync, or does each word need its own beat? Recommended: tap line starts, spread the words across the line's bars, and fix single words by hand where the timing matters.
5. A name for the app. The repo is LearnGuitar, so the demo URL is `brijrajpatil.github.io/LearnGuitar/`. The app still calls itself Song Practice, the prototype's window title says Strum Practice, and the local folder says song-practice.
6. When to add a license. Without one, people can read the code but not reuse it. Worth deciding before inviting other people to contribute.

## Decision log

- 2026-10-04: Lyrics are in scope, entered by the player. This replaces the earlier rule that kept lyrics out of the player. The app still never fetches lyrics or tabs. See [decision 0003](../decisions/0003-lyrics-and-tabs-are-user-entered.md).
- 2026-10-04: Lead guitar parts are in scope, as their own parts with their own levels.
- 2026-10-04: The repo is public, and the app is built for other users later as well as for me. Accounts, a server and sharing move from Not doing to Not yet. See [decision 0004](../decisions/0004-public-repo-and-future-users.md).
- 2026-10-04: The app is rebuilt as a TypeScript PWA for the Mac and the Android tablet from one codebase, using Vite and React. See [decision 0005](../decisions/0005-typescript-pwa.md).
- 2026-10-04: The design system is shadcn/ui on React Aria Components, styled with Tailwind CSS v4, with the app's own tokens for play mode. See [decision 0001](../decisions/0001-design-system.md).
- 2026-10-04: The built-in demo song is Amazing Grace, a public domain hymn. My own songs, starting with Let Down, load from a git-ignored `songs/personal.js`. See [decision 0006](../decisions/0006-public-domain-demo-song.md).
- 2026-10-04: No license for now. The code is all rights reserved: anyone can read it on GitHub, but reusing it needs my permission.
- 2026-10-04: Milestone 1 built. Strum patterns get their own module, `core/pattern`, and the `app` module connects the others.
- 2026-10-04: Proposed shadcn's Luma style and the Inter font, to confirm in the milestone 1 review. See [decision 0007](../decisions/0007-luma-style-and-inter.md).
- 2026-10-04: The prototype moves to `prototype/`, and the app imports what it saved. See [decision 0008](../decisions/0008-prototype-folder-and-data-import.md).
- 2026-10-04: The modes are called levels in the app, as in this brief.
- 2026-10-04: After reviewing the rebuild, the look changes to Birch: a light theme with one accent, Lexend, and sizes that follow browser zoom. The play screen gets three practice modes, and speed is shown against the record. This replaces the proposed Luma and Inter look. See [decision 0009](../decisions/0009-birch-light-theme-and-session-modes.md).
- 2026-10-04: The look goes monochrome, in neutral greys with black for emphasis and red only for errors, and the font changes to Geist. Color comes later. See [decision 0010](../decisions/0010-monochrome-theme-and-geist.md).
- 2026-10-04: The play screen fits in the window, like a desktop app. The chord cards take the height left over, and when it can't all fit, the middle scrolls while Play stays at the bottom. See [decision 0011](../decisions/0011-play-screen-fits-the-window.md).
- 2026-10-04: The code moves into `app/` and the docs group into product, design and decisions, so the repo's front page leads with the product. See [decision 0012](../decisions/0012-repo-layout.md).
- 2026-10-04: The app is hosted on GitHub Pages from the public repo LearnGuitar, at <https://brijrajpatil.github.io/LearnGuitar/>. Pull requests and pushes to `main` run the checks, and `main` deploys. See [decision 0013](../decisions/0013-github-pages-hosting.md).
- 2026-10-04: Songs are picked from a library page, opened from the song's title or the / key, in place of the drop-down menu. See [decision 0014](../decisions/0014-library-page.md).
- 2026-10-08: The app ships a library of 17 progression studies and 34 public domain folk and traditional songs. Popular songs were considered and left out, so the repo and the site still publish no charts of commercial songs. This work went ahead before the milestone 1 review. See [decision 0015](../decisions/0015-built-in-library-contents.md).
- 2026-10-08: Each song can be played with the chords of another key, saved per song, with a capo that keeps the record's sound where one fits. The header shows the record's key. See [decision 0016](../decisions/0016-key-and-capo.md).
- 2026-10-08: A player can add a song by name. The AI drafts the chords with the player's own free Gemini key, or the app converts a chord sheet they paste. Drafts are chords only and stay on the player's device, and I pay nothing for the AI. This partly supersedes decision 0003. See [decision 0017](../decisions/0017-ai-chord-drafts.md).
