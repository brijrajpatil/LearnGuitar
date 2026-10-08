// What the app asks Gemini. The answer's format comes from SONG_DRAFT_SCHEMA in
// schema.ts. These words tell the model how to fill it in.

import { VOICINGS } from "@/core/theory/voicings"

export const SYSTEM_PROMPT = `You write chord charts for a guitar practice app. Answer with JSON that matches the schema you're given.

Rules:
- Chords only. Never include lyrics, tab, or any words from the song, in any field.
- List the sections in the order the song is played, from the intro to the end, with names like Intro, Verse 1, Pre-chorus, Chorus, Bridge, Solo and Outro. Write every bar of every section, even when a section repeats.
- A bar is a string of chord names separated by spaces. In 4/4 write 1, 2, 4 or 8 names in a bar, and in 3/4 write 1, 3 or 6. Use "." to hold the previous chord, so "G . . D" is G for three beats and D for one.
- Use common chord names, like G, Em, D/F#, Cadd9, Bbmaj7, Asus4 or E5.
- key is the key of the chord shapes you wrote. capo is the fret most guitarists put a capo on for this song, or 0. Write the chords as they're played with that capo.
- tempo is the recording's tempo in beats per minute, or 0 if you aren't sure.
- pattern picks a strum for each section: A is one downstroke per beat, B is down-up eighth notes, C is down, down-up, up-down-up, D is a slow ballad strum, and E is one strum held for the bar.
- The app has shapes for these chords: ${Object.keys(VOICINGS).join(", ")}. For any other chord, add its shape to shapes, with six frets from the low E string to the high E string, like x02210.
- If you don't know this song's real chords, set found to false and leave sections empty. Never make up a chart.`

export const draftPrompt = (song: string): string =>
  `Song: ${song}\n\nWrite the chord chart of its best-known recording, from what you know.`

export const pagePrompt = (song: string, url: string): string =>
  `Song: ${song}\n\nRead this page and write the chord chart from it: ${url}\n\nUse the chords on the page. If the page has no chords for this song, set found to false.`

export const sheetPrompt = (song: string, chordLines: string): string =>
  `Song: ${song}\n\nThese are the chord lines and section headers of a chord sheet, with the lyrics taken out. Write the chord chart from them. One line of chords usually spans two or four bars.\n\n${chordLines}`

export const repairPrompt = (problems: string[]): string =>
  `The app couldn't use that chart:\n${problems.map((p) => `- ${p}`).join("\n")}\n\nFix these and send the whole chart again.`
