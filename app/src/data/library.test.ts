import { describe, expect, it } from "vitest"
import { parseChart } from "@/core/chart/parse"
import { findVoicing, simplifiedName } from "@/core/theory/chords"
import { CATALOG, type CatalogEntry } from "@/data/library/catalog"
import { chartPath, LIBRARY, LIBRARY_FILES } from "@/data/library"

const parsed = LIBRARY.map((entry) => ({ entry, ...parseChart(entry.chart, []) }))
const named = (e: CatalogEntry) => `${e.collection}/${e.id}`

describe("the library", () => {
  it("has a chart file for every catalog entry, and an entry for every file", () => {
    const missing = CATALOG.filter((e) => !(chartPath(e) in LIBRARY_FILES)).map(named)
    expect(missing).toEqual([])
    const paths = new Set(CATALOG.map(chartPath))
    expect(Object.keys(LIBRARY_FILES).filter((p) => !paths.has(p))).toEqual([])
  })

  it("uses unique, permanent slugs as ids, and never the owner's personal song ids", () => {
    const ids = CATALOG.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    expect(ids).not.toContain("let-down")
    expect(ids).toContain("amazing-grace")
  })

  it("parses every chart without errors", () => {
    for (const { entry, errors } of parsed) expect(errors, named(entry)).toEqual([])
  })

  it("has a shape for every chord, and for its simplified chord", () => {
    for (const { entry, song } of parsed) {
      for (const bar of song.bars) {
        for (const { chord } of bar.chords) {
          expect(findVoicing(song, chord), `${named(entry)}: ${chord}`).not.toBeNull()
          const easy = simplifiedName(song, chord)
          expect(findVoicing(song, easy), `${named(entry)}: ${chord} simplified to ${easy}`).not.toBeNull()
        }
      }
    }
  })

  it("keeps barre chords out of First chords and Easy, and First chords to three chords", () => {
    for (const { entry, song } of parsed) {
      const chords = [...new Set(song.bars.flatMap((b) => b.chords.map((c) => c.chord)))]
      const barres = chords.filter((c) => findVoicing(song, c)?.barre)
      if (entry.difficulty === "first" || entry.difficulty === "easy") {
        expect(barres, `${named(entry)} is ${entry.difficulty}`).toEqual([])
      }
      if (entry.difficulty === "first") expect(chords.length, named(entry)).toBeLessThanOrEqual(3)
    }
  })

  it("gives every song a title, a tempo and a note, and every folk song its writers", () => {
    for (const { entry, song } of parsed) {
      expect(song.title, named(entry)).not.toBe("")
      expect(song.tempo, named(entry)).not.toBeNull()
      expect(song.notes.length, named(entry)).toBeGreaterThan(0)
      // "Traditional", or the writers by name, so the public domain claim can be checked.
      if (entry.collection === "traditional") expect(song.artist, named(entry)).not.toBe("")
      else expect(song.artist, named(entry)).toBe("")
    }
  })
})
