import { describe, expect, it } from "vitest"
import { parseChart } from "@/core/chart/parse"
import type { ArrangementSettings } from "@/core/timeline/arrangement"
import { familyChords, familyFit, FAMILIES } from "@/core/timeline/family"
import { LIBRARY } from "@/data/library"

const base: ArrangementSettings = { level: "arranged", simplify: false, overrides: {}, customPatterns: [] }
const G = 7
const chart = (text: string) => parseChart(text, []).song
const library = (id: string) => chart(LIBRARY.find((s) => s.id === id)!.chart)

describe("chord families", () => {
  it("lists each family's open chords, with a 7th chord where the triad needs a barre", () => {
    expect(FAMILIES.map(familyChords)).toEqual([
      ["C", "Fmaj7", "G", "Am", "Dm", "Em"],
      ["G", "C", "D", "Em", "Am", "Bm7"],
      ["D", "G", "A", "Bm7", "Em"],
      ["A", "D", "E", "Bm7"],
      ["E", "A", "B7"],
    ])
  })

  it("fits songs whose chords, moved into G, are the family's open chords", () => {
    expect(familyFit(library("amazing-grace"), base, G)).toMatchObject({ fits: true, shapes: 0, capo: 0, chords: ["G", "G7", "C", "D", "Em"] })
    expect(familyFit(library("michael-row"), base, G)).toMatchObject({ fits: true, capo: 7, chords: ["G", "C", "D7"] })
    expect(familyFit(library("blues-in-a"), base, G)).toMatchObject({ fits: true, chords: ["G7", "C7", "D7"] })
  })

  it("fits a minor song to its relative major's family, even when no capo keeps its sound", () => {
    expect(familyFit(library("drunken-sailor"), base, G)).toMatchObject({ fits: true, capo: null, chords: ["Em", "D"] })
  })

  it("leaves out songs with a chord from outside the family, or one that needs a barre", () => {
    expect(familyFit(library("greensleeves"), base, G)?.fits).toBe(false)
    expect(familyFit(chart("key: G\n[V] pattern=A\nG | Bm | C | D"), base, G)).toMatchObject({ fits: false, barreChords: ["Bm"] })
    expect(familyFit(chart("key: G\n[V] pattern=A\nG | A7 | D"), base, G)?.fits).toBe(false)
  })

  it("counts slash chords of the family's chords", () => {
    expect(familyFit(library("walking-bass"), base, G)?.fits).toBe(true)
  })

  it("judges the chords as Simplify chords plays them", () => {
    const song = chart("key: A\n[V] pattern=A\nA | F#m | D | E")
    expect(familyFit(song, base, 9)?.fits).toBe(false)
    expect(familyFit(song, { ...base, simplify: true }, 9)?.fits).toBe(true)
  })

  it("can't fit a song with no key", () => {
    expect(familyFit(chart("chord Riff = x02200\n[V] pattern=A\nRiff"), base, G)).toBeNull()
  })
})
