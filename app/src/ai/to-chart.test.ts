import { describe, expect, it } from "vitest"
import { parseChart } from "@/core/chart/parse"
import { parseVoicing } from "@/core/theory/voicings"
import { isChordName, plainTriad, respell, tidyChordName } from "@/ai/chord-names"
import { readDraft, type SongDraft } from "@/ai/schema"
import { draftToChart, keyName, NO_SHAPE_TOOLS, type ShapeTools } from "@/ai/to-chart"

const date = new Date(2026, 9, 8)
const memory = { kind: "memory", model: "gemini-3.8-flash" } as const

const draft = (p: Partial<SongDraft>): SongDraft => ({
  found: true,
  title: "Drunken Sailor",
  artist: "Traditional",
  key: "D minor",
  capo: 0,
  beatsPerBar: 4,
  tempo: 100,
  sections: [{ name: "Verse 1", pattern: "C", bars: ["Dm", "C", "Dm", "C Dm"] }],
  shapes: [],
  ...p,
})

const chartOf = (d: SongDraft, shapes: ShapeTools = NO_SHAPE_TOOLS) => draftToChart(d, { source: memory, date, shapes })

describe("chord names", () => {
  it("tells chords from words", () => {
    for (const c of ["G", "Am", "F#m7b5", "Cadd9", "D/F#", "Bbmaj7", "Asus4", "E5", "C(add9)", "A7sus4", "C♯m"]) {
      expect(isChordName(c), c).toBe(true)
    }
    for (const w of ["Go", "Be", "Dad", "Each", "Bee", "Away", "the", "|"]) expect(isChordName(w), w).toBe(false)
  })

  it("spells chords the way the app does", () => {
    expect(tidyChordName("Amin")).toBe("Am")
    expect(tidyChordName("CM7")).toBe("Cmaj7")
    expect(tidyChordName("Gmaj")).toBe("G")
    expect(tidyChordName("Dsus")).toBe("Dsus4")
    expect(tidyChordName("C(add9)")).toBe("Cadd9")
    expect(respell("A#")).toBe("Bb")
    expect(respell("Gbm/Db")).toBe("F#m/C#")
    expect(plainTriad("F#m7b5")).toBe("F#m")
    expect(plainTriad("Gsus4/B")).toBe("G")
    expect(plainTriad("Ebmaj7")).toBe("Eb")
  })

  it("reads keys written out in words", () => {
    expect(keyName("G major")).toBe("G")
    expect(keyName("E minor")).toBe("Em")
    expect(keyName("F♯m")).toBe("F#m")
    expect(keyName("unknown")).toBe("")
  })
})

describe("reading a draft", () => {
  it("fills in safe values for anything odd or missing", () => {
    const d = readDraft({ title: "X", capo: 40, beatsPerBar: "3", tempo: 5, sections: [{ name: "A", pattern: "z", bars: ["G", 7] }] })
    expect(d).toMatchObject({ found: true, capo: 0, beatsPerBar: 3, tempo: null })
    expect(d?.sections[0]).toEqual({ name: "A", pattern: null, bars: ["G", "7"] })
    expect(readDraft("not json")).toBeNull()
    expect(readDraft({ found: false })?.found).toBe(false)
  })
})

describe("draft to chart", () => {
  it("writes a chart that parses, with the app's own note and no record figures", () => {
    const { chart, warnings, unknown } = chartOf(draft({}))
    const { song, errors } = parseChart(chart, [])
    expect(errors).toEqual([])
    expect(warnings).toEqual([])
    expect(unknown).toEqual([])
    expect(song).toMatchObject({ title: "Drunken Sailor", artist: "Traditional", key: "Dm", tempo: 100, beatsPerBar: 4 })
    expect(song.notes[0]).toMatch(/^AI draft from Gemini's memory, 8 Oct 2026\./)
    expect(song.sections[0]).toMatchObject({ name: "Verse 1", pattern: "C", record: null })
    expect(song.bars).toHaveLength(4)
    expect(chart).not.toMatch(/record=/)
  })

  it("keeps lyrics and cues out, whatever the model puts in the bars", () => {
    const { chart, warnings } = chartOf(
      draft({ sections: [{ name: "Verse ]1[ \"sing\"", pattern: null, bars: ['G "and here are words"', "what shall we do", "D"] }] })
    )
    expect(chart).not.toMatch(/words|what shall/)
    expect(chart).not.toContain('"')
    expect(chart).toContain("[Verse 1 sing]")
    expect(warnings).toContain("Some words in the bars weren't chords, so the app left them out.")
    expect(parseChart(chart, []).errors).toEqual([])
  })

  it("evens out bars that don't split the beat, splits bar lines, and keeps repeats", () => {
    const { chart } = chartOf(draft({ sections: [{ name: "Verse", pattern: null, bars: ["G D C", "Em | C", "/ / /", "G*2", "%"] }] }))
    expect(chart).toContain("G D C . | Em | C | .\nG*2 | G*2")
    const { song, errors } = parseChart(chart, [])
    expect(errors).toEqual([])
    expect(song.bars.length).toBe(8)
  })

  it("cuts long titles and drops sections with no chords", () => {
    const { chart } = chartOf(
      draft({ title: "x".repeat(200), sections: [{ name: "Empty", pattern: null, bars: [". ."] }, ...draft({}).sections] })
    )
    expect(chart).toContain(`title: ${"x".repeat(80)}\n`)
    expect(chart).not.toContain("[Empty]")
  })

  it("uses the built-in name for another spelling of a chord", () => {
    const { chart, unknown } = chartOf(draft({ sections: [{ name: "V", pattern: null, bars: ["A#", "Amin", "Gmaj"] }] }))
    expect(chart).toContain("Bb | Am | G")
    expect(unknown).toEqual([])
  })

  it("gives an unknown chord the model's shape when the notes check out, or the app's own", () => {
    const tools: ShapeTools = {
      playsChord: (name) => name === "Dadd9",
      shapeFor: (name) => (name === "Ebmaj7" ? parseVoicing("x65333", "x43111") : null),
    }
    const { chart, warnings, unknown } = chartOf(
      draft({
        sections: [{ name: "V", pattern: null, bars: ["Dadd9", "Ebmaj7", "C#7"] }],
        shapes: [
          { name: "Dadd9", frets: "xx0230" },
          { name: "C#7", frets: "x46464" },
        ],
      }),
      tools
    )
    expect(chart).toContain("chord Dadd9 = xx0230")
    expect(chart).toContain("chord Ebmaj7 = x65333 x43111")
    // C#7's shape from the model failed the note check, and C# has no shape either.
    expect(unknown).toEqual(["C#7"])
    expect(warnings).toEqual(["Dadd9 uses a shape from Gemini.", "Ebmaj7 had no built-in shape, so the app made one."])
    expect(parseChart(chart, []).errors.map((e) => e.message)).toEqual([expect.stringContaining('Unknown chord "C#7"')])
  })

  it("swaps a chord it can't shape for the plain chord under it", () => {
    const { chart, warnings, unknown } = chartOf(draft({ sections: [{ name: "V", pattern: null, bars: ["F#m7b5", "Bm9"] }] }))
    expect(chart).toContain("F#m | Bm")
    expect(unknown).toEqual([])
    expect(warnings).toContain("F#m7b5 became F#m, since the app has no shape for F#m7b5.")
  })
})
