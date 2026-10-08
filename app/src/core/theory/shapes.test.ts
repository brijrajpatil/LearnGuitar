import { describe, expect, it } from "vitest"
import { parseChart } from "@/core/chart/parse"
import type { Voicing } from "@/core/song/types"
import { findVoicing, stringMidi } from "@/core/theory/chords"
import { transposeChord } from "@/core/theory/names"
import { chordTones, fingerShape, generateVoicing } from "@/core/theory/shapes"
import { LIBRARY } from "@/data/library"

const notesOf = (v: Voicing) => v.frets.flatMap((f, s) => (f < 0 ? [] : [stringMidi(s, f) % 12]))

/** Problems with a shape for a chord name, or an empty list when it's playable and right. */
function problems(name: string, v: Voicing | null): string[] {
  const chord = chordTones(name.replace(/\(.*\)$/, ""))
  if (!chord) return [`${name}: unknown chord`]
  if (!v) return [`${name}: no shape`]
  const notes = notesOf(v)
  const out: string[] = []
  if (notes[0] !== chord.bass) out.push(`${name}: bass note`)
  for (const t of chord.tones) if (!chord.optional.includes(t) && !notes.includes(t)) out.push(`${name}: missing a note`)
  for (const n of notes) if (n !== chord.bass && !chord.tones.includes(n)) out.push(`${name}: a wrong note`)
  const fretted = v.frets.filter((f) => f > 0)
  if (fretted.length && Math.max(...fretted) - Math.min(...fretted) > 3) out.push(`${name}: stretch`)
  if (v.fingers && new Set(v.fingers.filter((f) => /[1-4]/.test(f))).size > 4) out.push(`${name}: fingers`)
  return out
}

// Chords from typical pop and folk charts, and every chord in the built-in library.
const SONG_CHORDS = [
  "G", "G7", "C", "D", "Em", "A", "E", "F#m", "Dsus2", "D/F#", "Asus4", "Amaj7", "Am", "F", "Bm",
  "Am7", "Cmaj7", "Bm7", "E7", "Fmaj7", "Dm", "Dm7", "Csus4", "G/B", "Cadd9", "Esus4", "B7", "A7",
  "Asus2", "Em7", "C7", "D7", "Dsus4", "C/E", "Gsus4", "Gmaj7", "Dmaj7", "Emaj7", "Csus2", "C/G",
]
const LIBRARY_CHORDS = LIBRARY.flatMap((e) => parseChart(e.chart, []).song.bars.flatMap((b) => b.chords.map((c) => c.chord)))
const ALL_CHORDS = [...new Set([...SONG_CHORDS, ...LIBRARY_CHORDS])]

describe("chord shapes", () => {
  it("draws every chord of these songs and the library in all 12 keys, with sharps or flats", () => {
    const found: string[] = []
    expect(LIBRARY_CHORDS.length).toBeGreaterThan(100)
    for (const chord of ALL_CHORDS) {
      for (let n = 1; n < 12; n++) {
        for (const flats of [false, true]) {
          const name = transposeChord(chord, n, flats)!
          found.push(...problems(name, findVoicing({ chords: {} }, name)))
        }
      }
    }
    expect(found).toEqual([])
  })

  it("uses the barre shapes guitarists learn, nearest the nut", () => {
    expect(generateVoicing("Bb")?.frets).toEqual([-1, 1, 3, 3, 3, 1])
    expect(generateVoicing("C#m")?.frets).toEqual([-1, 4, 6, 6, 5, 4])
    expect(generateVoicing("G#m")?.frets).toEqual([4, 6, 6, 4, 4, 4])
    expect(generateVoicing("Ab")).toMatchObject({ frets: [4, 6, 6, 5, 4, 4], fingers: ["1", "3", "4", "2", "1", "1"] })
    expect(generateVoicing("Ab")?.barre).toEqual({ fret: 4, from: 0, to: 5, finger: true })
  })

  it("finds a shape for a slash chord with its bass note lowest", () => {
    expect(problems("A/C#", generateVoicing("A/C#"))).toEqual([])
    expect(problems("Eb/G", generateVoicing("Eb/G"))).toEqual([])
  })

  it("has no shape for a name it can't read", () => {
    expect(generateVoicing("Riff1")).toBeNull()
    expect(generateVoicing("Cadd11")).toBeNull()
  })

  it("fingers a barre with 1, then the rest from the lowest fret", () => {
    expect(fingerShape([1, 3, 3, 2, 1, 1])).toEqual(["1", "3", "4", "2", "1", "1"])
    expect(fingerShape([3, 2, 0, 0, 0, 3])).toEqual(["2", "1", "", "", "", "3"])
    // Five fretted strings with an open string above the barre can't be played.
    expect(fingerShape([1, 3, 3, 2, 0, 1])).toBeNull()
  })
})
