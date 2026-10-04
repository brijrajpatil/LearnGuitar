// Turns a song and the player's settings into what plays: the chord in every slot, the
// pattern of every section, and a list of timed events per bar. Audio and the play
// screen both read these events, so what you see can't drift from what you hear.

import {
  getPattern,
  isPick,
  stepOf,
  type CustomPattern,
  type Pattern,
  type PatternId,
} from "@/core/pattern/patterns"
import { TICKS_PER_EIGHTH, type ChordSpan, type Song, type Voicing } from "@/core/song/types"
import { capoFret, findVoicing, pickString, simplifiedName, withCapo } from "@/core/theory/chords"

/** A song's levels, from easy to the recorded version. */
export type Level = "beginner" | "arranged" | "record"
export const LEVELS: readonly Level[] = ["beginner", "arranged", "record"]

export interface ArrangementSettings {
  level: Level
  simplify: boolean
  /** Pattern overrides by section key (see sectionKey). */
  overrides: Readonly<Record<string, PatternId>>
  customPatterns: readonly CustomPattern[]
}

export interface Arrangement {
  song: Song
  settings: ArrangementSettings
  /** Eighth-note slots per bar. */
  slotsPerBar: number
  /** Each bar's chords after Simplify chords, with equal neighbours merged. */
  barChords: ChordSpan[][]
  /** The pattern each section plays at this level, before overrides. */
  autoPatterns: Pattern[]
  /** The pattern each section actually plays. */
  patterns: Pattern[]
  /** The capo's fret, 0 for none. Sounds play this many semitones above the shapes. */
  capo: number
}

/**
 * The key a section's pattern override is saved under. It includes the name so an
 * override doesn't jump to another section when sections are added above it.
 */
export const sectionKey = (song: Song, section: number): string =>
  `${section}:${song.sections[section].name}`

function autoPatternId(song: Song, section: number, level: Level): PatternId {
  const sec = song.sections[section]
  if (level === "beginner") return "A"
  if (level === "record" && sec.record) return sec.record
  return sec.pattern ?? "A"
}

export function arrange(song: Song, settings: ArrangementSettings): Arrangement {
  const barChords = song.bars.map((bar) => {
    const out: ChordSpan[] = []
    for (const span of bar.chords) {
      const chord = settings.simplify ? simplifiedName(song, span.chord) : span.chord
      const last = out[out.length - 1]
      if (last && last.chord === chord) last.length += span.length
      else out.push({ chord, start: span.start, length: span.length })
    }
    return out
  })
  const autoPatterns = song.sections.map((_, si) =>
    getPattern(autoPatternId(song, si, settings.level), settings.customPatterns)
  )
  const patterns = song.sections.map((_, si) => {
    const override = settings.overrides[sectionKey(song, si)]
    return override ? getPattern(override, settings.customPatterns) : autoPatterns[si]
  })
  return {
    song,
    settings,
    slotsPerBar: song.beatsPerBar * 2,
    barChords,
    autoPatterns,
    patterns,
    capo: capoFret(song.capo),
  }
}

export const sectionOf = (arr: Arrangement, bar: number): number => arr.song.bars[bar].section

export const hasOverride = (arr: Arrangement, section: number): boolean =>
  Boolean(arr.settings.overrides[sectionKey(arr.song, section)])

export function voicingOf(arr: Arrangement, chord: string): Voicing | null {
  return findVoicing(arr.song, chord)
}

export function chordAt(arr: Arrangement, bar: number, slot: number): string {
  const spans = arr.barChords[bar]
  const tick = slot * TICKS_PER_EIGHTH
  for (let i = spans.length - 1; i >= 0; i--) if (tick >= spans[i].start) return spans[i].chord
  return spans[0].chord
}

export function stepAt(arr: Arrangement, bar: number, slot: number): string {
  const si = sectionOf(arr, bar)
  const barInSection = bar - arr.song.sections[si].start
  return stepOf(arr.patterns[si], barInSection, slot, arr.slotsPerBar)
}

