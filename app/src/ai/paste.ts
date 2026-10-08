// Reads a chord sheet pasted from a web page, with no AI and no network. It keeps the
// chords, section names, key, capo and tempo, and drops every line of lyrics.

import { isChordName } from "@/ai/chord-names"
import { LIMITS, type DraftSection, type SongDraft } from "@/ai/schema"
import { keyName } from "@/ai/to-chart"

type Line =
  | { kind: "blank" | "lyric" }
  | { kind: "header"; name: string; chords: string | null }
  | { kind: "meta"; field: "title" | "artist" | "key" | "capo" | "tempo" | "time"; value: string }
  | { kind: "chords"; bars: string[]; repeat: number }

const SECTION_WORDS =
  "intro|verse|pre-?chorus|chorus|bridge|solo|outro|interlude|instrumental|refrain|coda|break|hook|tag|ending|riff"
const HEADER = new RegExp(`^[\\[(]?\\s*((?:${SECTION_WORDS})(?:\\s*\\d+)?)\\s*[\\])]?\\s*:?\\s*(.*)$`, "i")
const BRACKET_HEADER = /^\[([^\]]{1,30})\]\s*:?$/
const META = /^(title|artist|key|capo|tempo|bpm|time)\s*[:=-]\s*(.+)$/i
const DIRECTIVE = /^\{\s*([a-z_]+)\s*(?::\s*(.*?))?\s*\}$/i
const REPEAT = /^\(?\s*(?:[x×]\s*(\d+)|(\d+)\s*[x×])\s*\)?$/i
const HOLD = /^(\.|\/+|%|N\.?C\.?)$/i
const IGNORED = /^(\|+|\|:|:\||-+|\(|\))$/

const DIRECTIVE_SECTIONS: Readonly<Record<string, string>> = {
  start_of_chorus: "Chorus",
  soc: "Chorus",
  start_of_verse: "Verse",
  sov: "Verse",
  start_of_bridge: "Bridge",
  sob: "Bridge",
}
const DIRECTIVE_META: Readonly<Record<string, "title" | "artist" | "key" | "capo" | "tempo" | "time">> = {
  title: "title",
  t: "title",
  artist: "artist",
  subtitle: "artist",
  st: "artist",
  key: "key",
  capo: "capo",
  tempo: "tempo",
  time: "time",
}

const titleCase = (s: string) => s.replace(/\s+/g, " ").replace(/^./, (c) => c.toUpperCase())

/** The bars on a line of chords, or null when the line has anything that isn't a chord. */
function chordBars(text: string): { bars: string[]; repeat: number } | null {
  let repeat = 1
  const segments: string[][] = [[]]
  const tokens = text.replace(/\|/g, " | ").split(/\s+/).filter(Boolean)
  const hasBarLines = tokens.includes("|")
  let chords = 0
  for (const t of tokens) {
    const rep = t.match(REPEAT)
    if (rep) repeat = Math.min(16, parseInt(rep[1] ?? rep[2], 10) || 1)
    else if (t === "|") segments.push([])
    else if (HOLD.test(t)) segments[segments.length - 1].push(t === "%" ? "%" : ".")
    else if (IGNORED.test(t)) continue
    else if (isChordName(t)) {
      segments[segments.length - 1].push(t)
      chords++
    } else return null
  }
  if (!chords) return null
  if (!hasBarLines) return { bars: segments[0].filter((t) => t !== "." && t !== "%"), repeat }
  return { bars: segments.filter((s) => s.length).map((s) => (s.join(" ") === "%" ? "%" : s.join(" "))), repeat }
}

