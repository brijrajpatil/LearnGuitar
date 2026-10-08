import { describe, expect, it } from "vitest"
import { setChartTempo } from "@/core/chart/edit"
import { parseChart } from "@/core/chart/parse"

describe("setChartTempo", () => {
  it("replaces the tempo line and keeps everything else", () => {
    const text = "title: Song\ntempo: 90\ntime: 3/4\n\n[Verse] pattern=A\nG | C"
    expect(setChartTempo(text, 76)).toBe("title: Song\ntempo: 76\ntime: 3/4\n\n[Verse] pattern=A\nG | C")
  })

  it("keeps a bpm line's own word", () => {
    expect(setChartTempo("BPM: 100\n[V]\nG", 84)).toBe("BPM: 84\n[V]\nG")
  })

  it("adds a tempo line after the settings when the chart has none", () => {
    const text = "title: Song\nartist: Someone\n# my notes\n[Verse] pattern=A\nG | C\nnote: late note"
    const out = setChartTempo(text, 92)
    expect(out).toBe("title: Song\nartist: Someone\ntempo: 92\n# my notes\n[Verse] pattern=A\nG | C\nnote: late note")
    expect(parseChart(out, []).song.tempo).toBe(92)
  })

  it("adds it at the top when there are no settings", () => {
    expect(setChartTempo("[V]\nG", 60)).toBe("tempo: 60\n[V]\nG")
  })
})
