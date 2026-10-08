import { describe, expect, it } from "vitest"
import { parseVoicing } from "@/core/theory/voicings"
import { playsChord, THEORY_SHAPES } from "@/ai/shape-tools"

const shape = (frets: string) => parseVoicing(frets)!

describe("checking a shape from the model", () => {
  it("accepts a shape that plays the chord's notes with the root or slash note lowest", () => {
    expect(playsChord("C#7", shape("x43404"))).toBe(true)
    expect(playsChord("Dadd9", shape("xx0230"))).toBe(false)
    expect(playsChord("Cadd9", shape("x32033"))).toBe(true)
    expect(playsChord("D/F#", shape("2x0232"))).toBe(true)
    // The fifth can be left out of a four-note chord, but not the third.
    expect(playsChord("A7", shape("x0x023"))).toBe(true)
    expect(playsChord("A7", shape("x02000"))).toBe(false)
  })

  it("rejects wrong notes, a wrong bass and names it can't read", () => {
    expect(playsChord("C#7", shape("x43405"))).toBe(false)
    expect(playsChord("G", shape("x20003"))).toBe(false)
    expect(playsChord("Hm", shape("x02210"))).toBe(false)
  })

  it("makes a shape for chords the library lacks", () => {
    const v = THEORY_SHAPES.shapeFor("Ebmaj7")
    expect(v).not.toBeNull()
    expect(playsChord("Ebmaj7", v!)).toBe(true)
  })
})