function classify(raw: string): Line {
  const s = raw.trim()
  if (!s) return { kind: "blank" }
  let m: RegExpMatchArray | null
  if ((m = s.match(DIRECTIVE))) {
    const name = m[1].toLowerCase()
    if (DIRECTIVE_SECTIONS[name]) return { kind: "header", name: DIRECTIVE_SECTIONS[name], chords: null }
    if (DIRECTIVE_META[name] && m[2]) return { kind: "meta", field: DIRECTIVE_META[name], value: m[2] }
    if ((name === "comment" || name === "c") && m[2] && HEADER.test(m[2])) return classify(m[2])
    return { kind: "blank" }
  }
  if ((m = s.match(META))) {
    const field = m[1].toLowerCase() === "bpm" ? "tempo" : (m[1].toLowerCase() as "title")
    return { kind: "meta", field, value: m[2] }
  }
  if ((m = s.match(HEADER))) {
    const rest = m[2].trim()
    if (!rest || chordBars(rest)) return { kind: "header", name: titleCase(m[1]), chords: rest || null }
  }
  if ((m = s.match(BRACKET_HEADER)) && !isChordName(m[1].trim())) {
    return { kind: "header", name: titleCase(m[1].trim()), chords: null }
  }
  // ChordPro puts chords inside the words: "[G]Words and [D]more words".
  const inline = [...s.matchAll(/\[([^\]\s]{1,12})\]/g)].map((x) => x[1])
  if (inline.length && inline.every(isChordName)) return { kind: "chords", bars: inline, repeat: 1 }
  const bars = chordBars(s)
  return bars ? { kind: "chords", ...bars } : { kind: "lyric" }
}

export interface ChordSheet {
  draft: SongDraft
  /** How many lines of words were left out. */
  droppedLines: number
}

/**
 * Reads a pasted chord sheet: chords over lyrics, ChordPro, or bars between bar lines.
 * Without bar lines each chord gets one bar, the most common case in pop songs.
 */
export function readChordSheet(text: string, opts: { title: string }): ChordSheet {
  const draft: SongDraft = {
    found: false,
    title: opts.title,
    artist: "",
    key: "",
    capo: 0,
    beatsPerBar: 4,
    tempo: null,
    sections: [],
    shapes: [],
  }
  let droppedLines = 0
  let current: DraftSection | null = null
  const startSection = (name: string) => {
    current = { name, pattern: null, bars: [] }
    draft.sections.push(current)
  }
  const addBars = (bars: string[], repeat: number) => {
    if (!current) startSection(`Part ${draft.sections.length + 1}`)
    for (let r = 0; r < repeat; r++) current!.bars.push(...bars)
  }

  for (const raw of text.replace(/\r\n?/g, "\n").replace(/\t/g, "    ").split("\n")) {
    const line = classify(raw)
    if (line.kind === "lyric") droppedLines++
    else if (line.kind === "header") {
      startSection(line.name)
      const chords = line.chords && chordBars(line.chords)
      if (chords) addBars(chords.bars, chords.repeat)
    } else if (line.kind === "chords") addBars(line.bars, line.repeat)
    else if (line.kind === "meta") {
      const v = line.value.trim()
      if (line.field === "title") draft.title = v
      else if (line.field === "artist") draft.artist = v
      else if (line.field === "key") draft.key = keyName(v)
      else if (line.field === "capo") draft.capo = Math.min(12, parseInt(v.match(/\d+/)?.[0] ?? "0", 10))
      else if (line.field === "tempo") {
        const n = parseInt(v.match(/\d+/)?.[0] ?? "", 10)
        draft.tempo = n >= 20 && n <= 300 ? n : null
      } else if (line.field === "time") {
        const n = parseInt(v.match(/^(\d)\s*\/\s*[48]/)?.[1] ?? "", 10)
        if (n >= 2 && n <= 7) draft.beatsPerBar = n === 6 ? 3 : n
      }
    }
  }

  // A header with no chords under it means "play that section again", as chord sheets
  // often write the chorus's chords only once.
  draft.sections = draft.sections
    .map((s) => (s.bars.length ? s : { ...s, bars: draft.sections.find((o) => o.name === s.name && o.bars.length)?.bars ?? [] }))
    .filter((s) => s.bars.length)
    .slice(0, LIMITS.sections)
  draft.found = draft.sections.length > 0
  return { draft, droppedLines }
}

/**
 * The sheet without its lyrics: section headers, chord lines and settings only. This
 * is all the app sends to the AI from a pasted sheet.
 */
export function chordLinesOnly(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, "    ")
    .split("\n")
    .flatMap((raw) => {
      const line = classify(raw)
      if (line.kind === "lyric" || line.kind === "blank") return []
      if (line.kind === "chords" && raw.includes("[")) return [line.bars.join(" ")]
      return [raw.trimEnd()]
    })
    .join("\n")
}
