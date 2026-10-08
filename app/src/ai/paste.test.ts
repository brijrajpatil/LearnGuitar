import { describe, expect, it } from "vitest"
import { parseChart } from "@/core/chart/parse"
import { chordLinesOnly, readChordSheet } from "@/ai/paste"
import { draftToChart, NO_SHAPE_TOOLS } from "@/ai/to-chart"

// Made-up filler words stand in for lyrics, so no song's words are in the repo.
const SHEET = `Drunken Sailor
Capo: none
Key: Dm
Tempo: 100 BPM

[Verse 1]
Dm
la la la filler words here
C
more filler words for the line
Dm               C        Dm
filler words and other filler

[Chorus]
Dm    C    Dm    C Dm  (x2)
la la la la la la la

[Verse 2]
Dm
some other filler words
C
filler again

[Chorus]
`

describe("pasted chord sheets", () => {
  it("keeps chords, sections and settings, and drops every line of words", () => {
    const { draft, droppedLines } = readChordSheet(SHEET, { title: "Drunken Sailor" })
    expect(droppedLines).toBe(7)
    expect(draft).toMatchObject({ found: true, title: "Drunken Sailor", key: "Dm", capo: 0, tempo: 100 })
    expect(draft.sections.map((s) => s.name)).toEqual(["Verse 1", "Chorus", "Verse 2", "Chorus"])
    expect(draft.sections[0].bars).toEqual(["Dm", "C", "Dm", "C", "Dm"])
    expect(draft.sections[1].bars).toHaveLength(10)
    // The second chorus has no chords of its own, so it repeats the first.
    expect(draft.sections[3].bars).toEqual(draft.sections[1].bars)
    expect(JSON.stringify(draft)).not.toMatch(/filler|la la/)
  })

  it("reads bar lines and ChordPro", () => {
    const bars = readChordSheet("Intro: | G . D . | Em | % | C D |\nVerse\n[G]filler [D]words and [Em]more", { title: "x" })
    expect(bars.draft.sections[0]).toMatchObject({ name: "Intro", bars: ["G . D .", "Em", "%", "C D"] })
    expect(bars.draft.sections[1]).toMatchObject({ name: "Verse", bars: ["G", "D", "Em"] })
    const pro = readChordSheet("{title: Song}\n{key: G}\n{time: 3/4}\n{soc}\n[G]la la [C]la\n{eoc}", { title: "x" })
    expect(pro.draft).toMatchObject({ title: "Song", key: "G", beatsPerBar: 3 })
    expect(pro.draft.sections[0]).toMatchObject({ name: "Chorus", bars: ["G", "C"] })
  })

  it("finds nothing in a page of words", () => {
    expect(readChordSheet("Just some words\nand more words", { title: "x" }).draft.found).toBe(false)
  })

  it("makes a chart that parses", () => {
    const { draft } = readChordSheet(SHEET, { title: "Drunken Sailor" })
    const { chart } = draftToChart(draft, { source: { kind: "paste" }, date: new Date(2026, 9, 8), shapes: NO_SHAPE_TOOLS })
    expect(parseChart(chart, []).errors).toEqual([])
    expect(chart).toContain("note: Converted from pasted chords, 8 Oct 2026.")
  })

  it("sends the AI only the chord lines and headers", () => {
    const sent = chordLinesOnly(SHEET + "\n[G]filler [D]words")
    expect(sent).not.toMatch(/filler|la la/)
    expect(sent).toContain("[Verse 1]")
    expect(sent).toContain("Dm               C        Dm")
    expect(sent).toContain("Key: Dm")
    expect(sent.split("\n").at(-1)).toBe("G D")
  })
})
