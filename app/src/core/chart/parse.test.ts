import { describe, expect, it } from "vitest"
import { parseChart } from "@/core/chart/parse"
import { BUILTIN_SONGS, builtinChart, DEFAULT_SONG_ID, NEW_SONG_TEMPLATE } from "@/data/builtin-songs"

const parse = (text: string) => parseChart(text, [])
const messages = (text: string) => parse(text).errors.map((e) => `${e.line}: ${e.message}`)

describe("parseChart", () => {
  it("reads the built-in demo and the new song template without errors", () => {
    for (const { chart } of BUILTIN_SONGS) expect(parse(chart).errors).toEqual([])
    expect(parse(NEW_SONG_TEMPLATE).errors).toEqual([])
  })

  it("reads settings, sections and bars from Amazing Grace", () => {
    const { song } = parse(builtinChart(DEFAULT_SONG_ID)!)
    expect(song.title).toBe("Amazing Grace")
    expect(song.artist).toBe("Traditional")
    expect(song.beatsPerBar).toBe(3)
    expect(song.tempo).toBe(80)
    expect(song.notes).toHaveLength(1)
    expect(song.sections.map((s) => [s.name, s.start, s.end])).toEqual([
      ["Intro", 0, 2],
      ["Verse 1", 2, 18],
      ["Verse 2", 18, 34],
      ["Outro", 34, 35],
    ])
    expect(song.sections[1].pattern).toBe("i:B.DUDU")
    expect(song.sections[1].record).toBe("i:B32123")
    expect(song.sections[3].pattern).toBe("E")
  })

  it("splits a bar between chords in ticks, and holds a chord with a dot", () => {
    const { song, errors } = parse("[V] pattern=A\nD Dsus2 | D . . A | Em*3")
    expect(errors).toEqual([])
    expect(song.bars[0].chords).toEqual([
      { chord: "D", start: 0, length: 24 },
      { chord: "Dsus2", start: 24, length: 24 },
    ])
    expect(song.bars[1].chords).toEqual([
      { chord: "D", start: 0, length: 36 },
      { chord: "A", start: 36, length: 12 },
    ])
    expect(song.bars).toHaveLength(5)
    expect(song.bars[4].chords).toEqual([{ chord: "Em", start: 0, length: 48 }])
  })

  it("keeps a leading dot on the previous bar's chord", () => {
    const { song } = parse("[V] pattern=A\nG | . C")
    expect(song.bars[1].chords).toEqual([
      { chord: "G", start: 0, length: 24 },
      { chord: "C", start: 24, length: 24 },
    ])
  })

  it("reads cues, curly quotes, sharp and flat signs, and case-insensitive chord names", () => {
    const { song, errors } = parse('[V] pattern=A\nF♯m “watch the change” | am')
    expect(errors).toEqual([])
    expect(song.bars[0]).toMatchObject({ cue: "watch the change", line: 2 })
    expect(song.bars[0].chords[0].chord).toBe("F#m")
    expect(song.bars[1].chords[0].chord).toBe("Am")
  })

  it("lets a chart define chords and simplify rules anywhere", () => {
    const { song, errors } = parse("[V] pattern=A\nBb\nchord Bb = x13331 x12341\nsimplify Bb = A")
    expect(errors).toEqual([])
    expect(song.chords.Bb.frets).toEqual([-1, 1, 3, 3, 3, 1])
    expect(song.simplify).toEqual({ Bb: "A" })
  })

  it("resolves custom pattern names, figures and a record figure with spaces", () => {
    const custom = [{ name: "Let Down", steps: "D.DUD.DU.U" }]
    const { song, errors } = parseChart("[V] pattern=Let Down record=D . D U\nA", custom)
    expect(errors).toEqual([])
    expect(song.sections[0].pattern).toBe("c:Let Down")
    expect(song.sections[0].record).toBe("i:D.DU")
  })

  it("reports problems with the line and a fix", () => {
    expect(
      messages(
        [
          "tempo: 500",
          "time: 9/8",
          "colour: red",
          "A | A",
          "[Verse] pattern=Z",
          "Q | A A A",
          "[Empty]",
          "[Broken",
          'A "unclosed',
          "A*0 | A*2 B",
          "chord X = 1234",
        ].join("\n")
      )
    ).toEqual([
      "1: Tempo must be a number of BPM between 20 and 300.",
      "2: Time must be 2/4 to 7/4, like time: 4/4.",
      '3: Unknown setting "colour". Use title, artist, key, capo, time, tempo or note.',
      "4: Bars need a section header above them, like [Verse 1] pattern=C.",
      '5: Unknown pattern "Z". Use A, B, C, D or E, a saved custom pattern name, or a string like D.DU.UDU (D/U strum, . miss, 1-6 pick a string, B bass note).',
      '6: Unknown chord "Q" (bar 1 on this line). Check the spelling, or define it on its own line as: chord Q = (6 frets, low E to high E, like x02210)',
      `6: 3 chords can't split a 4-beat bar evenly (bar 2 on this line). Use 1, 2, 4 or 8 chords per bar, with "." to hold a chord, like "D . . A".`,
      "8: A section header needs a closing ], like [Verse 1] pattern=C.",
      '9: A cue is missing its closing quote (").',
      "10: Repeat count must be 1 to 999 (bar 1 on this line).",
      "10: Put the repeat at the end of the bar, like A*4 (bar 2 on this line).",
      '11: Chord "X" needs 6 frets from low E to high E, like x24432, with optional fingers after a space, like x13421.',
    ])
  })

  it("reports an empty section only when nothing inside it explains why", () => {
    expect(messages("[Empty]\n[Verse] pattern=A\nA")).toEqual(["1: Section [Empty] has no bars."])
  })

  it("asks for a first section when the chart is empty", () => {
    expect(messages("title: Nothing yet")).toEqual([
      "1: The chart has no sections yet. Start with a header like [Verse 1] pattern=A.",
    ])
  })
})

