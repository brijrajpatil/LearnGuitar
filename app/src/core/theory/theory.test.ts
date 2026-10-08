import { describe, expect, it } from "vitest"
import { capoFret, findVoicing, formatChordName, pickString, simplifiedName, stringMidi, withCapo } from "@/core/theory/chords"
import { parseVoicing, VOICINGS } from "@/core/theory/voicings"

describe("parseVoicing", () => {
  it("reads frets and fingers, low E to high E", () => {
    expect(parseVoicing("x02210", "x02310")).toEqual({
      frets: [-1, 0, 2, 2, 1, 0],
      fingers: ["", "", "2", "3", "1", ""],
      barre: null,
    })
  })

  it("reads frets above 9 with separators", () => {
    expect(parseVoicing("x-10-12-12-12-10")?.frets).toEqual([-1, 10, 12, 12, 12, 10])
  })

  it("rejects shapes that aren't six strings", () => {
    expect(parseVoicing("x0221")).toBeNull()
    expect(parseVoicing("x0221y")).toBeNull()
    expect(parseVoicing("x02210", "123")).toBeNull()
  })

  it("finds a barre from finger 1, or from the lowest fret when no string is open", () => {
    expect(VOICINGS["F#m"].barre).toEqual({ fret: 2, from: 0, to: 5, finger: true })
    expect(VOICINGS.Bm.barre).toEqual({ fret: 2, from: 1, to: 5, finger: true })
    expect(parseVoicing("x24442")?.barre).toEqual({ fret: 2, from: 1, to: 5, finger: false })
    expect(VOICINGS.A.barre).toBeNull()
  })
})

// Notes above the root, by chord name suffix.
const QUALITIES: Record<string, number[]> = {
  "": [0, 4, 7],
  m: [0, 3, 7],
  "7": [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  add9: [0, 2, 4, 7],
  "5": [0, 7],
}
const NOTES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const pitchClass = (note: string) => (NOTES[note[0]] + (note[1] === "#" ? 1 : note[1] === "b" ? -1 : 0) + 12) % 12

describe("built-in shapes", () => {
  it("play the notes their names say, with the root or the slash note lowest", () => {
    for (const [name, v] of Object.entries(VOICINGS)) {
      const m = name.match(/^([A-G][#b]?)(maj7|m7|m|7|sus2|sus4|add9|5)?(?:\/([A-G][#b]?))?(?:\(\w+\))?$/)
      expect(m, `${name} is a name this test knows`).not.toBeNull()
      const root = pitchClass(m![1])
      const bass = m![3] ? pitchClass(m![3]) : root
      const tones = new Set([...QUALITIES[m![2] ?? ""].map((i) => (root + i) % 12), bass])
      const sounded = v.frets.flatMap((f, s) => (f < 0 ? [] : [stringMidi(s, f)]))
      const classes = new Set(sounded.map((n) => n % 12))
      expect([...classes].filter((c) => !tones.has(c)), `${name} has no wrong notes`).toEqual([])
      expect(classes.has(root), `${name} has its root`).toBe(true)
      const third = QUALITIES[m![2] ?? ""].find((i) => i === 3 || i === 4)
      if (third !== undefined) expect(classes.has((root + third) % 12), `${name} has its third`).toBe(true)
      expect(Math.min(...sounded) % 12, `${name} has ${m![3] ?? m![1]} lowest`).toBe(bass)
    }
  })
})

describe("chords", () => {
  const song = { chords: { A: parseVoicing("x02220")! }, simplify: { Bm: "D" } }

  it("prefers the chart's own shape over the built-in one", () => {
    expect(findVoicing(song, "A")?.fingers).toBeNull()
    expect(findVoicing(song, "E")).toBe(VOICINGS.E)
    expect(findVoicing(song, "H7")).toBeNull()
  })

  it("simplifies with the chart's rules first, then the defaults", () => {
    expect(simplifiedName(song, "Bm")).toBe("D")
    expect(simplifiedName(song, "F#m")).toBe("F#m(easy)")
    expect(simplifiedName(song, "G")).toBe("G")
  })

  it("picks the bass note or a numbered string, and skips muted strings", () => {
    expect(pickString(VOICINGS.D, "B")).toBe(2)
    expect(pickString(VOICINGS.G, "1")).toBe(5)
    expect(pickString(VOICINGS.D, "6")).toBe(-1)
  })

  it("formats sharps, flats and a parenthesised suffix", () => {
    expect(formatChordName("F#m(easy)")).toEqual({ base: "F♯m", suffix: "(easy)" })
    expect(formatChordName("Bb/Ab")).toEqual({ base: "B♭/A♭", suffix: "" })
    expect(formatChordName("Dsus2")).toEqual({ base: "Dsus2", suffix: "" })
  })

  it("reads the capo's fret from the ways people write it", () => {
    expect(capoFret("2")).toBe(2)
    expect(capoFret("capo 3")).toBe(3)
    expect(capoFret("4th fret")).toBe(4)
    expect(capoFret("")).toBe(0)
    expect(capoFret("none")).toBe(0)
    expect(capoFret("15")).toBe(0)
  })

  it("raises every played string by the capo's fret and leaves muted strings muted", () => {
    const c2 = withCapo(VOICINGS.D, 2)
    expect(c2.frets).toEqual([-1, -1, 2, 4, 5, 4])
    expect(c2.frets.map((f, s) => (f < 0 ? -1 : stringMidi(s, f)))).toEqual(
      VOICINGS.D.frets.map((f, s) => (f < 0 ? -1 : stringMidi(s, f) + 2))
    )
    expect(withCapo(VOICINGS.D, 0)).toBe(VOICINGS.D)
    expect(withCapo(VOICINGS.D, 2)).toBe(c2)
  })
})
