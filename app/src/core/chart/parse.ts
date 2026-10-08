// Reads the chart text format. The format is the import format from the prototype, so
// every chart saved there must keep parsing the same way (see docs/decisions/0002).

import { resolvePatternRef, type CustomPattern, type PatternId } from "@/core/pattern/patterns"
import {
  SONG_SCHEMA_VERSION,
  TICKS_PER_EIGHTH,
  type ChordSpan,
  type LyricWord,
  type Section,
  type Song,
} from "@/core/song/types"
import { parseVoicing, VOICINGS } from "@/core/theory/voicings"

export interface ChartError {
  line: number
  message: string
}

export interface ParsedChart {
  song: Song
  /** Sorted by line. Empty when the chart is valid. */
  errors: ChartError[]
}

const MAX_ERRORS = 60

/** The record tempos a chart's tempo line accepts, in BPM. */
export const CHART_TEMPO_MIN = 20
export const CHART_TEMPO_MAX = 300

interface OpenSection extends Section {
  errorsAtStart: number
}

export function parseChart(text: string, custom: readonly CustomPattern[]): ParsedChart {
  const lines = String(text)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[“”„]/g, '"').replace(/♯/g, "#").replace(/♭/g, "b"))
  const song: Song = {
    schemaVersion: SONG_SCHEMA_VERSION,
    title: "",
    artist: "",
    key: "",
    capo: "",
    beatsPerBar: 4,
    tempo: null,
    notes: [],
    chords: {},
    simplify: {},
    sections: [],
    bars: [],
  }
  const errors: ChartError[] = []
  const err = (line: number, message: string) => {
    if (errors.length < MAX_ERRORS) errors.push({ line, message })
  }
  const isBody: boolean[] = []
  const simplifyLines: { line: number; from: string; to: string }[] = []

  // Pass 1: settings and chord definitions, so bars can use chords defined anywhere.
  lines.forEach((raw, i) => {
    const s = raw.trim()
    const ln = i + 1
    let m: RegExpMatchArray | null
    isBody[i] = false
    if (!s || s.startsWith("#") || s.startsWith("//")) return
    if ((m = s.match(/^chord\s+(\S+)\s*=\s*(\S+)(?:\s+(\S+))?\s*$/i))) {
      const v = parseVoicing(m[2], m[3])
      if (!v) {
        err(
          ln,
          `Chord "${m[1]}" needs 6 frets from low E to high E, like x24432, with optional fingers after a space, like x13421.`
        )
      } else song.chords[m[1]] = v
      return
    }
    if ((m = s.match(/^simplify\s+(\S+)\s*(?:=|->|→)\s*(\S+)\s*$/i))) {
      simplifyLines.push({ line: ln, from: m[1], to: m[2] })
      return
    }
    if ((m = s.match(/^([A-Za-z][A-Za-z ]*?)\s*:\s*(.*)$/))) {
      const k = m[1].toLowerCase()
      const v = m[2].trim()
      if (k === "title") song.title = v
      else if (k === "artist") song.artist = v
      else if (k === "key") song.key = v
      else if (k === "capo") song.capo = v
      else if (k === "note" || k === "info") {
        if (v) song.notes.push(v)
      } else if (k === "tempo" || k === "bpm") {
        const n = parseFloat(v)
        if (n >= CHART_TEMPO_MIN && n <= CHART_TEMPO_MAX) song.tempo = Math.round(n)
        else err(ln, `Tempo must be a number of BPM between ${CHART_TEMPO_MIN} and ${CHART_TEMPO_MAX}.`)
      } else if (k === "time") {
        const t = v.match(/^(\d+)\s*\/\s*4$/)
        if (!t || +t[1] < 2 || +t[1] > 7) err(ln, "Time must be 2/4 to 7/4, like time: 4/4.")
        else song.beatsPerBar = +t[1]
      } else {
        err(ln, `Unknown setting "${m[1]}". Use title, artist, key, capo, time, tempo or note.`)
      }
      return
    }
    isBody[i] = true
  })

  const known = (n: string) => song.chords[n] ?? VOICINGS[n]
  const allNames = () => Object.keys(song.chords).concat(Object.keys(VOICINGS))
  const resolveChord = (tok: string): string | null => {
    if (known(tok)) return tok
    const hit = allNames().filter((n) => n.toLowerCase() === tok.toLowerCase())
    return hit.length === 1 ? hit[0] : null
  }
  const spb = song.beatsPerBar * 2
  const splits: number[] = []
  for (let d = 1; d <= spb; d++) if (spb % d === 0) splits.push(d)
  let sec: OpenSection | null = null
  let lastChord: string | null = null
  // The bar line a ">" line gives words to: its first bar, how many bars it made, whether
  // it had an error, and whether it already has words.
  let barLine: { first: number; count: number; failed: boolean; worded: boolean } | null = null
  // The first word of each ">" line, which starts a sung line when the chart has no "/".
  const lyricLineStarts: LyricWord[] = []
  let slashes = false
  // An empty section is only reported when no bar error inside it already explains why.
  const closeSection = () => {
    if (!sec) return
    sec.end = song.bars.length
    if (sec.end === sec.start && errors.length === sec.errorsAtStart) {
      err(sec.line, `Section [${sec.name}] has no bars.`)
    }
  }

  // Pass 2: sections and bars.
  lines.forEach((raw, i) => {
    if (!isBody[i]) return
    const s = raw.trim()
    const ln = i + 1
    let m: RegExpMatchArray | null
    if ((m = s.match(/^\[([^\]]*)\]\s*(.*)$/))) {
      closeSection()
      const name = m[1].trim() || `Section ${song.sections.length + 1}`
      const attrs: { pattern: PatternId | null; record: PatternId | null } = {
        pattern: null,
        record: null,
      }
      const rest = m[2].trim()
      // "pattern=C record=Five beat figure": a value runs until the next "word=".
      if (rest) {
        rest.split(/\s+(?=[A-Za-z]+\s*=)/).forEach((part) => {
          const am = part.match(/^([A-Za-z]+)\s*=\s*(.*)$/)
          const key = am?.[1].toLowerCase()
          if (!am || (key !== "pattern" && key !== "record")) {
            err(
              ln,
              `After [${name}] write pattern=A to E, and optionally record=<figure>, like [${name}] pattern=C.`
            )
            return
          }
          const val = am[2].trim().replace(/^"(.*)"$/, "$1")
          const id = val ? resolvePatternRef(val, custom) : null
          if (!id) {
            err(
              ln,
              `Unknown ${key} "${val}". Use A, B, C, D or E, a saved custom pattern name, or a string like D.DU.UDU (D/U strum, . miss, 1-6 pick a string, B bass note).`
            )
          } else attrs[key] = id
        })
      }
      const opened: OpenSection = {
        name,
        line: ln,
        pattern: attrs.pattern,
        record: attrs.record,
        start: song.bars.length,
        end: song.bars.length,
        errorsAtStart: errors.length,
      }
      sec = opened
      song.sections.push(opened)
      barLine = null
      return
    }
    if (s.startsWith(">")) {
      if (!barLine) {
        err(ln, "Words go on a line starting with > right under a line of bars.")
        return
      }
      if (barLine.failed) return
      if (barLine.worded) {
        err(ln, "The bars above already have words. Put all their words on one > line.")
        return
      }
      barLine.worded = true
      const parts = s.slice(1).split("|")
      if (parts.length > barLine.count) {
        err(ln, `This line has words for ${parts.length} bars, but the line of bars above has ${barLine.count}.`)
        return
      }
      let first: LyricWord | null = null
      parts.forEach((part, b) => {
        const words: LyricWord[] = []
        let slot = 0
        let lineStart = false
        for (let tok of part.trim().split(/\s+/).filter(Boolean)) {
          if (tok.startsWith("/")) {
            slashes = true
            lineStart = true
            tok = tok.slice(1)
            if (!tok) continue
          }
          if (tok !== ".") {
            const word = { slot, text: tok, lineStart }
            words.push(word)
            first ??= word
            lineStart = false
          }
          slot++
        }
        if (slot > spb) {
          const where = parts.length > 1 ? `Bar ${b + 1} on this line` : "This bar"
          err(ln, `${where} has ${slot} words and dots, but a ${song.beatsPerBar}-beat bar has ${spb} eighth notes.`)
          return
        }
        song.bars[barLine!.first + b].lyrics = words
      })
      if (first) lyricLineStarts.push(first)
      return
    }
    if (s.startsWith("[")) {
      err(ln, "A section header needs a closing ], like [Verse 1] pattern=C.")
      return
    }
    if (!sec) {
      err(ln, "Bars need a section header above them, like [Verse 1] pattern=C.")
      return
    }

    const parts: string[] = []
    let cur = ""
    let quoted = false
    for (const ch of s) {
      if (ch === '"') quoted = !quoted
      if (ch === "|" && !quoted) {
        parts.push(cur)
        cur = ""
        continue
      }
      cur += ch
    }
    parts.push(cur)
    if (quoted) {
      err(ln, 'A cue is missing its closing quote (").')
      // Words under this line wait for the quote to be fixed, without an error of their own.
      barLine = { first: song.bars.length, count: 0, failed: true, worded: false }
      return
    }
    const firstBar = song.bars.length
    const errorsBefore = errors.length

    let barNo = 0
    for (const part of parts) {
      let cue = ""
      let body = part
        .replace(/"([^"]*)"/g, (_, c: string) => {
          c = c.trim()
          if (c) cue = cue ? cue + " " + c : c
          return " "
        })
        .trim()
      if (!body && !cue) continue
      barNo++
      const where = parts.length > 1 ? ` (bar ${barNo} on this line)` : ""
      let rep = 1
      const rm = body.match(/\*\s*(\d+)\s*$/)
      if (rm) {
        rep = parseInt(rm[1], 10)
        body = body.slice(0, rm.index).trim()
        if (rep < 1 || rep > 999) {
          err(ln, `Repeat count must be 1 to 999${where}.`)
          continue
        }
      }
      if (!body) {
        err(ln, `This bar has no chord${where}. Write a chord name, or "." to hold the previous chord.`)
        continue
      }
      if (body.includes("*")) {
        err(ln, `Put the repeat at the end of the bar, like A*4${where}.`)
        continue
      }
      const toks = body.split(/\s+/)
      if (spb % toks.length !== 0) {
        err(
          ln,
          `${toks.length} chords can't split a ${song.beatsPerBar}-beat bar evenly${where}. Use ${splits.slice(0, -1).join(", ")} or ${splits[splits.length - 1]} chords per bar, with "." to hold a chord, like "D . . A".`
        )
        continue
      }
      const per = (spb / toks.length) * TICKS_PER_EIGHTH
      const spans: ChordSpan[] = []
      let bad = false
      toks.forEach((tk, k) => {
        if (bad) return
        if (tk === ".") {
          if (spans.length) spans[spans.length - 1].length += per
          else if (lastChord) spans.push({ chord: lastChord, start: 0, length: per })
          else {
            err(ln, `"." holds the previous chord, but no chord comes before it${where}.`)
            bad = true
          }
          return
        }
        const name = resolveChord(tk)
        if (!name) {
          err(
            ln,
            `Unknown chord "${tk}"${where}. Check the spelling, or define it on its own line as: chord ${tk} = (6 frets, low E to high E, like x02210)`
          )
          bad = true
          return
        }
        spans.push({ chord: name, start: k * per, length: per })
      })
      if (bad) continue
      lastChord = spans[spans.length - 1].chord
      for (let r = 0; r < rep; r++) {
        song.bars.push({ section: song.sections.length - 1, chords: spans, cue, line: ln, lyrics: [] })
      }
    }
    barLine = { first: firstBar, count: song.bars.length - firstBar, failed: errors.length > errorsBefore, worded: false }
  })
  closeSection()
  // Without any "/", each ">" line is one sung line. The song's first word always starts one.
  if (!slashes) for (const w of lyricLineStarts) w.lineStart = true
  if (lyricLineStarts.length) lyricLineStarts[0].lineStart = true

  simplifyLines.forEach(({ line, from, to }) => {
    const f = resolveChord(from)
    const t = resolveChord(to)
    if (!f) err(line, `Unknown chord "${from}" in this simplify line.`)
    else if (!t) err(line, `Unknown chord "${to}" in this simplify line. Add it with a chord line first.`)
    else song.simplify[f] = t
  })

  if (!song.sections.length && !errors.length) {
    err(1, "The chart has no sections yet. Start with a header like [Verse 1] pattern=A.")
  }
  errors.sort((a, b) => a.line - b.line)
  // Drop the parser's bookkeeping so the song is plain data.
  song.sections = song.sections.map(({ name, line, pattern, record, start, end }) => ({
    name,
    line,
    pattern,
    record,
    start,
    end,
  }))
  return { song, errors }
}
