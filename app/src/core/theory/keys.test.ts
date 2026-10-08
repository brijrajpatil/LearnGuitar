import { describe, expect, it } from "vitest"
import { parseChart } from "@/core/chart/parse"
import { guessKey, keyName, parseKey, writtenKey } from "@/core/theory/keys"
import { parseChord, pitchClass, transposeChord, withSharps } from "@/core/theory/names"

describe("chord names", () => {
  it("reads notes with sharps and flats", () => {
    expect(pitchClass("C")).toBe(0)
    expect(pitchClass("F#")).toBe(6)
    expect(pitchClass("Bb")).toBe(10)
    expect(pitchClass("H")).toBeNull()
  })

  it("splits a name into root, quality, bass and suffix", () => {
    expect(parseChord("F#m7/C#")).toEqual({ root: 6, quality: "m7", bass: 1, suffix: "" })
    expect(parseChord("F#m(easy)")).toEqual({ root: 6, quality: "m", bass: null, suffix: "(easy)" })
    expect(parseChord("Bbmaj7")).toEqual({ root: 10, quality: "maj7", bass: null, suffix: "" })
    expect(parseChord("Riff1")).toBeNull()
  })

  it("moves the root and the bass, spelled for the new key", () => {
    expect(transposeChord("A", -2, false)).toBe("G")
    expect(transposeChord("F#m", -2, false)).toBe("Em")
    expect(transposeChord("D/F#", -2, false)).toBe("C/E")
    expect(transposeChord("Dsus2", 10, false)).toBe("Csus2")
    expect(transposeChord("F", 5, true)).toBe("Bb")
    expect(transposeChord("F", 5, false)).toBe("A#")
    expect(transposeChord("Riff1", 2, false)).toBeNull()
  })

  it("drops a shape's suffix when the name moves, and keeps it when it doesn't", () => {
    expect(transposeChord("F#m(easy)", -2, false)).toBe("Em")
    expect(transposeChord("F#m(easy)", 0, false)).toBe("F#m(easy)")
    expect(transposeChord("A", 12, false)).toBe("A")
  })

  it("respells flats as sharps, the way the built-in shapes are named", () => {
    expect(withSharps("Bbm7/Ab")).toBe("A#m7/G#")
    expect(withSharps("F#m(easy)")).toBe("F#m(easy)")
  })
})

describe("keys", () => {
  it("reads the ways people write a key", () => {
    expect(parseKey("A")).toEqual({ tonic: 9, minor: false })
    expect(parseKey("F#m")).toEqual({ tonic: 6, minor: true })
    expect(parseKey("Bb major")).toEqual({ tonic: 10, minor: false })
    expect(parseKey("a minor")).toEqual({ tonic: 9, minor: true })
    expect(parseKey("C♯m")).toEqual({ tonic: 1, minor: true })
    expect(parseKey("D dorian")).toBeNull()
    expect(parseKey("")).toBeNull()
  })

  it("spells a key with sharps or flats, minor keys like their relative major", () => {
    expect(keyName({ tonic: 10, minor: false })).toBe("Bb")
    expect(keyName({ tonic: 6, minor: false })).toBe("F#")
    expect(keyName({ tonic: 1, minor: false })).toBe("Db")
    expect(keyName({ tonic: 2, minor: true })).toBe("Dm")
    expect(keyName({ tonic: 7, minor: true })).toBe("Gm")
    expect(keyName({ tonic: 1, minor: true })).toBe("C#m")
  })

  it("guesses the key from the chords, using the first and last chord to tell major from minor", () => {
    expect(guessKey(["G", "G7", "C", "G", "D", "Em", "D", "G"])).toEqual({ tonic: 7, minor: false })
    expect(guessKey(["A", "E", "F#m", "D", "A"])).toEqual({ tonic: 9, minor: false })
    expect(guessKey(["Am", "F", "C", "G", "Am"])).toEqual({ tonic: 9, minor: true })
    expect(guessKey(["Em", "C", "D", "Em"])).toEqual({ tonic: 4, minor: true })
    expect(guessKey(["Riff"])).toBeNull()
  })

  it("takes the chart's key line, or guesses when there is none", () => {
    const given = parseChart("key: A\n[V] pattern=A\nF#m | D | A | E", []).song
    expect(writtenKey(given)).toEqual({ key: { tonic: 9, minor: false }, guessed: false })
    const none = parseChart("[V] pattern=A\nC | F | G | C", []).song
    expect(writtenKey(none)).toEqual({ key: { tonic: 0, minor: false }, guessed: true })
  })
})
