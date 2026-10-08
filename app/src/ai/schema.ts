// The song draft: what the AI returns, and what the paste converter makes. It has no
// field that can hold the song's words, so lyrics have nowhere to go (decision 0017).

export type PatternPreset = "A" | "B" | "C" | "D" | "E"
export const PATTERN_PRESETS: readonly PatternPreset[] = ["A", "B", "C", "D", "E"]

export interface DraftSection {
  name: string
  /** A strum preset for the Arranged level. Record figures stay the player's. */
  pattern: PatternPreset | null
  /** One string per bar: chord names, "." to hold the chord, like "G D/F#" or "Em . . C". */
  bars: string[]
}

/** A shape the model gave for a chord the app has no shape for. */
export interface DraftShape {
  name: string
  /** Six frets, low E to high E, like "x02210". */
  frets: string
}

export interface SongDraft {
  /** False when the model doesn't know the song well enough to give its real chords. */
  found: boolean
  title: string
  artist: string
  key: string
  /** 0 for no capo. */
  capo: number
  beatsPerBar: number
  /** Beats per minute, or null when unknown. */
  tempo: number | null
  sections: DraftSection[]
  shapes: DraftShape[]
}

/** Limits that keep a draft to a song's size, whatever the model sends. */
export const LIMITS = { sections: 24, barsPerSection: 64, bars: 400, title: 80, sectionName: 24, shapes: 16 }

/** The JSON schema the model's answer must match. */
export const SONG_DRAFT_SCHEMA = {
  type: "object",
  properties: {
    found: { type: "boolean", description: "False if you don't know this song's real chords. Never guess." },
    title: { type: "string", description: "The song's title." },
    artist: { type: "string", description: "The artist of the best-known recording." },
    key: { type: "string", description: "The key of the chord shapes played, like G or Em." },
    capo: { type: "integer", minimum: 0, maximum: 12, description: "The capo fret most guitarists use, or 0." },
    beatsPerBar: { type: "integer", minimum: 2, maximum: 7, description: "4 for 4/4, 3 for 3/4 or 6/8." },
    tempo: { type: "integer", minimum: 0, maximum: 300, description: "The recording's tempo in BPM, or 0 if unsure." },
    sections: {
      type: "array",
      maxItems: LIMITS.sections,
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Intro, Verse 1, Pre-chorus, Chorus, Bridge, Solo, Outro and so on." },
          pattern: { type: "string", enum: [...PATTERN_PRESETS], description: "The strum preset that fits best." },
          bars: {
            type: "array",
            maxItems: LIMITS.barsPerSection,
            items: { type: "string", description: "One bar: chord names, with . to hold a chord." },
          },
        },
        required: ["name", "pattern", "bars"],
      },
    },
    shapes: {
      type: "array",
      maxItems: LIMITS.shapes,
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          frets: { type: "string", description: "Six frets from low E to high E, x for muted, like x02210." },
        },
        required: ["name", "frets"],
      },
    },
  },
  required: ["found", "title", "artist", "key", "capo", "beatsPerBar", "tempo", "sections", "shapes"],
} as const

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v)
const str = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "")
const int = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN
  return Number.isFinite(n) ? Math.round(n) : null
}

/**
 * Reads untrusted JSON as a draft. Missing or odd fields fall back to safe values, and
 * everything is cut to the limits. Null when it isn't an object at all.
 */
export function readDraft(value: unknown): SongDraft | null {
  if (!isRecord(value)) return null
  const capo = int(value.capo) ?? 0
  const beats = int(value.beatsPerBar) ?? 4
  const tempo = int(value.tempo)
  const sections = (Array.isArray(value.sections) ? value.sections : [])
    .filter(isRecord)
    .slice(0, LIMITS.sections)
    .map((s) => ({
      name: str(s.name),
      pattern: PATTERN_PRESETS.includes(str(s.pattern).toUpperCase() as PatternPreset)
        ? (str(s.pattern).toUpperCase() as PatternPreset)
        : null,
      bars: (Array.isArray(s.bars) ? s.bars : []).map(str).slice(0, LIMITS.barsPerSection),
    }))
  const shapes = (Array.isArray(value.shapes) ? value.shapes : [])
    .filter(isRecord)
    .slice(0, LIMITS.shapes)
    .map((s) => ({ name: str(s.name).trim(), frets: str(s.frets).trim() }))
    .filter((s) => s.name && s.frets)
  return {
    found: value.found !== false,
    title: str(value.title),
    artist: str(value.artist),
    key: str(value.key),
    capo: capo >= 0 && capo <= 12 ? capo : 0,
    beatsPerBar: beats >= 2 && beats <= 7 ? beats : 4,
    tempo: tempo !== null && tempo >= 20 && tempo <= 300 ? tempo : null,
    sections,
    shapes,
  }
}