/** A looped section, or null when the whole song plays through. */
export type Loop = { section: number } | null

/** The bar after `bar` in play order, or -1 at the end of the song. */
export function nextBar(arr: Arrangement, bar: number, loop: Loop): number {
  if (loop) {
    const s = arr.song.sections[loop.section]
    return bar < s.start || bar >= s.end - 1 ? s.start : bar + 1
  }
  return bar + 1 < arr.song.bars.length ? bar + 1 : -1
}

export type NextChange =
  | { kind: "chord"; chord: string; slots: number }
  | { kind: "end" }
  | { kind: "hold" }

/** The first chord change after (bar, slot) in play order, and how many slots away it is. */
export function nextChange(arr: Arrangement, bar: number, slot: number, loop: Loop): NextChange {
  const cur = chordAt(arr, bar, slot)
  const tick = slot * TICKS_PER_EIGHTH
  for (const span of arr.barChords[bar]) {
    if (span.start > tick && span.chord !== cur) {
      return { kind: "chord", chord: span.chord, slots: (span.start - tick) / TICKS_PER_EIGHTH }
    }
  }
  let dist = arr.slotsPerBar - slot
  let b = bar
  for (let i = 0; i <= arr.song.bars.length; i++) {
    b = nextBar(arr, b, loop)
    if (b < 0) return { kind: "end" }
    for (const span of arr.barChords[b]) {
      if (span.chord !== cur) {
        return { kind: "chord", chord: span.chord, slots: dist + span.start / TICKS_PER_EIGHTH }
      }
    }
    dist += arr.slotsPerBar
  }
  return { kind: "hold" }
}

export type StepSound =
  | { type: "strum"; direction: "D" | "U"; chord: string; voicing: Voicing; accent: boolean }
  | { type: "pick"; string: number; chord: string; voicing: Voicing; accent: boolean }

/** One eighth-note step of a bar: when it falls, and what sounds on it. */
export interface TimelineStep {
  /** Ticks from the start of the bar. */
  tick: number
  slot: number
  click: "accent" | "beat" | null
  sound: StepSound | null
}

const clickAt = (slot: number): TimelineStep["click"] =>
  slot % 2 !== 0 ? null : slot === 0 ? "accent" : "beat"

/** The events of one bar, in order. */
export function barSteps(arr: Arrangement, bar: number): TimelineStep[] {
  const steps: TimelineStep[] = []
  for (let slot = 0; slot < arr.slotsPerBar; slot++) {
    const step = stepAt(arr, bar, slot)
    const chord = chordAt(arr, bar, slot)
    const shape = voicingOf(arr, chord)
    const voicing = shape && withCapo(shape, arr.capo)
    const accent = slot === 0
    let sound: StepSound | null = null
    if (voicing && (step === "D" || step === "U")) {
      sound = { type: "strum", direction: step, chord, voicing, accent }
    } else if (voicing && isPick(step)) {
      const string = pickString(voicing, step)
      if (string >= 0) sound = { type: "pick", string, chord, voicing, accent }
    }
    steps.push({ tick: slot * TICKS_PER_EIGHTH, slot, click: clickAt(slot), sound })
  }
  return steps
}

/** A one-bar count-in: the click on every beat and nothing else. */
export function countInSteps(arr: Arrangement): TimelineStep[] {
  return Array.from({ length: arr.slotsPerBar }, (_, slot) => ({
    tick: slot * TICKS_PER_EIGHTH,
    slot,
    click: clickAt(slot),
    sound: null,
  }))
}

/** Every chord the arrangement can play, as it sounds, for loading the sounds before playback. */
export function chordsUsed(arr: Arrangement): Voicing[] {
  const names = new Set<string>()
  for (const spans of arr.barChords) for (const s of spans) names.add(s.chord)
  return [...names]
    .map((n) => voicingOf(arr, n))
    .filter((v): v is Voicing => v !== null)
    .map((v) => withCapo(v, arr.capo))
}
