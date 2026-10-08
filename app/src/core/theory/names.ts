// Chord names as notes: a root, the rest of the name, and an optional bass note after a
// slash. Moving a song to another key moves the root and the bass and keeps the rest.

const LETTERS: Readonly<Record<string, number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const
const FLATS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const

export const mod12 = (n: number): number => ((n % 12) + 12) % 12

/** A note's pitch class, 0 = C, from a name such as "F#" or "Bb". Null when it isn't a note. */
export function pitchClass(note: string): number | null {
  const m = note.match(/^([A-G])([#b]?)$/)
  if (!m) return null
  return mod12(LETTERS[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0))
}

/** A pitch class's name, with sharps or flats. */
export const noteName = (pc: number, flats: boolean): string => (flats ? FLATS : SHARPS)[mod12(pc)]

export interface ChordParts {
  root: number
  /** Everything between the root and the slash, such as "m7" or "sus2". */
  quality: string
  /** The slash chord's bass note, or null. */
  bass: number | null
  /** A parenthesised suffix such as "(easy)", which names one particular shape. */
  suffix: string
}

/** Reads a chord name such as "F#m7/C#" or "F#m(easy)". Null when it doesn't start with a note. */
export function parseChord(name: string): ChordParts | null {
  const m = name.match(/^([A-G][#b]?)([^/(]*)(?:\/([A-G][#b]?))?(\(.*\))?$/)
  if (!m) return null
  const root = pitchClass(m[1])
  const bass = m[3] ? pitchClass(m[3]) : null
  if (root === null) return null
  return { root, quality: m[2], bass, suffix: m[4] ?? "" }
}

/**
 * The chord name moved by some semitones, spelled with sharps or flats. A suffix such
 * as "(easy)" names one shape in the old key, so a moved name drops it. Null when the
 * name doesn't start with a note.
 */
export function transposeChord(name: string, semitones: number, flats: boolean): string | null {
  const c = parseChord(name)
  if (!c) return null
  if (mod12(semitones) === 0) return name
  const bass = c.bass === null ? "" : "/" + noteName(c.bass + semitones, flats)
  return noteName(c.root + semitones, flats) + c.quality + bass
}

/** The same chord spelled with sharps, the way the built-in shapes are named. */
export function withSharps(name: string): string {
  const c = parseChord(name)
  if (!c) return name
  const bass = c.bass === null ? "" : "/" + noteName(c.bass, false)
  return noteName(c.root, false) + c.quality + bass + c.suffix
}
