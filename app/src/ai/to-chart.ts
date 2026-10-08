// Turns a song draft into chart text the app can play. Whatever the draft holds, the
// chart gets chords, sections, tempo and strum presets only: no lyrics, no cues and no
// record figures (decisions 0003 and 0017).

import type { Voicing } from "@/core/song/types"
import { parseVoicing, VOICINGS } from "@/core/theory/voicings"
import { isChordName, plainTriad, respell, tidyChordName } from "@/ai/chord-names"
import { LIMITS, type SongDraft } from "@/ai/schema"

/** Where a draft came from, for the note the chart carries. */
export type DraftSource =
  | { kind: "memory"; model: string }
  | { kind: "page"; url: string; model: string }
  | { kind: "paste-ai"; model: string }
  | { kind: "paste" }

/** Chord shape help from the theory module, passed in so tests can use fakes. */
export interface ShapeTools {
  /** A playable shape for a chord name, or null. */
  shapeFor(name: string): Voicing | null
  /** True when the shape plays the notes the name says. */
  playsChord(name: string, v: Voicing): boolean
}

export const NO_SHAPE_TOOLS: ShapeTools = { shapeFor: () => null, playsChord: () => false }

export interface ChartDraft {
  chart: string
  /** Things the player should know, like a chord the app swapped. */
  warnings: string[]
  /** Chords that still have no shape, so the chart won't parse until they get one. */
  unknown: string[]
  bars: number
}

/** Every AI-made chart starts its first note with this, which marks it as unchecked. */
export const AI_DRAFT_NOTE = "AI draft"

const day = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

export function sourceNote(source: DraftSource, date: Date): string {
  switch (source.kind) {
    case "memory":
      return `${AI_DRAFT_NOTE} from Gemini's memory, ${day(date)}. Check it against the record before you rely on it.`
    case "page":
      return `${AI_DRAFT_NOTE} from ${source.url}, converted by Gemini, ${day(date)}. Check it against the record.`
    case "paste-ai":
      return `${AI_DRAFT_NOTE} from pasted chords, tidied by Gemini, ${day(date)}. Check it against the record.`
    case "paste":
      return `Converted from pasted chords, ${day(date)}. Check the bar lengths against the record.`
  }
}

