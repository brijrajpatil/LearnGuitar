import type { PatternId } from "@/core/pattern/patterns"

/** Ticks per quarter-note beat: 6 is an eighth note, 3 a sixteenth, 4 an eighth-note triplet. */
export const TICKS_PER_BEAT = 12
export const TICKS_PER_EIGHTH = 6

/** Bumped when the song model changes shape. Old songs are migrated on load. */
export const SONG_SCHEMA_VERSION = 1

export interface Barre {
  fret: number
  /** String index, 0 = low E. */
  from: number
  to: number
  /** True when the chart's fingering says finger 1 lies across the strings. */
  finger: boolean
}

export interface Voicing {
  /** Fret per string, low E to high E. -1 is a muted string, 0 an open one. */
  frets: number[]
  /** Finger per string: "1" to "4", "T" for the thumb, "" for none. Null when unknown. */
  fingers: string[] | null
  barre: Barre | null
}

/** One chord inside a bar, in ticks from the start of the bar. */
export interface ChordSpan {
  chord: string
  start: number
  length: number
}

/** A word or syllable the player sings, on one eighth note of a bar (decision 0021). */
export interface LyricWord {
  /** Eighth-note slot in the bar, from 0. */
  slot: number
  /** As typed. A syllable that runs into the next one ends with "-". */
  text: string
  /** The first word of a sung line. */
  lineStart: boolean
}

export interface Bar {
  /** Index into Song.sections. */
  section: number
  chords: ChordSpan[]
  cue: string
  /** The words sung in this bar, in slot order. Only what the player typed. */
  lyrics: LyricWord[]
  /** Line in the chart text, for jumping the editor to this bar. */
  line: number
}

export interface Section {
  name: string
  line: number
  pattern: PatternId | null
  record: PatternId | null
  /** First bar of the section. */
  start: number
  /** One past the last bar. */
  end: number
}

export interface Song {
  schemaVersion: typeof SONG_SCHEMA_VERSION
  title: string
  artist: string
  key: string
  capo: string
  /** Quarter-note beats per bar, 2 to 7. */
  beatsPerBar: number
  /** The record's tempo in BPM, when the chart gives one. */
  tempo: number | null
  notes: string[]
  /** Chords the chart defines, which take priority over the built-in shapes. */
  chords: Record<string, Voicing>
  /** Chart-specific simplify rules, which take priority over the built-in ones. */
  simplify: Record<string, string>
  sections: Section[]
  bars: Bar[]
}

export const ticksPerBar = (song: Pick<Song, "beatsPerBar">): number =>
  song.beatsPerBar * TICKS_PER_BEAT

export const slotsPerBar = (song: Pick<Song, "beatsPerBar">): number =>
  song.beatsPerBar * 2

/** Seconds of music for the whole song at a tempo. */
export const songSeconds = (song: Song, bpm: number): number =>
  (song.bars.length * song.beatsPerBar * 60) / bpm
