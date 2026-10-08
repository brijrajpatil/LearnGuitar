// Chord families (decision 0018): the open chords of one major key, which beginners learn
// together. The library lists the songs that fit the family you're learning.

import type { Song } from "@/core/song/types"
import { findVoicing } from "@/core/theory/chords"
import { chordInKey, writtenKey } from "@/core/theory/keys"
import { mod12, noteName, parseChord } from "@/core/theory/names"
import type { ArrangementSettings } from "@/core/timeline/arrangement"
import { familyHome, isBarreChord, optionFor, type KeyOption } from "@/core/timeline/key-options"

export { FAMILIES } from "@/core/timeline/key-options"

// The key's chords in the order guitarists name them (I, IV, V, vi, ii, iii), each as a
// triad and as its 7th chord.
const DEGREES: readonly [number, string, string][] = [
  [0, "", "maj7"],
  [5, "", "maj7"],
  [7, "", "7"],
  [9, "m", "m7"],
  [2, "m", "m7"],
  [4, "m", "m7"],
]

const isOpen = (name: string): boolean => {
  const v = findVoicing({ chords: {} }, name)
  return v !== null && !isBarreChord(v)
}

/**
 * The chords a family's learner plays: each of the key's chords with an open shape, or
 * its 7th chord when only that is open. The G family is G, C, D, Em, Am and Bm7.
 */
export function familyChords(family: number): string[] {
  return DEGREES.flatMap(([degree, triad, seventh]) => {
    const root = noteName(family + degree, false)
    return isOpen(root + triad) ? [root + triad] : isOpen(root + seventh) ? [root + seventh] : []
  })
}

export interface FamilyFit extends KeyOption {
  /** Every chord, moved into the family's key, is one of the family's chords with an open shape. */
  fits: boolean
}

/**
 * The song moved into a family's key, and whether it fits the family. It fits when every
 * chord, after Simplify chords, is one of the key's chords (a 7th, sus or slash version
 * counts) and needs no barre across four strings or more. Null when the song has no key.
 */
export function familyFit(song: Song, settings: ArrangementSettings, family: number): FamilyFit | null {
  const written = writtenKey(song)?.key
  if (!written) return null
  const option = optionFor(song, settings, written, mod12(family - familyHome(written)))
  const fits =
    !option.missing.length &&
    option.chords.every((name) => {
      const chord = parseChord(name)
      return chord !== null && chordInKey(chord, family) === "yes" && !option.barreChords.includes(name)
    })
  return { ...option, fits }
}
