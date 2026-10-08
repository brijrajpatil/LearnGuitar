import { describe, expect, it } from "vitest"
import { parseChart } from "@/core/chart/parse"
import { stringMidi } from "@/core/theory/chords"
import { keyName } from "@/core/theory/keys"
import { arrange, barSteps, voicingOf, type ArrangementSettings } from "@/core/timeline/arrangement"
import { keyOptions, offsetFromRecord } from "@/core/timeline/key-options"
import { builtinChart, DEFAULT_SONG_ID } from "@/data/builtin-songs"
import { LIBRARY } from "@/data/library"

const base: ArrangementSettings = { level: "arranged", simplify: false, overrides: {}, customPatterns: [] }
const chart = (text: string) => parseChart(text, []).song
const LET_DOWN_CHORDS = chart("key: A\n[Verse] pattern=A\nA | E | F#m | D\n[Chorus] pattern=A\nD Dsus2 | D/F# | Asus4 | Amaj7")
const names = (arr: ReturnType<typeof arrange>) => arr.barChords.map((spans) => spans.map((s) => s.chord).join(" "))

describe("playing in another key", () => {
  it("plays as the chart writes it, with the chart's capo, when no key is chosen", () => {
    const capoSong = chart("capo: 3\n[V] pattern=A\nG | C")
    expect(arrange(capoSong, base)).toMatchObject({ shapes: 0, capo: 3 })
    expect(names(arrange(capoSong, base))).toEqual(["G", "C"])
  })

  it("moves the chord names and plays the shapes with the chosen capo", () => {
    const arr = arrange(LET_DOWN_CHORDS, { ...base, key: { shapes: 10, capo: 2 } })
    expect(names(arr)).toEqual(["G", "D", "Em", "C", "C Csus2", "C/E", "Gsus4", "Gmaj7"])
    expect(arr.capo).toBe(2)
  })

  it("sounds like the record with the matching capo", () => {
    const written = arrange(LET_DOWN_CHORDS, base)
    const moved = arrange(LET_DOWN_CHORDS, { ...base, key: { shapes: 10, capo: 2 } })
    const pitches = (arr: typeof written, bar: number) => {
      const s = barSteps(arr, bar)[0].sound!
      return new Set(s.voicing.frets.flatMap((f, i) => (f < 0 ? [] : [stringMidi(i, f) % 12])))
    }
    for (let bar = 0; bar < written.barChords.length; bar++) expect(pitches(moved, bar)).toEqual(pitches(written, bar))
  })

  it("spells the new key's chords with flats when the key uses them", () => {
    const arr = arrange(chart("key: C\n[V] pattern=A\nC | F | G7"), { ...base, key: { shapes: 5, capo: 0 } })
    expect(names(arr)).toEqual(["F", "Bb", "C7"])
  })

  it("moves the chart's simplify rules with the chords", () => {
    const song = chart("key: D\nsimplify Bm = G\n[V] pattern=A\nD | Bm")
    const arr = arrange(song, { ...base, simplify: true, key: { shapes: 7, capo: 0 } })
    expect(names(arr)).toEqual(["A", "D"])
  })

  it("uses the chart's own shapes only where it plays as written", () => {
    const song = chart("chord A = x02220 x01230\nchord Riff = x02200\n[V] pattern=A\nA | Riff")
    expect(voicingOf(arrange(song, base), "A")?.fingers).toEqual(["", "", "1", "2", "3", ""])
    const moved = arrange(song, { ...base, key: { shapes: 10, capo: 2 } })
    expect(names(moved)).toEqual(["G", "Riff"])
    expect(voicingOf(moved, "G")?.frets).toEqual([3, 2, 0, 0, 0, 3])
    expect(voicingOf(moved, "Riff")?.frets).toEqual([-1, 0, 2, 2, 0, 0])
  })
})

