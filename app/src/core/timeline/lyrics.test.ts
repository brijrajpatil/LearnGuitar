import { describe, expect, it } from "vitest"
import { parseChart } from "@/core/chart/parse"
import { arrange } from "@/core/timeline/arrangement"
import { hasLyrics, lineChords, lyricAt, shownWord, sungLines } from "@/core/timeline/lyrics"

// Made-up words, so no song's lyrics are in the repo (decision 0021).
const CHART = `time: 3/4
[Verse] pattern=A
G | G7 | C | G
> . . . . /La- . | li- . . . lo . | sun . . . on . | high
D | D | G | G
> . . . . /Mo- ri | ta . . . ve`

const song = parseChart(CHART, []).song
const lines = sungLines(song)

describe("sung lines", () => {
  it("splits the words into the lines the player sings, starting on a pickup", () => {
    expect(lines.map((l) => l.map((w) => w.text).join(" "))).toEqual(["La- li- lo sun on high", "Mo- ri ta ve"])
    expect(lines[1][0]).toEqual({ bar: 4, slot: 4, text: "Mo-" })
    expect(hasLyrics(song)).toBe(true)
    expect(sungLines(parseChart("[V]\nA", []).song)).toEqual([])
  })

  it("finds the line and the word being sung", () => {
    expect(lyricAt(lines, 6, 0, 0)).toEqual({ line: 0, word: -1 })
    expect(lyricAt(lines, 6, 0, 4)).toEqual({ line: 0, word: 0 })
    expect(lyricAt(lines, 6, 1, 3)).toEqual({ line: 0, word: 1 })
    // The line stays until the next line's first word.
    expect(lyricAt(lines, 6, 4, 3)).toEqual({ line: 0, word: 5 })
    expect(lyricAt(lines, 6, 4, 4)).toEqual({ line: 1, word: 0 })
    expect(lyricAt(lines, 6, 7, 5)).toEqual({ line: 1, word: 3 })
    expect(lyricAt([], 6, 0, 0)).toBeNull()
  })

  it("joins syllables without their hyphen", () => {
    expect(shownWord("La-")).toEqual({ text: "La", joins: true })
    expect(shownWord("on")).toEqual({ text: "on", joins: false })
    expect(shownWord("-")).toEqual({ text: "-", joins: false })
  })

  it("puts each chord change above the first word sung on it, in the key being played", () => {
    const arr = arrange(song, { level: "arranged", simplify: false, overrides: {}, customPatterns: [] })
    expect(lineChords(arr, lines[0])).toEqual(["G", "G7", null, "C", null, "G"])
    const moved = arrange(song, { level: "arranged", simplify: false, overrides: {}, customPatterns: [], key: { shapes: 5, capo: 7 } })
    expect(lineChords(moved, lines[0])).toEqual(["C", "C7", null, "F", null, "C"])
  })
})

describe("before a bar", () => {
  it("lights no word of the bar yet at slot -1", () => {
    const l = sungLines(parseChart("[V]\nA | D\n> la . . . lo | li", []).song)
    expect(lyricAt(l, 8, 0, -1)).toEqual({ line: 0, word: -1 })
    expect(lyricAt(l, 8, 1, -1)).toEqual({ line: 0, word: 1 })
  })
})