/** One line of plain text, cut to a length: no line breaks or control characters. */
export const oneLine = (s: string, max: number): string =>
  s
    .replace(/\p{Cc}+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim()

/** "G major" is G and "E minor" is Em. Empty when it isn't a key. */
export function keyName(s: string): string {
  const m = s.trim().replace(/♯/g, "#").replace(/♭/g, "b").match(/^([A-G][#b]?)\s*(minor|min|m(?!aj))?/)
  return m ? m[1] + (m[2] ? "m" : "") : ""
}

const sectionName = (s: string, i: number): string =>
  oneLine(s.replace(/[^A-Za-z0-9 '-]+/g, " "), LIMITS.sectionName) || `Part ${i + 1}`

const fretText = (v: Voicing): string => {
  const f = v.frets.map((x) => (x < 0 ? "x" : String(x)))
  return v.frets.some((x) => x > 9) ? f.join("-") : f.join("")
}
const fingerText = (v: Voicing): string =>
  v.fingers ? v.fingers.map((g, i) => (v.frets[i] < 0 ? "x" : g || "0")).join("") : ""

/** Chord counts that split a bar of this many eighth notes evenly. */
const splits = (slots: number): number[] => Array.from({ length: slots }, (_, i) => i + 1).filter((n) => slots % n === 0)

export function draftToChart(
  draft: SongDraft,
  opts: { source: DraftSource; date: Date; shapes: ShapeTools; title?: string }
): ChartDraft {
  const warnings: string[] = []
  const unknown = new Set<string>()
  const defined = new Map<string, Voicing>()
  const resolved = new Map<string, string>()
  const modelShapes = new Map(draft.shapes.map((s) => [tidyChordName(s.name), s.frets]))
  const builtIn = Object.keys(VOICINGS)

  const known = (name: string | null): string | null => {
    if (!name) return null
    if (VOICINGS[name] || defined.has(name)) return name
    const hits = builtIn.filter((n) => n.toLowerCase() === name.toLowerCase())
    return hits.length === 1 ? hits[0] : null
  }

  // A chord name the chart can play: built in, given a shape here, or swapped for a
  // plainer chord. Unknown chords stay as they are and are reported.
  const resolve = (raw: string): string => {
    const name = tidyChordName(raw)
    const done = resolved.get(name)
    if (done) return done
    let out = known(name) ?? known(respell(name))
    if (!out) {
      const frets = modelShapes.get(name)
      const v = frets ? parseVoicing(frets.replace(/\s+/g, "")) : null
      if (v && opts.shapes.playsChord(name, v)) {
        defined.set(name, v)
        warnings.push(`${name} uses a shape from Gemini.`)
        out = name
      }
    }
    if (!out) {
      const v = opts.shapes.shapeFor(name)
      if (v) {
        defined.set(name, v)
        warnings.push(`${name} had no built-in shape, so the app made one.`)
        out = name
      }
    }
    if (!out) {
      const triad = plainTriad(name)
      const plain = triad && triad !== name ? (known(triad) ?? known(respell(triad))) : null
      const made = !plain && triad && triad !== name ? opts.shapes.shapeFor(triad) : null
      if (made && triad) defined.set(triad, made)
      const swap = plain ?? (made ? triad : null)
      if (swap) {
        warnings.push(`${name} became ${swap}, since the app has no shape for ${name}.`)
        out = swap
      }
    }
    if (!out) {
      unknown.add(name)
      out = name
    }
    resolved.set(name, out)
    return out
  }

  const beats = draft.beatsPerBar
  const slots = beats * 2
  const counts = splits(slots)
  let total = 0
  let anyChord = false
  let dropped = false
  const body: string[] = []

  draft.sections.forEach((section, i) => {
    const bars: string[] = []
    for (const raw of section.bars.flatMap((b) => b.split("|"))) {
      if (total >= LIMITS.bars) break
      let text = raw.replace(/["“”]/g, " ").trim()
      if (!text) continue
      if (text === "%" && bars.length) {
        bars.push(bars[bars.length - 1])
        total++
        continue
      }
      let repeat = 1
      const rep = text.match(/\*\s*(\d+)\s*$/)
      if (rep) {
        repeat = Math.min(16, Math.max(1, parseInt(rep[1], 10)))
        text = text.slice(0, rep.index).trim()
      }
      const tokens: string[] = []
      for (const t of text.split(/\s+/)) {
        if (/^(\.|\/+|-+|%|N\.?C\.?)$/i.test(t)) tokens.push(".")
        else if (isChordName(t)) {
          tokens.push(resolve(t))
          anyChord = true
        } else dropped = true
      }
      // A bar of holds before the song's first chord has nothing to hold.
      if (!anyChord || !tokens.length) continue
      // A bar that only holds needs one ".".
      if (tokens.every((t) => t === ".")) tokens.length = 1
      if (tokens.length > slots) tokens.length = slots
      const fit = counts.find((n) => n >= tokens.length) ?? slots
      while (tokens.length < fit) tokens.push(".")
      bars.push(tokens.join(" ") + (repeat > 1 ? `*${repeat}` : ""))
      total += repeat
    }
    if (!bars.length) return
    body.push("", `[${sectionName(section.name, i)}]${section.pattern ? ` pattern=${section.pattern}` : ""}`)
    for (let b = 0; b < bars.length; b += 4) body.push(bars.slice(b, b + 4).join(" | "))
  })
  if (dropped) warnings.push("Some words in the bars weren't chords, so the app left them out.")

  const head = [`title: ${oneLine(draft.title, LIMITS.title) || oneLine(opts.title ?? "", LIMITS.title) || "New song"}`]
  const artist = oneLine(draft.artist, LIMITS.title)
  if (artist) head.push(`artist: ${artist}`)
  const key = keyName(draft.key)
  if (key) head.push(`key: ${key}`)
  if (draft.capo > 0) head.push(`capo: ${draft.capo}`)
  head.push(`time: ${beats}/4`)
  if (draft.tempo) head.push(`tempo: ${draft.tempo}`)
  head.push(`note: ${sourceNote(opts.source, opts.date)}`)
  const shapes = [...defined].map(([name, v]) => `chord ${name} = ${fretText(v)} ${fingerText(v)}`.trimEnd())

  const chart = [...head, ...(shapes.length ? ["", ...shapes] : []), ...body].join("\n") + "\n"
  return { chart, warnings, unknown: [...unknown], bars: total }
}
