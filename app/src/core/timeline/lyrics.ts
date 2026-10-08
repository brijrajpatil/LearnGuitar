// Sung lines for the play screen's lyrics (decision 0021): the words in play order, split
// into the lines the player sings, and which word is being sung at a bar and slot.

import type { Song } from "@/core/song/types"
import { chordAt, type Arrangement } from "@/core/timeline/arrangement"

export interface SungWord {
  bar: number
  slot: number
  /** As typed. A syllable that runs into the next word ends with "-". */
  text: string
}

export type SungLine = SungWord[]

export const hasLyrics = (song: Song): boolean => song.bars.some((b) => b.lyrics.length > 0)

/** Every word in the song, split into sung lines. */
export function sungLines(song: Song): SungLine[] {
  const lines: SungLine[] = []
  song.bars.forEach((bar, b) => {
    for (const w of bar.lyrics) {
      if (w.lineStart || !lines.length) lines.push([])
      lines[lines.length - 1].push({ bar: b, slot: w.slot, text: w.text })
    }
  })
  return lines
}

/**
 * The line being sung at a bar and slot, and the word in it, or -1 before its first word.
 * A line stays current from its first word until the next line's first word. Before the
 * song's first word, the first line shows with no word sung yet. Slot -1 is just before
 * the bar, for when nothing is playing.
 */
export function lyricAt(lines: readonly SungLine[], slotsPerBar: number, bar: number, slot: number): { line: number; word: number } | null {
  if (!lines.length) return null
  const at = bar * slotsPerBar + slot
  const pos = (w: SungWord) => w.bar * slotsPerBar + w.slot
  let line = 0
  while (line + 1 < lines.length && pos(lines[line + 1][0]) <= at) line++
  let word = -1
  while (word + 1 < lines[line].length && pos(lines[line][word + 1]) <= at) word++
  return { line, word }
}

/** A word as the line shows it: syllables join their next word, without the hyphen. */
export const shownWord = (text: string): { text: string; joins: boolean } =>
  text.endsWith("-") && text.length > 1 ? { text: text.slice(0, -1), joins: true } : { text, joins: false }

/**
 * The chord to show above each word of a line: the chord under the word when it differs
 * from the one under the word before, so each change shows once. The first word always
 * gets one. Chords follow the arrangement's key and simplify choices.
 */
export function lineChords(arr: Arrangement, line: SungLine): (string | null)[] {
  let last: string | null = null
  return line.map((w) => {
    const chord = chordAt(arr, w.bar, w.slot)
    const shown = chord === last ? null : chord
    last = chord
    return shown
  })
}
