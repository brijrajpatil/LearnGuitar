import { describe, expect, it } from "vitest"
import { parseChart } from "@/core/chart/parse"
import {
  arrange,
  barSteps,
  chordAt,
  countInSteps,
  nextBar,
  nextChange,
  sectionKey,
  stepAt,
  type ArrangementSettings,
} from "@/core/timeline/arrangement"
import { upcoming } from "@/core/timeline/upcoming"
import { DEMO_SONGS } from "@/data/builtin-songs"

const CHART = `title: Test
time: 4/4
[Verse] pattern=C record=DUDUDUDU.D
A | E | F#m Dsus2
[Chorus] pattern=B
D | D
[Outro] pattern=B
A
`

const base: ArrangementSettings = { level: "arranged", simplify: false, overrides: {}, customPatterns: [] }
const song = parseChart(CHART, []).song
const make = (s: Partial<ArrangementSettings> = {}) => arrange(song, { ...base, ...s })
const trainerOff = { on: false, step: 3, target: 100 }

describe("arrangement", () => {
  it("plays pattern A at Beginner, the chart pattern at Arranged, and the record figure at Record", () => {
    expect(make({ level: "beginner" }).patterns.map((p) => p.id)).toEqual(["A", "A", "A"])
    expect(make().patterns.map((p) => p.id)).toEqual(["C", "B", "B"])
    expect(make({ level: "record" }).patterns.map((p) => p.id)).toEqual(["i:DUDUDUDU.D", "B", "B"])
  })

  it("applies a saved override by section key", () => {
    const arr = make({ overrides: { [sectionKey(song, 1)]: "E" } })
    expect(arr.patterns[1].id).toBe("E")
    expect(arr.autoPatterns[1].id).toBe("B")
  })

  it("simplifies chords and merges equal neighbours", () => {
    expect(make({ simplify: true }).barChords[2]).toEqual([
      { chord: "F#m(easy)", start: 0, length: 24 },
      { chord: "D", start: 24, length: 24 },
    ])
    const merged = arrange(parseChart("[V] pattern=A\nD Dsus2", []).song, { ...base, simplify: true })
    expect(merged.barChords[0]).toEqual([{ chord: "D", start: 0, length: 48 }])
  })

  it("finds the chord and step at a slot, with record figures running on", () => {
    const arr = make({ level: "record" })
    expect(chordAt(arr, 2, 3)).toBe("F#m")
    expect(chordAt(arr, 2, 4)).toBe("Dsus2")
    expect(stepAt(arr, 1, 0)).toBe(".")
    expect(stepAt(arr, 1, 1)).toBe("D")
  })

  it("walks bars in play order, around a loop, and stops at the end", () => {
    const arr = make()
    expect(nextBar(arr, 2, null)).toBe(3)
    expect(nextBar(arr, 5, null)).toBe(-1)
    expect(nextBar(arr, 4, { section: 1 })).toBe(3)
    expect(nextBar(arr, 0, { section: 1 })).toBe(3)
  })

  it("counts slots to the next chord change, across bars and loops", () => {
    const arr = make()
    expect(nextChange(arr, 0, 0, null)).toEqual({ kind: "chord", chord: "E", slots: 8 })
    expect(nextChange(arr, 2, 1, null)).toEqual({ kind: "chord", chord: "Dsus2", slots: 3 })
    expect(nextChange(arr, 3, 0, null)).toEqual({ kind: "chord", chord: "A", slots: 16 })
    expect(nextChange(arr, 5, 0, null)).toEqual({ kind: "end" })
    expect(nextChange(arr, 3, 0, { section: 1 })).toEqual({ kind: "hold" })
  })

  it("builds a bar's events: clicks on beats, strums with their chord, accented downbeat", () => {
    const steps = barSteps(make(), 0)
    expect(steps.map((s) => s.click)).toEqual(["accent", null, "beat", null, "beat", null, "beat", null])
    expect(steps.map((s) => s.tick)).toEqual([0, 6, 12, 18, 24, 30, 36, 42])
    expect(steps.map((s) => (s.sound?.type === "strum" ? s.sound.direction : "-"))).toEqual(
      "D-DU-UDU".split("")
    )
    expect(steps[0].sound).toMatchObject({ chord: "A", accent: true })
  })

  it("plays picked strings and skips a pick on a muted string", () => {
    const { song: grace } = parseChart(DEMO_SONGS[0].chart, [])
    const arr = arrange(grace, { ...base, level: "record" })
    const steps = barSteps(arr, 0)
    expect(steps.map((s) => (s.sound?.type === "pick" ? s.sound.string : null))).toEqual([0, 3, 4, 5, 4, 3])
    const d = parseChart("[V] pattern=6.6.6.6.\nD", []).song
    expect(barSteps(arrange(d, base), 0).every((s) => s.sound === null)).toBe(true)
  })

  it("counts in with clicks only", () => {
    const steps = countInSteps(make())
    expect(steps.filter((s) => s.click)).toHaveLength(4)
    expect(steps.every((s) => s.sound === null)).toBe(true)
  })
})

describe("upcoming", () => {
  const opts = { loop: null, pass: null, trainer: trainerOff, tempo: 80 }

  it("warns one bar before the pattern changes", () => {
    expect(upcoming(make(), 2, opts)).toMatchObject({ kind: "pattern-change", section: "Chorus" })
  })

  it("names the next section and whether its pattern is the same", () => {
    expect(upcoming(make(), 0, opts)).toMatchObject({ kind: "up-next", section: "Chorus", barsLeft: 3 })
    expect(upcoming(make(), 4, opts)).toMatchObject({ kind: "up-next", samePattern: true, barsLeft: 1 })
  })

  it("shows the loop and the speed trainer while looping a section", () => {
    const u = upcoming(make(), 3, { ...opts, loop: { section: 1 }, pass: 2, trainer: { on: true, step: 3, target: 80 } })
    expect(u).toEqual({
      kind: "loop",
      section: "Chorus",
      pass: 2,
      trainer: { on: true, step: 3, target: 80, atTarget: true },
    })
  })

  it("says when the song ends", () => {
    expect(upcoming(make(), 5, opts)).toEqual({ kind: "last-section", barsLeft: 1 })
  })
})
