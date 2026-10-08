import { describe, expect, it } from "vitest"
import { writeLyrics } from "@/core/chart/edit"
import { parseChart } from "@/core/chart/parse"
import { isBefore, placeSynced, slotAfter, splitLyrics } from "@/core/timeline/lyrics-sync"

// Made-up words, so no song's lyrics are in the repo (decision 0021).
describe("splitLyrics", () => {
  it("makes one tap per word or syllable, and starts a sung line at each line", () => {
    expect(splitLyrics("La-li-lo sun\n\n  on high  \nmo")).toEqual([
      { text: "La-", lineStart: true },
      { text: "li-", lineStart: false },
      { text: "lo", lineStart: false },
      { text: "sun", lineStart: false },
      { text: "on", lineStart: true },
      { text: "high", lineStart: false },
      { text: "mo", lineStart: true },
    ])
  })

  it("leaves out what the chart format uses, and stray hyphens", () => {
    expect(splitLyrics("/ra | ki... ... -ta ve- -").map((w) => w.text)).toEqual(["ra", "ki...", "ta", "ve"])
  })
})

describe("placeSynced and writeLyrics", () => {
  const CHART = `time: 3/4
[Verse] pattern=A
G | G7 | C
> . . . . /old . | old . | old
D | G
> zo`
  const song = parseChart(CHART, []).song

  it("replaces the words from the first tapped bar to the last, and keeps the rest", () => {
    const words = splitLyrics("La-li lo")
    const bars = placeSynced(song, words, [{ bar: 1, slot: 0 }, { bar: 1, slot: 4 }, { bar: 2, slot: 2 }])
    expect(bars.map((b) => b.map((w) => `${w.slot}:${w.lineStart ? "/" : ""}${w.text}`).join(" "))).toEqual([
      "4:/old",
      "0:/La- 4:li",
      "2:lo",
      "0:zo",
      "",
    ])
  })

  it("writes > lines that read back as the same words", () => {
    const words = splitLyrics("La-li lo\nmo")
    const taps = [{ bar: 1, slot: 0 }, { bar: 1, slot: 4 }, { bar: 2, slot: 2 }, { bar: 4, slot: 1 }]
    const bars = placeSynced(song, words, taps)
    const text = writeLyrics(CHART, song, bars)
    expect(text).toBe(`time: 3/4
[Verse] pattern=A
G | G7 | C
> . . . . /old | /La- . . . li | . . lo
D | G
> | . /mo`)
    const again = parseChart(text, [])
    expect(again.errors).toEqual([])
    expect(again.song.bars.map((b) => b.lyrics)).toEqual(bars)
  })

  it("leaves a chart without taps as it was, apart from its > lines' spacing", () => {
    expect(parseChart(writeLyrics(CHART, song, placeSynced(song, [], [])), []).song.bars).toEqual(song.bars)
  })
})

describe("positions", () => {
  it("moves to the next eighth note, and into the next bar after the last", () => {
    expect(slotAfter({ bar: 0, slot: 2 }, 6)).toEqual({ bar: 0, slot: 3 })
    expect(slotAfter({ bar: 0, slot: 5 }, 6)).toEqual({ bar: 1, slot: 0 })
    expect(isBefore({ bar: 0, slot: 5 }, { bar: 1, slot: 0 })).toBe(true)
    expect(isBefore({ bar: 1, slot: 0 }, { bar: 1, slot: 0 })).toBe(false)
  })
})
