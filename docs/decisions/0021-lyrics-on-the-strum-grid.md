# 0021. Lyrics on the strum grid, synced by tapping each word

Status: Accepted
Date: 2026-10-08

Builds the lyrics part of milestone 2 and answers the brief's open question 4. [0003](0003-lyrics-and-tabs-are-user-entered.md) still holds: lyrics are only what the player types or pastes.

## Context

Goal 5 in the brief is to sing while playing: start each line on time and keep the strum steady while you sing. The owner asked to see the lyrics directly under the strum beats, so they can learn where each word falls against the strumming hand.

The brief planned tap to sync by line: tap as each line starts, spread the words over the line's bars, and fix single words by hand. Its open question 4 asked whether a line's start is enough or each word needs its own beat. A word spread evenly over a line rarely lands on the strum it's sung with, which is what the owner wants to see.

The chart already gives strums one character per eighth note, and the strum strip shows a bar as eighth-note slots. So eighth notes are a grid the player already reads.

The owner chose from mockups and answered two questions: the layout, and how to put the words on the beats.

## Options

Layout:

- 3A. A word under each strum slot only. Compact, but it shows one bar's words at a time.
- 3B. A word under each strum slot, plus a card with the whole line being sung, chord names above it and the next line below. One more row on screen.

Syncing:

- Tap each word or syllable as it's sung, snapped to the nearest eighth note.
- Type the words into the chart by hand, one per eighth note.
- Tap each line's start and spread its words evenly. Faster, but words land on the wrong beats more often.

The owner chose 3B and tapping each word.

## Decision

### In the chart

A line starting with `>` holds the words for the line of bars above it, using the strum figure's idea: one token per eighth note.

```text
[Verse 1] pattern=C
G | G7 | C | G
> . . . . /La- . | li- . . . lo . | sun . . . on . | high . the . sea .
```

- `|` separates bars in the same order as the bars above. A bar written `G*4` takes four parts.
- In a bar, each word takes the next eighth note, and `.` is an eighth note without one. Trailing dots can be left out.
- A word ending in `-` is a syllable that joins the next word ("La-" "li-" "lo" shows as "Lalilo").
- `/` before a word starts a sung line, so a line can start on a pickup in the bar before. A chart without any `/` starts a sung line at each `>` line. The song's first word always starts one.
- Errors are reported by line: no bars above, more parts than bars, more words and dots than eighth notes.

Older charts have no `>` lines, so they parse as before. Each bar in the song model gets a `lyrics` list (empty when it has none). The built-in songs have none, and a test keeps it that way.

### On the play screen

- A lyric card between the chord cards and the strum strip shows the line being sung, with each chord change written above the first word sung on it, and the next line below in muted text. The chords follow the key and capo the player picked. The word being sung has the emphasis fill, like the strum slot it's on, since both mean "now".
- The strum strip shows each word under its eighth note for the current bar.
- A Lyrics switch in the strum card hides them, for practising the guitar alone first. It shows only for songs with lyrics, and the setting is kept.
- With lyrics showing, the chord cards' smallest height is 8rem instead of 12rem and the strum slots use their compact size below roomy windows. Windows at least 64rem wide and 39rem tall still show everything without scrolling, such as a 1366x768 laptop or a MacBook Air 13" at 125% zoom. At 37.5rem to 39rem, the middle scrolls about 1rem and Play stays put. Short windows leave the chord names to the chord cards and hide the next line.

### Tap to sync

- "Add lyrics" or "Sync lyrics" in the menu opens a panel where the chart editor opens. Only one of the two is open at a time.
- The player pastes the words. Each line is a sung line, and hyphens split a word into syllables, one tap each.
- They pick a section, press Start, and press Space (or the Tap button) as each word starts, singing along to the guitar part. Playing slower makes it easier, and the snapping works the same at any speed. Backspace takes a tap back. Clicking a word starts from it. It stops after the last word.
- The transport keeps the audio time of the last 32 slots it played. A tap goes to the slot heard nearest to it, including slots still queued, so an early tap isn't pushed late. Two taps on one eighth note put the second word on the next one.
- Save writes `>` lines into the chart and saves it. The new words replace the words from the bar of the first tap to the bar of the last. Words before and after stay. The pasted words aren't saved, but they stay while the app is open, so the next verse can follow.
- The panel won't sync while the chart editor has edits that aren't applied, since the lyrics would go into the wrong version. The editor now keeps its text as a draft a moment after typing stops, so switching panels loses nothing.

## Consequences

- Words sit exactly on the strums they're sung with, in a format the player can read and fix in the editor.
- Words fall on eighth notes. A word sung on a sixteenth goes to the nearest eighth, the same limit the strum patterns have until milestone 4 adds a sixteenth-note grid.
- Fixing one word means editing its `>` line. Dragging a word to another beat can come later.
- The brief's sing layout (lyrics and chords only, at full size) isn't built yet.
- The play screen holds one more row when a song has lyrics. The chord to play now still reads first, and a layout test checks it at laptop sizes.
