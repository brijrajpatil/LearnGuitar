// Moves data saved by the single-file prototype into the app. The prototype kept
// everything in localStorage under "strumpractice.v1.*" keys, as JSON strings. The app
// reads them directly when it runs on the same origin, or from the backup file the
// prototype's "Download backup" button saves.

import type { CustomPattern, PatternId } from "@/core/pattern/patterns"
import { cleanPatterns, cleanSettings, type Repository, type Settings, type StoredData } from "@/data/repository"

const PREFIX = "strumpractice.v1."
const BACKUP_FORMAT = "song-practice-prototype-backup"

export interface PrototypeData {
  settings: Settings | null
  userSongIds: string[]
  charts: Record<string, string>
  overrides: Record<string, Record<string, PatternId>>
  customPatterns: CustomPattern[]
}

/** Raw prototype entries from this origin's localStorage. Empty if there are none or access is blocked. */
export function prototypeEntriesFrom(storage: Storage | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!storage) return out
  try {
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i)
      if (k?.startsWith(PREFIX)) out[k] = storage.getItem(k) ?? ""
    }
  } catch {
    // Storage blocked, as in some private windows.
  }
  return out
}

/** Reads the prototype's backup file. Throws with a message for the player if it isn't one. */
export function entriesFromBackupFile(text: string): Record<string, string> {
  let file: unknown
  try {
    file = JSON.parse(text)
  } catch {
    throw new Error("That file isn't a backup from the prototype. It should be a .json file.")
  }
  const f = file as { format?: unknown; localStorage?: unknown }
  if (f?.format !== BACKUP_FORMAT || typeof f.localStorage !== "object" || f.localStorage === null) {
    throw new Error("That file isn't a backup from the prototype's Download backup button.")
  }
  return Object.fromEntries(
    Object.entries(f.localStorage as Record<string, unknown>).filter(
      (e): e is [string, string] => e[0].startsWith(PREFIX) && typeof e[1] === "string"
    )
  )
}

const json = (raw: string | undefined): unknown => {
  if (raw === undefined) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

/** Converts prototype entries to the app's data shape. */
export function readPrototype(entries: Record<string, string>): PrototypeData {
  const data: PrototypeData = { settings: null, userSongIds: [], charts: {}, overrides: {}, customPatterns: [] }
  const state = json(entries[PREFIX + "state"]) as Record<string, unknown> | undefined
  if (state && typeof state === "object") {
    data.settings = cleanSettings({
      songId: state.songId,
      level: state.mode,
      simplify: state.simplify,
      tempo: state.tempo,
      target: state.target,
      mix: {
        clickVolume: state.clickVol,
        clickMuted: state.clickMute,
        guitarVolume: state.gtrVol,
        guitarMuted: state.gtrMute,
      },
      trainerStep: state.step,
    })
  }
  const ids = json(entries[PREFIX + "songs"])
  if (Array.isArray(ids)) data.userSongIds = ids.filter((x): x is string => typeof x === "string")
  const pats = json(entries[PREFIX + "patterns"])
  if (Array.isArray(pats)) {
    data.customPatterns = cleanPatterns(
      pats.map((p: { name?: unknown; seq?: unknown }) => ({ name: p?.name, steps: p?.seq }))
    )
  }
  for (const [key, raw] of Object.entries(entries)) {
    if (key.startsWith(PREFIX + "chart.")) {
      const chart = json(raw)
      if (typeof chart === "string") data.charts[key.slice(PREFIX.length + 6)] = chart
    } else if (key.startsWith(PREFIX + "overrides.")) {
      const ov = json(raw)
      if (ov && typeof ov === "object" && !Array.isArray(ov)) {
        data.overrides[key.slice(PREFIX.length + 10)] = Object.fromEntries(
          Object.entries(ov).filter((e): e is [string, string] => typeof e[1] === "string")
        )
      }
    }
  }
  return data
}

export const isEmptyImport = (d: PrototypeData): boolean =>
  !d.settings && !d.userSongIds.length && !Object.keys(d.charts).length && !d.customPatterns.length

/**
 * Merges prototype data into what's saved: its charts and overrides replace the app's
 * for the same song, custom patterns merge by name, and tempos merge per song.
 */
export async function importPrototype(repo: Repository, current: StoredData, d: PrototypeData): Promise<StoredData> {
  const next: StoredData = structuredClone(current)
  for (const [id, chart] of Object.entries(d.charts)) {
    next.charts[id] = chart
    await repo.saveChart(id, chart)
  }
  const ids = [...next.userSongIds]
  for (const id of d.userSongIds) if (!ids.includes(id) && d.charts[id] !== undefined) ids.push(id)
  next.userSongIds = ids
  await repo.saveUserSongIds(ids)
  for (const [id, ov] of Object.entries(d.overrides)) {
    next.overrides[id] = ov
    await repo.saveOverrides(id, ov)
  }
  const pats = [...next.customPatterns]
  for (const p of d.customPatterns) {
    const i = pats.findIndex((q) => q.name.toLowerCase() === p.name.toLowerCase())
    if (i >= 0) pats[i] = p
    else pats.push(p)
  }
  next.customPatterns = pats
  await repo.saveCustomPatterns(pats)
  if (d.settings) {
    next.settings = {
      ...d.settings,
      tempo: { ...next.settings.tempo, ...d.settings.tempo },
      target: { ...next.settings.target, ...d.settings.target },
    }
    await repo.saveSettings(next.settings)
  }
  await repo.markPrototypeImported()
  next.meta.prototypeImported = true
  return next
}
