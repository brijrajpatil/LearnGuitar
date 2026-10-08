// A shape for any chord the built-in library doesn't have, such as B♭ or C♯m7. Songs
// moved to another key need these. Common chords use the barre shapes guitarists learn,
// with the root on the low E or the A string. Anything else is found by searching the
// fretboard.

import type { Voicing } from "@/core/song/types"
import { mod12, parseChord } from "@/core/theory/names"
import { findBarre, STANDARD_TUNING } from "@/core/theory/voicings"

// The notes of each chord quality, in semitones above the root. A fifth (7) in a chord
// of four notes or more may be left out of a shape.
const QUALITIES: Readonly<Record<string, readonly number[]>> = {
  "": [0, 4, 7],
  maj: [0, 4, 7],
  m: [0, 3, 7],
  min: [0, 3, 7],
  "5": [0, 7],
  "7": [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  M7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  mmaj7: [0, 3, 7, 11],
  "6": [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  "9": [0, 4, 7, 10, 2],
  maj9: [0, 4, 7, 11, 2],
  m9: [0, 3, 7, 10, 2],
  add9: [0, 4, 7, 2],
  add2: [0, 4, 7, 2],
  madd9: [0, 3, 7, 2],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  sus: [0, 5, 7],
  "7sus4": [0, 5, 7, 10],
  "7sus2": [0, 2, 7, 10],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  m7b5: [0, 3, 6, 10],
  aug: [0, 4, 8],
  "+": [0, 4, 8],
}

/** The notes in a chord, as pitch classes with the bass first. Null when the name isn't known. */
export function chordTones(name: string): { bass: number; tones: number[]; optional: number[] } | null {
  const chord = parseChord(name)
  const intervals = chord && QUALITIES[chord.quality]
  if (!chord || !intervals) return null
  const tones = intervals.map((i) => mod12(chord.root + i))
  const optional = intervals.length > 3 ? [mod12(chord.root + 7)] : []
  return { bass: chord.bass ?? chord.root, tones, optional }
}

// Barre shapes as frets above the barre, low E to high E, -1 muted. "E" shapes have the
// root on the low E string, "A" shapes on the A string.
const BARRE_SHAPES: Readonly<Record<string, { E?: number[]; A?: number[] }>> = {
  "": { E: [0, 2, 2, 1, 0, 0], A: [-1, 0, 2, 2, 2, 0] },
  m: { E: [0, 2, 2, 0, 0, 0], A: [-1, 0, 2, 2, 1, 0] },
  "7": { E: [0, 2, 0, 1, 0, 0], A: [-1, 0, 2, 0, 2, 0] },
  m7: { E: [0, 2, 0, 0, 0, 0], A: [-1, 0, 2, 0, 1, 0] },
  maj7: { E: [0, -1, 1, 1, 0, -1], A: [-1, 0, 2, 1, 2, 0] },
  sus4: { E: [0, 2, 2, 2, 0, 0], A: [-1, 0, 2, 2, 3, 0] },
  sus2: { A: [-1, 0, 2, 2, 0, 0] },
  "7sus4": { E: [0, 2, 0, 2, 0, 0], A: [-1, 0, 2, 0, 3, 0] },
  "6": { A: [-1, 0, 2, 2, 2, 2] },
  m6: { A: [-1, 0, 2, 2, 1, 2] },
  "5": { E: [0, 2, 2, -1, -1, -1], A: [-1, 0, 2, 2, -1, -1] },
  dim: { A: [-1, 0, 1, 2, 1, -1] },
  m7b5: { A: [-1, 0, 1, 0, 1, -1] },
}
const SAME_SHAPE: Readonly<Record<string, string>> = { maj: "", min: "m", M7: "maj7", sus: "sus4" }

const MAX_FINGERS = 4

/**
 * Fingers for a shape: a barre takes finger 1 when more than four strings are fretted,
 * and the other fretted strings take the next fingers, lowest fret first, then from the
 * low string up. Null when it needs more than four fingers.
 */
export function fingerShape(frets: readonly number[]): string[] | null {
  const fretted = frets.flatMap((f, s) => (f > 0 ? [s] : []))
  const fingers = frets.map(() => "")
  let next = 1
  let rest = fretted
  if (fretted.length > MAX_FINGERS) {
    const low = Math.min(...fretted.map((s) => frets[s]))
    const from = fretted.find((s) => frets[s] === low)!
    // A barre presses every string above where it starts, so none of them can be open.
    if (frets.some((f, s) => s > from && f === 0)) return null
    for (const s of fretted) if (s >= from && frets[s] === low) fingers[s] = "1"
    rest = fretted.filter((s) => !fingers[s])
    next = 2
  }
  rest = [...rest].sort((a, b) => frets[a] - frets[b] || a - b)
  if (next - 1 + rest.length > MAX_FINGERS) return null
  for (const s of rest) fingers[s] = String(next++)
  return fingers
}

/** The barre shape nearest the nut, or null when the quality has none. */
function barreShape(name: string): number[] | null {
  const chord = parseChord(name)
  if (!chord || chord.bass !== null) return null
  const shapes = BARRE_SHAPES[SAME_SHAPE[chord.quality] ?? chord.quality]
  if (!shapes) return null
  const options: number[][] = []
  for (const [form, offsets] of Object.entries(shapes)) {
    const at = mod12(chord.root - STANDARD_TUNING[form === "E" ? 0 : 1])
    options.push(offsets.map((o) => (o < 0 ? -1 : o + at)))
  }
  const lowest = (f: number[]) => Math.min(...f.filter((x) => x >= 0))
  return options.sort((a, b) => lowest(a) - lowest(b))[0]
}

/**
 * The best shape the search finds: four or more strings (three for a power chord) side
 * by side with the bass note
 * on the lowest, every note the chord needs, frets within four of each other and four
 * fingers at most. Lower scores are better: near the nut, fewer fingers, no barre, more
 * strings ringing and a small stretch.
 */
function searchShape(name: string): number[] | null {
  const chord = chordTones(name)
  if (!chord) return null
  const { bass, optional } = chord
  const tones = chord.tones.includes(bass) ? chord.tones : [...chord.tones, bass]
  const need = chord.tones.filter((t) => !optional.includes(t))
  let best: number[] | null = null
  let bestScore = Infinity
  const frets = Array<number>(6).fill(-1)
  const check = () => {
    const played = frets.flatMap((f, i) => (f >= 0 ? [i] : []))
    if (played.length < Math.min(4, tones.length + 1)) return
    if (played[played.length - 1] - played[0] !== played.length - 1) return
    const notes = played.map((i) => mod12(STANDARD_TUNING[i] + frets[i]))
    if (notes[0] !== bass || !need.every((t) => notes.includes(t))) return
    const fretted = frets.filter((f) => f > 0)
    const low = fretted.length ? Math.min(...fretted) : 0
    const high = fretted.length ? Math.max(...fretted) : 0
    if (high - low > 3) return
    // An open string far from the hand rings against a long reach.
    if (frets.includes(0) && high > 4) return
    const fingers = fingerShape(frets)
    if (!fingers) return
    const barre = fingers.filter((f) => f === "1").length > 1
    const score = 3 * low + new Set(fingers.filter(Boolean)).size + (barre ? 2 : 0) - 2 * played.length + 2 * (high - low)
    if (score < bestScore) {
      best = [...frets]
      bestScore = score
    }
  }
  const walk = (s: number) => {
    if (s === 6) return check()
    const open = STANDARD_TUNING[s]
    for (let f = -1; f <= 15; f++) {
      if (f >= 0 && !tones.includes(mod12(open + f))) continue
      frets[s] = f
      walk(s + 1)
    }
    frets[s] = -1
  }
  walk(0)
  return best
}

const cache = new Map<string, Voicing | null>()

/** A playable shape for a chord name, or null when the name or its quality isn't known. */
export function generateVoicing(name: string): Voicing | null {
  if (cache.has(name)) return cache.get(name)!
  const frets = barreShape(name) ?? searchShape(name)
  const fingers = frets && fingerShape(frets)
  const result = frets ? { frets, fingers, barre: findBarre(frets, fingers) } : null
  cache.set(name, result)
  return result
}