// Made-up words, so no song's lyrics are in the repo (decision 0021).
describe("lyrics lines", () => {
  const words = (text: string) => parse(text).song.bars.map((b) => b.lyrics.map((w) => `${w.slot}:${w.lineStart ? "/" : ""}${w.text}`).join(" "))

  it("puts each word on the next eighth note, with dots for eighth notes without one", () => {
    const text = "time: 3/4\n[Verse] pattern=A\nG | G7 | C\n> . . . . /La- . | li- . . . lo . | sun . . . on"
    expect(parse(text).errors).toEqual([])
    expect(words(text)).toEqual(["4:/La-", "0:li- 4:lo", "0:sun 4:on"])
  })

  it("gives words to the bars a repeat makes, and leaves bars without words empty", () => {
    const text = "[V]\nA*3 | D\n> zo | . . ba"
    expect(words(text)).toEqual(["0:/zo", "2:ba", "", ""])
  })

  it("starts a sung line at each > line when the chart has no /", () => {
    const text = "[V]\nA | D\n> mo ri\nE | A\n> . . ta | ve"
    expect(words(text)).toEqual(["0:/mo 1:ri", "", "2:/ta", "0:ve"])
  })

  it("starts sung lines only at / when the chart has one, even mid-bar", () => {
    const text = "[V]\nA | D\n> mo ri\nE | A\n> . . ta / ve | ko"
    expect(words(text)).toEqual(["0:/mo 1:ri", "", "2:ta 3:/ve", "0:ko"])
  })

  it("keeps working when old charts have no lyrics", () => {
    expect(parse(builtinChart(DEFAULT_SONG_ID)!).song.bars.every((b) => b.lyrics.length === 0)).toBe(true)
  })

  it("reports words that don't fit, with the line", () => {
    expect(messages("[V]\n> la")).toEqual(["2: Words go on a line starting with > right under a line of bars."])
    expect(messages("[V]\nA\n> la | lo")).toEqual(["3: This line has words for 2 bars, but the line of bars above has 1."])
    expect(messages("time: 2/4\n[V]\nA | D\n> . | a b c d e")).toEqual([
      "4: Bar 2 on this line has 5 words and dots, but a 2-beat bar has 4 eighth notes.",
    ])
    expect(messages("[V]\nA\n> la\n> lo")).toEqual(["4: The bars above already have words. Put all their words on one > line."])
    expect(messages("[V]\nA\n[W]\n> la\nD")).toEqual(["4: Words go on a line starting with > right under a line of bars."])
  })

  it("ignores words under a line of bars with an error, which is reported already", () => {
    expect(messages("[V]\nA | Hm\n> la | lo")).toHaveLength(1)
    expect(messages('[V]\nA "open cue\n> la')).toHaveLength(1)
  })
})