describe("key options", () => {
  it("lists the open-chord families first, then the other keys from C up", () => {
    const options = keyOptions(LET_DOWN_CHORDS, base)!
    expect(options.map((o) => keyName(o.key))).toEqual(["C", "G", "D", "A", "E", "Db", "Eb", "F", "F#", "Ab", "Bb", "B"])
    expect(options.slice(0, 5).every((o) => o.family)).toBe(true)
    expect(options[5].family).toBe(false)
  })

  it("lists a minor song in minor keys, by family", () => {
    const options = keyOptions(chart("key: Am\n[V] pattern=A\nAm | F | C | E"), base)!
    expect(options.slice(0, 5).map((o) => keyName(o.key))).toEqual(["Am", "Em", "Bm", "F#m", "C#m"])
  })

  it("gives each key's chords, barre chords and the capo that keeps the record's sound", () => {
    const options = keyOptions(chart("key: A\n[V] pattern=A\nA | E | F#m | D"), base)!
    const by = (k: string) => options.find((o) => keyName(o.key) === k)!
    expect(by("A")).toMatchObject({ shapes: 0, chords: ["A", "E", "F#m", "D"], barres: 1, capo: 0 })
    expect(by("G")).toMatchObject({ shapes: 10, chords: ["G", "D", "Em", "C"], barres: 0, capo: 2 })
    expect(by("E")).toMatchObject({ chords: ["E", "B", "C#m", "A"], barres: 2, capo: 5 })
    expect(by("C")).toMatchObject({ chords: ["C", "G", "Am", "F"], barres: 1, capo: null })
  })

  it("counts the four-string F#m as no barre when Simplify chords is on", () => {
    const options = keyOptions(chart("key: A\n[V] pattern=A\nA | E | F#m | D"), { ...base, simplify: true })!
    expect(options.find((o) => o.shapes === 0)).toMatchObject({ chords: ["A", "E", "F#m(easy)", "D"], barres: 0 })
  })

  it("works from the chart's capo: a capo 2 chart in G sounds in A", () => {
    const options = keyOptions(chart("key: G\ncapo: 2\n[V] pattern=A\nG | C | D"), base)!
    expect(options.find((o) => keyName(o.key) === "G")?.capo).toBe(2)
    expect(options.find((o) => keyName(o.key) === "A")?.capo).toBe(0)
    expect(options.find((o) => keyName(o.key) === "E")?.capo).toBe(5)
  })

  it("puts Amazing Grace in E shapes with a capo on fret 3", () => {
    const grace = chart(builtinChart(DEFAULT_SONG_ID)!)
    expect(keyOptions(grace, base)!.find((o) => keyName(o.key) === "E")).toMatchObject({ shapes: 9, capo: 3 })
  })

  it("moves every built-in song to all 12 keys, with a shape for every chord", () => {
    const problems = LIBRARY.flatMap((entry) => {
      const options = keyOptions(chart(entry.chart), base)
      if (!options) return [`${entry.id}: no key`]
      return options.flatMap((o) => (o.missing.length ? [`${entry.id} in ${keyName(o.key)}: ${o.missing.join(", ")}`] : []))
    })
    expect(problems).toEqual([])
  })

  it("lists chords that can't move to another key", () => {
    const options = keyOptions(chart("key: A\nchord Riff = x02200\n[V] pattern=A\nA | Riff"), base)!
    expect(options.find((o) => o.shapes === 0)?.missing).toEqual([])
    expect(options.find((o) => o.shapes === 10)?.missing).toEqual(["Riff"])
  })

  it("has no options when the song has no chords to find a key from", () => {
    expect(keyOptions(chart("chord Riff = x02200\n[V] pattern=A\nRiff"), base)).toBeNull()
  })
})

describe("how far from the record", () => {
  it("counts the frets between what you hear and the record", () => {
    const noCapo = { capo: "" }
    expect(offsetFromRecord(noCapo, { shapes: 10, capo: 2 })).toBe(0)
    expect(offsetFromRecord(noCapo, { shapes: 10, capo: 0 })).toBe(-2)
    expect(offsetFromRecord(noCapo, { shapes: 3, capo: 0 })).toBe(3)
    expect(offsetFromRecord(noCapo, { shapes: 6, capo: 0 })).toBe(6)
    expect(offsetFromRecord({ capo: "2" }, { shapes: 0, capo: 0 })).toBe(-2)
  })
})
