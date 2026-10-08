# 0018. Filter the library by chord family

Status: Accepted
Date: 2026-10-08

## Context

The owner learns one chord family at a time, such as the G family's G, C, D, Em and Am, and wants to play the songs they care about with it. Since [0016](0016-key-and-capo.md), any song can move to any key with the key picker, one song at a time. The library didn't say which songs suit the family being learned.

Every song can move into every key, so whether a song "is in G" doesn't matter. What matters is whether, moved into G, it uses only chords the learner knows. A song with a chord from outside the key (B in Greensleeves, A7 in Jingle Bells) needs a new chord, and so does one whose chords need a barre in that key (Bm in the G family).

The owner chose between three mockups and answered three questions.

## Options

Where the filter goes:

- A. A Family select beside Difficulty. No extra row, the same control as the other filter.
- B. A row of C, G, D, A, E buttons under the filters. Fastest to switch, one more row above the list.
- C. Set the family once, then a "Fits my family" switch. Simple day to day, one more step to change family.

What counts as fitting:

- Only the family's chords: moved into the family's key, every chord is one of the key's chords (a 7th, sus or slash version counts) and needs no barre across four strings or more. 37 of the 51 built-in songs fit the G family.
- Any open chord: every chord has a shape with no barre. More songs fit, but some need A7, B7 or E7, which are outside the family.

Opening a song from the filtered list:

- Play it in the family, with the capo rule the key picker uses.
- Open it as saved, and leave moving it to the key picker.

Remembering the family:

- Remember it between visits, since a learner stays on one family for weeks.
- Reset it each time, like the other filters ([0014](0014-library-page.md)).

## Decision

- A Family select after Difficulty (mockup A): Any family, then the C, G, D, A and E families. Each item lists the family's chords: the key's chords that have an open shape, or their 7th chord when only that is open. The G family is G, C, D, Em, Am and Bm7.
- A song fits when, moved into the family's key after Simplify chords, every chord is one of the key's chords and needs no barre across four strings or more. A minor song fits its relative major's family, so a song in Em fits the G family.
- With a family chosen, the list keeps the songs that fit. The count says "37 songs fit the G family". The Chords column becomes "Chords in G" with the chords as played in G, and a chord search matches those. The Difficulty column becomes Capo, with the key picker's wording: "As written", "Capo 2", "No capo fits".
- Opening a song from the list plays it in the family. Its key choice is set to the family's shapes, with the capo that keeps the chart's sound when one fits on fret 7 or lower, as in the key picker.
- The family is saved in settings and stays chosen until the player changes it. Clear filters resets it with the others. This changes 0014's rule that filters reset each time the library opens, for this one filter.

## Consequences

- The owner can pick the G family once and see every song they can play with it, already moved into G.
- Opening a song from the filter replaces its saved key choice. A player who set another key for that song sets it again in the key picker.
- The C family fits few songs (11 of 51), because most songs moved into C need a full F barre. That's accurate, and it shows why beginners often start with G.
- Studies fit too. "A and D" becomes G and C in the G family, which still practises a two-chord change, though with different shapes from the ones its name says.
- The fit is worked out on the device for every song when the family changes, about 50 songs at a time. A much bigger library might need it saved with each song.
