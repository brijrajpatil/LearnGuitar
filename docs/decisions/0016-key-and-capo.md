# 0016. Play a song in another key, with a capo to keep the record's sound

Status: Accepted
Date: 2026-10-08

## Context

Beginners learn chords in families: the chords of one key, such as G, C, D and Em for G major. The owner wants to learn one family at a time and still play the songs they care about, which are often in other keys. Let Down is in A (A, E, F♯m, D), and F♯m is a barre chord.

Guitarists handle this with a capo. Play the song with G shapes and put a capo on fret 2: you finger G, D, Em and C, and it sounds in A like the record. When no capo fits, the song can still move to the family you know and sound in a different key.

Until now the app showed a chart's key only as text in About this song. Charts could set a capo, and the synth already played the pitch a capo gives. There was no way to move a song to other chords.

The owner chose between three mockups for where the control goes.

## Options

How the choice works:

- Transpose only. Move the chords to a new key. Simple, but a song in the G family then sounds lower than the record, and the app is built to end at the record's sound (brief goal 4).
- Capo only. Suggest a capo for the shapes written in the chart. It does nothing for a chart written in A.
- Shapes plus a capo, chosen together. Pick the shapes you play (a key), and the app sets the capo that keeps the record's sound. You can change the capo, for example to 0 to play without one. Transpose and capo are the same model: what you hear is the shapes plus the capo.

Where it goes:

- A. A button in the header beside the song's title.
- B. A chip in the Now card, beside the chord.
- C. A select beside Level in the strum card.

Which keys to offer:

- The five families built from open chords: C, G, D, A and E.
- All 12 keys.

How long a choice lasts:

- Per song.
- One family for every song.

How to draw chords in keys the library doesn't cover, such as B♭ or C♯m:

- Add every chord in every key to the library by hand. Hundreds of shapes, each a chance for a typo.
- Generate them. Common qualities use the barre shapes guitarists learn, with the root on the low E or the A string, nearest the nut. Slash chords and rarer qualities come from a search of the fretboard. The library keeps the open shapes people learn first, and gains the open shapes the five families need that it lacked.

## Decision

- Shapes plus a capo. A song's choice is two numbers: the semitones its chord names move, and the capo's fret. Picking a key sets the capo that keeps the record's sound when that capo is on fret 7 or lower. Higher frets get cramped, so the list says "No capo fits" and the song plays in the new key with no capo.
- The control is a button in the header (mockup A). It reads "Key of A". After a change, quieter text follows: "G shapes, capo 2", or "Playing in G" without a capo. The K key opens it too.
- The popover lists all 12 keys: the five open-chord families first, then the other seven from C up. A minor song lists minor keys, so Em sits in the G family. Each row shows the song's chords in that key, how many need a barre across four strings or more, and the capo that keeps the record's sound. Under the list, a capo stepper says what you'll hear: "Sounds like the record", or "Sounds in G, 2 frets lower than the record".
- The choice is saved per song, in settings. A song with no saved choice plays as its chart is written.
- A chart's `key:` line is the key of the chords as written. The record's key is that key plus the chart's capo. When a chart has no key line, the app works the key out from its chords and says so.
- Chord names move with sharps or flats to suit the new key (B♭ in F, never A♯). A chart's own `chord` shapes are fingered for its key, so a moved song uses built-in or generated shapes. Its `simplify` rules move with the chords. A chord name that doesn't start with a note, such as a custom `Riff`, can't move, so the keys that would need it are listed as unavailable.
- Chord shapes come from the chart, then the library, then the generator.

## Consequences

- The owner can learn the G family and play Let Down with a capo on fret 2, with no barre chords, at the record's pitch.
- Every song gets the same choice, so a future user with any song can do the same.
- Generated barre shapes are correct and standard. Generated slash chords and rare qualities are playable but sometimes not the voicing a teacher would pick. A chart can still define its own `chord` shape for the key it's written in.
- The header holds one more button. On a phone it shares the first row with the title, and Edit chart moves to the second row.
- A choice lasts per song. If the owner picks the same family for every song, a "use this family for every song" option can come later.
- Charts can now name the new built-in shapes (Csus2, Gsus4, C/E and others) without a `chord` line. Other names still need one. The generator could lift that limit later.
- Rows and the capo buttons are 33 and 32 px tall, like the app's other controls. The 48 px touch rule from [0001](0001-design-system.md) applies from milestone 6 ([0009](0009-birch-light-theme-and-session-modes.md)).
