import type { Song, Voicing } from "@/core/song/types"
import { DEFAULT_SIMPLIFY, STANDARD_TUNING, VOICINGS } from "@/core/theory/voicings"

/** The shape for a chord name: the chart's own definition first, then the built-in one. */
export function findVoicing(song: Pick<Song, "chords">, name: string): Voicing | null {
  return song.chords[name] ?? VOICINGS[name] ?? null
}

export function simplifiedName(song: Pick<Song, "simplify">, name: string): string {
  return song.simplify[name] ?? DEFAULT_SIMPLIFY[name] ?? name
}

/**
 * Which string a pick step plays in a chord, 0 = low E, or -1 when that string is muted.
 * "B" is the chord's bass note: its lowest played string.
 */
export function pickString(v: Voicing, step: string): number {
  if (step === "B") return v.frets.findIndex((f) => f >= 0)
  const s = 6 - Number(step)
  return v.frets[s] >= 0 ? s : -1
}

export const stringMidi = (string: number, fret: number): number =>
  STANDARD_TUNING[string] + fret

/**
 * Splits a chord name for display: the name with ♯ and ♭ signs, and a parenthesised
 * suffix such as "(easy)" shown smaller.
 */
export function formatChordName(name: string): { base: string; suffix: string } {
  const m = String(name).match(/^(.*?)(\(.*\))?$/)
  const raw = m?.[1] ?? name
  const base = raw
    .replace(/#/g, "♯")
    .replace(/^([A-G])b/, "$1♭")
    .replace(/\/([A-G])b/, "/$1♭")
  return { base, suffix: m?.[2] ?? "" }
}
