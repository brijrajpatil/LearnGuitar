// Everything the app saves: settings, edited and new charts, pattern overrides and
// custom patterns. Charts are stored as text, the same format the editor shows.

import type { Mix } from "@/audio/engine"
import { isValidSteps, type CustomPattern, type PatternId } from "@/core/pattern/patterns"
import { LEVELS, type KeyChoice, type Level } from "@/core/timeline/arrangement"
import { DEFAULT_SONG_ID } from "@/data/builtin-songs"
import type { KeyValueStore } from "@/data/kv"

export const DATA_VERSION = 1

/**
 * What the player is practising, which decides the controls shown and whether a
 * section loops (decision 0009).
 */
export type PracticeMode = "learn" | "speed" | "song"
export const PRACTICE_MODES: readonly PracticeMode[] = ["learn", "speed", "song"]

export interface Settings {
  songId: string
  mode: PracticeMode
  level: Level
  simplify: boolean
  /** The player's tempo per song id. */
  tempo: Record<string, number>
  /** The speed trainer's target per song id. */
  target: Record<string, number>
  /** Where Build speed starts, per song id. */
  start: Record<string, number>
  /** The key and capo each song is played in, when it isn't the chart's own (decision 0016). */
  key: Record<string, KeyChoice>
  mix: Mix
  trainerStep: number
}

export const DEFAULT_SETTINGS: Settings = {
  songId: DEFAULT_SONG_ID,
  // A first-time player presses Play and hears the whole song.
  mode: "song",
  level: "arranged",
  simplify: false,
  tempo: {},
  target: {},
  start: {},
  key: {},
  mix: { clickVolume: 70, clickMuted: false, guitarVolume: 85, guitarMuted: false },
  trainerStep: 3,
}

export interface StoredData {
  settings: Settings
  /** Songs made in the app, in the order they were added. */
  userSongIds: string[]
  /** Chart text by song id: every user song, and built-in songs that were edited. */
  charts: Record<string, string>
  /** Pattern overrides by song id, then section key. */
  overrides: Record<string, Record<string, PatternId>>
  customPatterns: CustomPattern[]
  meta: { version: number; prototypeImported: boolean }
}

const K = {
  settings: "settings",
  userSongs: "userSongs",
  patterns: "patterns",
  meta: "meta",
  /** The player's Gemini key, on its own so settings and backups never carry it. */
  aiKey: "ai/key",
  chart: (id: string) => `chart/${id}`,
  overrides: (id: string) => `overrides/${id}`,
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

const numberMap = (v: unknown): Record<string, number> =>
  isRecord(v)
    ? Object.fromEntries(Object.entries(v).filter((e): e is [string, number] => typeof e[1] === "number"))
    : {}

const whole = (x: unknown, max: number): x is number => Number.isInteger(x) && (x as number) >= 0 && (x as number) <= max

const keyMap = (v: unknown): Record<string, KeyChoice> =>
  isRecord(v)
    ? Object.fromEntries(
        Object.entries(v).flatMap(([id, c]) =>
          isRecord(c) && whole(c.shapes, 11) && whole(c.capo, 12) ? [[id, { shapes: c.shapes, capo: c.capo }]] : []
        )
      )
    : {}

/** Fills in anything missing or malformed, so old or hand-edited data still loads. */
export function cleanSettings(v: unknown): Settings {
  const s = isRecord(v) ? v : {}
  const mix = isRecord(s.mix) ? s.mix : {}
  const d = DEFAULT_SETTINGS
  const num = (x: unknown, fallback: number) => (typeof x === "number" && Number.isFinite(x) ? x : fallback)
  return {
    songId: typeof s.songId === "string" ? s.songId : d.songId,
    mode: PRACTICE_MODES.includes(s.mode as PracticeMode) ? (s.mode as PracticeMode) : d.mode,
    level: LEVELS.includes(s.level as Level) ? (s.level as Level) : d.level,
    simplify: s.simplify === true,
    tempo: numberMap(s.tempo),
    target: numberMap(s.target),
    start: numberMap(s.start),
    key: keyMap(s.key),
    mix: {
      clickVolume: num(mix.clickVolume, d.mix.clickVolume),
      clickMuted: mix.clickMuted === true,
      guitarVolume: num(mix.guitarVolume, d.mix.guitarVolume),
      guitarMuted: mix.guitarMuted === true,
    },
    trainerStep: num(s.trainerStep, d.trainerStep),
  }
}

export const cleanPatterns = (v: unknown): CustomPattern[] =>
  Array.isArray(v)
    ? v.filter(
        (p): p is CustomPattern =>
          isRecord(p) && typeof p.name === "string" && !!p.name && typeof p.steps === "string" && isValidSteps(p.steps)
      )
    : []

export class Repository {
  private readonly kv: KeyValueStore

  constructor(kv: KeyValueStore) {
    this.kv = kv
  }

  async load(): Promise<StoredData> {
    const data: StoredData = {
      settings: DEFAULT_SETTINGS,
      userSongIds: [],
      charts: {},
      overrides: {},
      customPatterns: [],
      meta: { version: DATA_VERSION, prototypeImported: false },
    }
    for (const [key, value] of await this.kv.entries()) {
      if (key === K.settings) data.settings = cleanSettings(value)
      else if (key === K.userSongs && Array.isArray(value)) data.userSongIds = value.filter((x) => typeof x === "string")
      else if (key === K.patterns) data.customPatterns = cleanPatterns(value)
      else if (key === K.meta && isRecord(value)) data.meta.prototypeImported = value.prototypeImported === true
      else if (key.startsWith("chart/") && typeof value === "string") data.charts[key.slice(6)] = value
      else if (key.startsWith("overrides/") && isRecord(value)) {
        data.overrides[key.slice(10)] = Object.fromEntries(
          Object.entries(value).filter((e): e is [string, string] => typeof e[1] === "string")
        )
      }
    }
    return data
  }

  saveSettings(s: Settings): Promise<void> {
    return this.kv.set(K.settings, s)
  }

  saveChart(id: string, text: string): Promise<void> {
    return this.kv.set(K.chart(id), text)
  }

  deleteChart(id: string): Promise<void> {
    return this.kv.delete(K.chart(id))
  }

  saveUserSongIds(ids: string[]): Promise<void> {
    return this.kv.set(K.userSongs, ids)
  }

  saveOverrides(id: string, overrides: Record<string, PatternId>): Promise<void> {
    return Object.keys(overrides).length ? this.kv.set(K.overrides(id), overrides) : this.kv.delete(K.overrides(id))
  }

  saveCustomPatterns(list: CustomPattern[]): Promise<void> {
    return this.kv.set(K.patterns, list)
  }

  async loadAiKey(): Promise<string | null> {
    const key = await this.kv.get<unknown>(K.aiKey)
    return typeof key === "string" && key.trim() ? key.trim() : null
  }

  saveAiKey(key: string): Promise<void> {
    return this.kv.set(K.aiKey, key.trim())
  }

  forgetAiKey(): Promise<void> {
    return this.kv.delete(K.aiKey)
  }

  markPrototypeImported(): Promise<void> {
    return this.kv.set(K.meta, { version: DATA_VERSION, prototypeImported: true })
  }
}
