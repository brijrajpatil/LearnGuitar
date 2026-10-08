import type { Barre, Voicing } from "@/core/song/types"

/** Standard tuning as MIDI notes, low E to high E. */
export const STANDARD_TUNING = [40, 45, 50, 55, 59, 64] as const

// "frets fingers", low E to high E. x = muted, T = thumb.
const LIBRARY_SOURCE: Record<string, string> = {
  A: "x02220 x01230",
  E: "022100 023100",
  "F#m": "244222 134111",
  "F#m(easy)": "xx4222 xx3111",
  D: "xx0232 xx0132",
  Dsus2: "xx0230 xx0130",
  "D/F#": "2x0232 Tx0132",
  Asus4: "x02230 x01230",
  Amaj7: "x02120 x02130",
  C: "x32010 x32010",
  Cadd9: "x32033 x21034",
  Cmaj7: "x32000 x32000",
  C7: "x32310 x32410",
  G: "320003 210003",
  "G/B": "x20003 x10003",
  G7: "320001 320001",
  Am: "x02210 x02310",
  Am7: "x02010 x02010",
  Asus2: "x02200 x01200",
  A7: "x02020 x02030",
  Em: "022000 023000",
  Em7: "022030 012030",
  E7: "020100 020100",
  Esus4: "022200 023400",
  Dm: "xx0231 xx0231",
  D7: "xx0212 xx0213",
  Dsus4: "xx0233 xx0134",
  F: "133211 134211",
  Fmaj7: "xx3210 xx3210",
  Bm: "x24432 x13421",
  Bm7: "x20202 x10203",
  B7: "x21202 x21304",
  Dmaj7: "xx0222 xx0123",
  Gmaj7: "320002 320001",
  // Barre chords beyond F and Bm.
  Bb: "x13331 x12341",
  B: "x24442 x12341",
  "F#": "244322 134211",
  "C#m": "x46654 x13421",
  Cm: "x35543 x13421",
  Fm: "133111 134111",
  Gm: "355333 134111",
  // Power chords: the root and the fifth, with no third.
  E5: "022xxx 012xxx",
  A5: "x022xx x012xx",
  D5: "xx023x xx013x",
  G5: "355xxx 134xxx",
  C5: "x355xx x134xx",
  // Open shapes for the chord families a song can move into (decision 0016).
  Csus2: "x30013 x20013",
  Csus4: "x33011 x34011",
  "C/E": "032010 032010",
  "C/G": "332010 342010",
  Gsus4: "330013 230014",
  Dm7: "xx0211 xx0211",
  Emaj7: "021100 031200",
}

/** Easier chords used when Simplify chords is on, unless the chart sets its own. */
export const DEFAULT_SIMPLIFY: Readonly<Record<string, string>> = {
  Dsus2: "D",
  "D/F#": "D",
  "F#m": "F#m(easy)",
  Asus4: "A",
  Amaj7: "A",
}

/**
 * Reads a shape such as "x24432" (or "x-2-4-4-3-2" for frets above 9) with optional
 * fingers such as "x13421". Returns null when it isn't six valid strings.
 */
export function parseVoicing(frets: string, fingers?: string): Voicing | null {
  if (!frets) return null
  const parts = /[-,]/.test(frets) ? frets.split(/[-,]+/).filter(Boolean) : frets.split("")
  if (parts.length !== 6) return null
  const f = parts.map((p) =>
    /^[xX]$/.test(p) ? -1 : /^\d{1,2}$/.test(p) && +p <= 24 ? +p : NaN
  )
  if (f.some(Number.isNaN)) return null
  let fg: string[] | null = null
  if (fingers) {
    const q = fingers.split("")
    if (q.length !== 6 || q.some((c) => !/[0-4xXtT-]/.test(c))) return null
    fg = q.map((c) => (/[tT]/.test(c) ? "T" : /[1-4]/.test(c) ? c : ""))
  }
  return { frets: f, fingers: fg, barre: findBarre(f, fg) }
}

/**
 * With fingers given, a barre is finger 1 on two or more strings at one fret. Without
 * them, it's the lowest fret held on two or more strings when no string is open.
 */
export function findBarre(f: number[], fg: string[] | null): Barre | null {
  if (fg) {
    const idx: number[] = []
    for (let i = 0; i < 6; i++) if (fg[i] === "1" && f[i] > 0) idx.push(i)
    if (idx.length >= 2 && idx.every((i) => f[i] === f[idx[0]])) {
      return { fret: f[idx[0]], from: idx[0], to: idx[idx.length - 1], finger: true }
    }
    return null
  }
  const played: number[] = []
  for (let i = 0; i < 6; i++) if (f[i] >= 0) played.push(i)
  if (!played.length || played.some((i) => f[i] === 0)) return null
  const min = Math.min(...played.map((i) => f[i]))
  const at = played.filter((i) => f[i] === min)
  return at.length >= 2 ? { fret: min, from: at[0], to: at[at.length - 1], finger: false } : null
}

/** Built-in chord shapes by name. */
export const VOICINGS: Readonly<Record<string, Voicing>> = Object.fromEntries(
  Object.entries(LIBRARY_SOURCE).map(([name, src]) => {
    const [frets, fingers] = src.split(" ")
    const v = parseVoicing(frets, fingers)
    if (!v) throw new Error(`Bad built-in voicing for ${name}`)
    return [name, v]
  })
)
