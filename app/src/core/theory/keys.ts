// Keys: reading the chart's key line, guessing a key from the chords when it has none,
// and spelling a key's chords with sharps or flats.

import type { Song } from "@/core/song/types"
import { mod12, noteName, parseChord, pitchClass, type ChordParts } from "@/core/theory/names"

export interface Key {
  /** Pitch class of the key's home note, 0 = C. */
  tonic: number
  minor: boolean
}

// Major keys written with flats. A minor key is written like its relative major.
const FLAT_MAJORS = new Set([5, 10, 3, 8, 1])

const relativeMajor = (k: Key): number => (k.minor ? mod12(k.tonic + 3) : k.tonic)

export const usesFlats = (k: Key): boolean => FLAT_MAJORS.has(relativeMajor(k))

/** The key's home note, such as "F#" or "Bb". */
export const tonicName = (k: Key): string => noteName(k.tonic, usesFlats(k))

/** The key the way a chart writes it: "A", "F#m", "Bb". */
export const keyName = (k: Key): string => tonicName(k) + (k.minor ? "m" : "")

export const moveKey = (k: Key, semitones: number): Key => ({ tonic: mod12(k.tonic + semitones), minor: k.minor })

/** Reads "A", "F#m", "Bb major" or "A minor". Null when it isn't a key. */
export function parseKey(text: string): Key | null {
  const m = text.trim().match(/^([A-Ga-g])\s*([#b♯♭]?)\s*(.*)$/)
  if (!m) return null
  const accidental = m[2] === "♯" ? "#" : m[2] === "♭" ? "b" : m[2]
  const tonic = pitchClass(m[1].toUpperCase() + accidental)
  if (tonic === null) return null
  const rest = m[3].trim()
  if (/^(maj|major)?$/i.test(rest)) return { tonic, minor: false }
  if (rest === "m" || /^(min|minor)$/i.test(rest)) return { tonic, minor: true }
  return null
}

type Triad = "major" | "minor" | "diminished" | "other"

function triadOf(quality: string): Triad {
  if (/sus|^5$|aug|\+/.test(quality)) return "other"
  if (/^(dim|°|m7b5|ø)/.test(quality)) return "diminished"
  if (/^m(?!aj)/.test(quality)) return "minor"
  return "major"
}

// The chords of a major key, by semitones above its home note.
const MAJOR_KEY_CHORDS: ReadonlyMap<number, Triad> = new Map([
  [0, "major"],
  [2, "minor"],
  [4, "minor"],
  [5, "major"],
  [7, "major"],
  [9, "minor"],
  [11, "diminished"],
])

/**
 * How a chord sits in the major key whose home note is `home`: "yes" when it's one of the
 * key's chords (a 7th, sus or slash version counts), "root" when only its root note is
 * in the key, and "no" otherwise.
 */
export function chordInKey(c: Pick<ChordParts, "root" | "quality">, home: number): "yes" | "root" | "no" {
  const fits = MAJOR_KEY_CHORDS.get(mod12(c.root - home))
  if (!fits) return "no"
  const triad = triadOf(c.quality)
  return fits === triad || triad === "other" ? "yes" : "root"
}

/**
 * The key that fits the chords best. Each chord scores 1 when it belongs to the key and
 * a half when only its root note does. A song that starts or ends on the key's home
 * chord scores 2 more for each, which tells a major key from its relative minor. A tie
 * goes to the major key. Null when no chord name starts with a note.
 */
export function guessKey(chords: readonly string[]): Key | null {
  const parsed = chords.map(parseChord).filter((c) => c !== null)
  if (!parsed.length) return null
  let best: Key | null = null
  let bestScore = -1
  for (const minor of [false, true]) {
    for (let tonic = 0; tonic < 12; tonic++) {
      const key = { tonic, minor }
      const home = relativeMajor(key)
      let score = 0
      for (const c of parsed) {
        const fit = chordInKey(c, home)
        score += fit === "yes" ? 1 : fit === "root" ? 0.5 : 0
      }
      const isHome = (c: (typeof parsed)[number]) =>
        c.root === tonic && (triadOf(c.quality) === (minor ? "minor" : "major") || triadOf(c.quality) === "other")
      if (isHome(parsed[0])) score += 2
      if (isHome(parsed[parsed.length - 1])) score += 2
      if (score > bestScore) {
        best = key
        bestScore = score
      }
    }
  }
  return best
}

/** Every chord the song plays, in bar order, with repeats. */
export const songChords = (song: Pick<Song, "bars">): string[] =>
  song.bars.flatMap((b) => b.chords.map((c) => c.chord))

/**
 * The key of the chords as the chart writes them: the chart's key line, or a guess from
 * the chords when it has none. Null when neither gives a key.
 */
export function writtenKey(song: Pick<Song, "key" | "bars">): { key: Key; guessed: boolean } | null {
  const given = parseKey(song.key)
  if (given) return { key: given, guessed: false }
  const guess = guessKey(songChords(song))
  return guess ? { key: guess, guessed: true } : null
}
