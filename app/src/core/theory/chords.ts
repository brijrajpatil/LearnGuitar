import type { Song, Voicing } from "@/core/song/types"
import { withSharps } from "@/core/theory/names"
import { generateVoicing } from "@/core/theory/shapes"
import { DEFAULT_SIMPLIFY, STANDARD_TUNING, VOICINGS } from "@/core/theory/voicings"

/**
 * The shape for a chord name: the chart's own definition first, then the built-in one
 * (named with sharps), then a generated one.
 */
export function findVoicing(song: Pick<Song, "chords">, name: string): Voicing | null {
  return song.chords[name] ?? VOICINGS[name] ?? VOICINGS[withSharps(name)] ?? generateVoicing(name)
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
 * The capo's fret from a chart's capo setting, such as "2", "capo 2" or "2nd fret".
 * 0 when there's no capo or the text has no fret number in 1 to 12.
 */
export function capoFret(text: string): number {
  const m = String(text).match(/\d+/)
  const n = m ? Number(m[0]) : 0
  return n >= 1 && n <= 12 ? n : 0
}

const withCapoCache = new WeakMap<Voicing, Map<number, Voicing>>()

/**
 * The shape as it sounds with a capo: every played string moves up by the capo's fret.
 * Diagrams keep the shape you finger; only the sound uses this.
 */
export function withCapo(v: Voicing, capo: number): Voicing {
  if (!capo) return v
  let byCapo = withCapoCache.get(v)
  if (!byCapo) withCapoCache.set(v, (byCapo = new Map()))
  let out = byCapo.get(capo)
  if (!out) {
    out = { ...v, frets: v.frets.map((f) => (f < 0 ? f : f + capo)) }
    byCapo.set(capo, out)
  }
  return out
}

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
