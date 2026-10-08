// Tap to sync (decision 0021): the player pastes the words, plays the song and taps as
// each word starts. Each tap lands on an eighth note, and the taps become the bars' words.

import type { LyricWord, Song } from "@/core/song/types"

/** A word or syllable to tap, from the pasted text. */
export interface SyncWord {
  /** As written in the chart: a syllable that runs into the next ends with "-". */
  text: string
  /** The first word of a pasted line. */
  lineStart: boolean
}

export interface SlotPosition {
  bar: number
  slot: number
}

/**
 * The words to tap, in order. Each line of the text is a sung line, and hyphens split a
 * word into syllables, one tap each ("La-li-lo" is three). Characters the chart format
 * uses ("|", a leading "/", a word of only dots) are left out.
 */
export function splitLyrics(text: string): SyncWord[] {
  const words: SyncWord[] = []
  for (const line of text.split(/\r?\n/)) {
    let lineStart = true
    for (const raw of line.replace(/\|/g, " ").split(/\s+/)) {
      const parts = raw.replace(/^\/+/, "").split("-")
      parts.forEach((part, i) => {
        if (!part || /^\.+$/.test(part)) return
        const joins = i < parts.length - 1 && parts.slice(i + 1).some((p) => p && !/^\.+$/.test(p))
        words.push({ text: joins ? part + "-" : part, lineStart })
        lineStart = false
      })
    }
  }
  return words
}

/** The eighth note after a position, moving into the next bar after the last one. */
export const slotAfter = (p: SlotPosition, slotsPerBar: number): SlotPosition =>
  p.slot + 1 < slotsPerBar ? { bar: p.bar, slot: p.slot + 1 } : { bar: p.bar + 1, slot: 0 }

export const isBefore = (a: SlotPosition, b: SlotPosition): boolean => a.bar < b.bar || (a.bar === b.bar && a.slot < b.slot)

/**
 * Every bar's words after a sync. The tapped words replace the words from the bar of the
 * first tap to the bar of the last. Bars before and after keep theirs.
 */
export function placeSynced(song: Song, words: readonly SyncWord[], taps: readonly (SlotPosition | null)[]): LyricWord[][] {
  const bars = song.bars.map((b) => [...b.lyrics])
  const tapped = words.flatMap((w, i) => {
    const at = taps[i]
    return at && at.bar < bars.length ? [{ ...w, ...at }] : []
  })
  if (!tapped.length) return bars
  for (let b = tapped[0].bar; b <= tapped[tapped.length - 1].bar; b++) bars[b] = []
  for (const w of tapped) bars[w.bar].push({ slot: w.slot, text: w.text, lineStart: w.lineStart })
  return bars
}
