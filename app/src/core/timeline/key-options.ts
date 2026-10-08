// The keys a song can be played in, for the key picker (decision 0016): the song's
// chords in each key, how many need a barre, and the capo that keeps the record's sound.

import type { Song, Voicing } from "@/core/song/types"
import { capoFret } from "@/core/theory/chords"
import { moveKey, writtenKey, type Key } from "@/core/theory/keys"
import { mod12, parseChord } from "@/core/theory/names"
import { arrange, voicingOf, type ArrangementSettings } from "@/core/timeline/arrangement"

/** The highest capo the picker offers to keep the record's sound. Higher frets get cramped. */
export const MAX_MATCHING_CAPO = 7

export interface KeyOption {
  /** Semitones the chord names move from the chart. */
  shapes: number
  /** The key of the shapes you finger. */
  key: Key
  /** One of the five families built from open chords: C, G, D, A and E. */
  family: boolean
  /** The song's chords in this key, in order of first use, after Simplify chords. */
  chords: string[]
  /** How many of those chords need a barre across four strings or more. */
  barres: number
  /** The capo that keeps the record's sound, or null when it would need a higher fret. */
  capo: number | null
  /** Chords the app can't move to this key or has no shape for. */
  missing: string[]
}

/** True for a barre across four strings or more, the kind people mean by a barre chord. */
export const isBarreChord = (v: Voicing | null): boolean => v?.barre != null && v.barre.to - v.barre.from >= 3

// The open-chord families, as major keys, in the order the picker lists them.
const FAMILIES = [0, 7, 2, 9, 4]

/**
 * Every key the song can be played in: the five open-chord families first, then the
 * other seven from C up. A minor song lists minor keys. Null when the song has no key.
 */
export function keyOptions(song: Song, settings: ArrangementSettings): KeyOption[] | null {
  const written = writtenKey(song)?.key
  if (!written) return null
  const chartCapo = capoFret(song.capo)
  const unmovable = [...new Set(song.bars.flatMap((b) => b.chords.map((c) => c.chord)))].filter((c) => !parseChord(c))
  // A minor key belongs to the family of its relative major: Em is in the G family.
  const family = (k: Key) => FAMILIES.indexOf(k.minor ? mod12(k.tonic + 3) : k.tonic)
  const options = Array.from({ length: 12 }, (_, shapes): KeyOption => {
    const key = moveKey(written, shapes)
    const capo = shapes === 0 ? chartCapo : mod12(chartCapo - shapes)
    const arr = arrange(song, { ...settings, key: { shapes, capo } })
    const chords = [...new Set(arr.barChords.flatMap((spans) => spans.map((s) => s.chord)))]
    const voicings = chords.map((c) => voicingOf(arr, c))
    return {
      shapes,
      key,
      family: family(key) >= 0,
      chords,
      barres: voicings.filter(isBarreChord).length,
      capo: shapes === 0 || capo <= MAX_MATCHING_CAPO ? capo : null,
      missing: shapes === 0 ? [] : [...unmovable, ...chords.filter((_, i) => !voicings[i])],
    }
  })
  const rank = (o: KeyOption) => (o.family ? family(o.key) : FAMILIES.length + o.key.tonic)
  return options.sort((a, b) => rank(a) - rank(b))
}

/**
 * How far what you hear is from the record, in semitones (frets) from -5 to 6, for
 * shapes moved by `shapes` with a capo on `capo`.
 */
export function offsetFromRecord(song: Pick<Song, "capo">, choice: { shapes: number; capo: number }): number {
  const d = mod12(choice.shapes + choice.capo - capoFret(song.capo))
  return d > 6 ? d - 12 : d
}
