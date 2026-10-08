// Wires the modules together: loads saved data, holds the app's state, turns the
// current song and settings into an arrangement for the transport, and saves changes.
// The UI reads state from here and calls these methods. It holds no React code.

import { AudioEngine, type Mix } from "@/audio/engine"
import { parseChart, type ChartError, type ParsedChart } from "@/core/chart/parse"
import { isValidSteps, normalizeSteps, type CustomPattern, type PatternId } from "@/core/pattern/patterns"
import type { Song } from "@/core/song/types"
import { arrange, sectionKey, writtenChoice, type Arrangement, type KeyChoice, type Level } from "@/core/timeline/arrangement"
import { BUILTIN_SONGS, NEW_SONG_TEMPLATE } from "@/data/builtin-songs"
import { IndexedDbStore, type KeyValueStore } from "@/data/kv"
import type { Collection, Difficulty } from "@/data/library/catalog"
import { loadPersonalSongs } from "@/data/personal-songs"
import {
  entriesFromBackupFile,
  importPrototype,
  isEmptyImport,
  prototypeEntriesFrom,
  readPrototype,
} from "@/data/prototype-import"
import { DEFAULT_SETTINGS, Repository, type PracticeMode, type Settings, type StoredData } from "@/data/repository"
import { clampTempo } from "@/practice/trainer"
import { Transport } from "@/practice/transport"

/** A library collection, or "yours" for songs you made and your personal song file. */
export type SongCollection = Collection | "yours"

export interface SongEntry {
  id: string
  builtin: boolean
  /** The chart as shipped, for built-in songs. */
  original: string | null
  chart: string
  title: string
  artist: string
  /** The title, for messages and the menu's type-ahead. */
  label: string
  /** The chart's chord names in order of first use, for the library's chords column and search. */
  chords: string[]
  collection: SongCollection
  /** Library songs only. */
  difficulty: Difficulty | null
}

export interface AppState {
  ready: boolean
  songs: SongEntry[]
  songId: string
  song: Song
  arrangement: Arrangement
  settings: Settings
  overrides: Record<string, PatternId>
  customPatterns: CustomPattern[]
  editorOpen: boolean
  /** The library page shows in place of the play screen. */
  libraryOpen: boolean
  /** Editor text not yet applied, kept while the editor is closed. */
  draft: { id: string; text: string } | null
  /** Bumped to ask the editor to move its cursor to a bar's line. */
  editorFocus: { line: number; seq: number }
}

export type Notify = (message: string, opts?: { duration?: number }) => void

/** What the library shows about a chart: its title, artist and chords. */
const namesOf = (chart: string, custom: CustomPattern[]) => {
  const { song } = parseChart(chart, custom)
  const title = song.title || "Untitled"
  const chords = [...new Set(song.bars.flatMap((b) => b.chords.map((c) => c.chord)))]
  return { title, artist: song.artist, label: title, chords }
}

const LIBRARY_BY_ID = new Map(BUILTIN_SONGS.map((s) => [s.id, s]))

/** A song list entry. Library songs carry their catalog facts, every other song is yours. */
function makeEntry(
  id: string,
  chart: string,
  original: string | null,
  custom: CustomPattern[]
): SongEntry {
  const lib = LIBRARY_BY_ID.get(id)
  return {
    id,
    builtin: original !== null,
    original,
    chart,
    ...namesOf(chart, custom),
    collection: lib?.collection ?? "yours",
    difficulty: lib?.difficulty ?? null,
  }
}

export class AppController {
  readonly transport: Transport
  private state: AppState
  private data: StoredData | null = null
  private engine: AudioEngine | null = null
  private listeners = new Set<() => void>()
  private saveTimer: ReturnType<typeof setTimeout> | undefined
  private readonly repo: Repository
  private readonly notify: Notify

  constructor(opts: { notify: Notify; store?: KeyValueStore }) {
    this.notify = opts.notify
    this.repo = new Repository(opts.store ?? new IndexedDbStore())
    this.transport = new Transport({
      createOutput: () => {
        this.engine = AudioEngine.create(this.state.settings.mix)
        if (!this.engine) this.notify("This browser has no Web Audio support.")
        return this.engine
      },
    })
    const placeholder = parseChart(NEW_SONG_TEMPLATE, []).song
    this.state = {
      ready: false,
      songs: [],
      songId: "",
      song: placeholder,
      arrangement: arrange(placeholder, { level: "arranged", simplify: false, overrides: {}, customPatterns: [] }),
      settings: DEFAULT_SETTINGS,
      overrides: {},
      customPatterns: [],
      editorOpen: false,
      libraryOpen: false,
      draft: null,
      editorFocus: { line: 1, seq: 0 },
    }
    this.transport.onEvent((e) => {
      if (e.type === "tempo") this.saveTempo(e.tempo)
      else if (e.type === "end") this.notify("End of song")
      else if (e.type === "pass") {
        if (e.bumped) this.notify(`Time ${e.pass} through: ${e.tempo} BPM${e.atTarget ? ", your goal" : ""}`)
        else this.notify(`Time ${e.pass} through`, { duration: 1400 })
      }
    })
  }

  getState = (): AppState => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Loads saved data, the prototype's data on first run, and personal songs. */
  async init(): Promise<void> {
    let data = await this.repo.load()
    if (!data.meta.prototypeImported) {
      const found = readPrototype(prototypeEntriesFrom(safeLocalStorage()))
      if (!isEmptyImport(found)) {
        data = await importPrototype(this.repo, data, found)
        this.notify("Your songs and settings from the prototype were imported.", { duration: 5000 })
      } else {
        await this.repo.markPrototypeImported()
      }
    }
    const personal = await loadPersonalSongs(BUILTIN_SONGS.map((s) => s.id))
    this.data = data
    const builtin = [...BUILTIN_SONGS, ...personal]
    const custom = data.customPatterns
    const songs: SongEntry[] = builtin.map((b) => makeEntry(b.id, data.charts[b.id] ?? b.chart, b.chart, custom))
    for (const id of data.userSongIds) {
      const chart = data.charts[id]
      if (typeof chart === "string") songs.push(makeEntry(id, chart, null, custom))
    }
    this.set({ songs, settings: data.settings, customPatterns: custom })
    const t = this.transport
    t.setTrainerStep(data.settings.trainerStep)
    this.selectSong(data.settings.songId)
    this.set({ ready: true })
  }

  /** Imports the prototype's backup file. Returns an error message, or null when it worked. */
  async importBackup(text: string): Promise<string | null> {
    if (!this.data) return "The app is still loading."
    let entries: Record<string, string>
    try {
      entries = entriesFromBackupFile(text)
    } catch (e) {
      return (e as Error).message
    }
    const found = readPrototype(entries)
    if (isEmptyImport(found)) return "That backup has no songs or settings in it."
    this.data = await importPrototype(this.repo, this.data, found)
    const data = this.data
    const songs = this.state.songs.map((s) => {
      const chart = data.charts[s.id] ?? s.chart
      return { ...s, chart, ...namesOf(chart, data.customPatterns) }
    })
    for (const id of data.userSongIds) {
      if (!songs.some((s) => s.id === id) && typeof data.charts[id] === "string") {
        songs.push(makeEntry(id, data.charts[id], null, data.customPatterns))
      }
    }
    this.set({ songs, settings: data.settings, customPatterns: data.customPatterns })
    this.transport.setTrainerStep(data.settings.trainerStep)
    this.engine?.setMix(data.settings.mix)
    this.selectSong(songs.some((s) => s.id === data.settings.songId) ? data.settings.songId : this.state.songId)
    return null
  }

  // ---- songs ----

  selectSong(id: string): void {
    const entry = this.state.songs.find((s) => s.id === id) ?? this.state.songs[0]
    if (!entry) return
    let parsed = parseChart(entry.chart, this.state.customPatterns)
    let draft: AppState["draft"] = null
    let openEditor = false
    if (parsed.errors.length) {
      draft = { id: entry.id, text: entry.chart }
      openEditor = true
      const original = entry.original ? parseChart(entry.original, this.state.customPatterns) : null
      if (original && !original.errors.length) {
        parsed = original
        this.notify("Your saved chart has an error, so the original is loaded. Your version is in the editor.", { duration: 5000 })
      } else if (!parsed.song.bars.length) {
        parsed = parseChart(NEW_SONG_TEMPLATE, this.state.customPatterns)
      }
    }
    const settings = { ...this.state.settings, songId: entry.id }
    this.set({
      songId: entry.id,
      settings,
      libraryOpen: false,
      overrides: this.data?.overrides[entry.id] ?? {},
      draft,
      editorOpen: openEditor || (this.state.editorOpen && this.state.songId === entry.id),
    })
    this.install(parsed.song, { stop: true, keepPosition: false })
    const song = parsed.song
    this.transport.setTempos(settings.tempo[entry.id] ?? 70, settings.target[entry.id] ?? song.tempo ?? 100)
    this.applyMode()
    this.saveSettingsSoon()
  }

  newSong(): void {
    const id = "song-" + Date.now().toString(36)
    const entry = makeEntry(id, NEW_SONG_TEMPLATE, null, [])
    this.set({ songs: [...this.state.songs, entry] })
    this.persistChart(id, NEW_SONG_TEMPLATE)
    this.persistUserSongIds()
    this.selectSong(id)
    this.setEditorOpen(true)
  }

  /** Checks chart text without applying it. */
  validate(text: string): ParsedChart {
    return parseChart(text, this.state.customPatterns)
  }

  /** Applies and saves the editor's chart. Returns its errors, and changes nothing if there are any. */
  applyChart(text: string): ChartError[] {
    const parsed = this.validate(text)
    if (parsed.errors.length) return parsed.errors
    const id = this.state.songId
    this.updateEntry(id, text)
    this.set({ draft: null })
    this.persistChart(id, text)
    this.install(parsed.song, { stop: true, keepPosition: true })
    this.notify("Chart applied and saved", { duration: 2200 })
    return []
  }

  resetChart(): void {
    const entry = this.currentEntry()
    if (!entry?.original) return
    void this.repo.deleteChart(entry.id)
    if (this.data) delete this.data.charts[entry.id]
    this.updateEntry(entry.id, entry.original)
    this.set({ draft: null })
    this.install(parseChart(entry.original, this.state.customPatterns).song, { stop: true, keepPosition: true })
    this.notify("Chart reset to the original")
  }

  deleteSong(): void {
    const entry = this.currentEntry()
    if (!entry || entry.builtin) return
    void this.repo.deleteChart(entry.id)
    void this.repo.saveOverrides(entry.id, {})
    if (this.data) {
      delete this.data.charts[entry.id]
      delete this.data.overrides[entry.id]
    }
    this.set({ songs: this.state.songs.filter((s) => s !== entry), draft: null, editorOpen: false })
    this.persistUserSongIds()
    this.selectSong(this.state.songs[0].id)
    this.notify("Song deleted")
  }

  currentEntry(): SongEntry | undefined {
    return this.state.songs.find((s) => s.id === this.state.songId)
  }

  // ---- library ----

  /** Shows the library page in place of the play screen, and stops playback. */
  openLibrary(): void {
    if (this.state.libraryOpen) return
    this.transport.pause()
    this.set({ libraryOpen: true })
  }

  /** Goes back to the play screen on the current song. */
  closeLibrary(): void {
    this.set({ libraryOpen: false })
  }

  // ---- editor ----

  setEditorOpen(open: boolean): void {
    this.set({ editorOpen: open })
    if (open) this.focusEditorOnBar(this.transport.getView().bar)
  }

  setDraft(text: string): void {
    const entry = this.currentEntry()
    if (!entry) return
    this.set({ draft: text !== entry.chart ? { id: entry.id, text } : null })
  }

  focusEditorOnBar(bar: number): void {
    const line = this.state.song.bars[bar]?.line ?? 1
    this.set({ editorFocus: { line, seq: this.state.editorFocus.seq + 1 } })
  }

  // ---- arrangement settings ----

  setLevel(level: Level): void {
    this.updateSettings({ level })
    this.rearrange()
  }

  toggleSimplify(): void {
    this.updateSettings({ simplify: !this.state.settings.simplify })
    this.rearrange()
  }

  /**
   * Plays the current song with its chords moved and a capo (decision 0016). The chart's
   * own key and capo clear the saved choice.
   */
  setKey(choice: KeyChoice): void {
    const key = { ...this.state.settings.key }
    const written = writtenChoice(this.state.song)
    if (choice.shapes === written.shapes && choice.capo === written.capo) delete key[this.state.songId]
    else key[this.state.songId] = choice
    this.updateSettings({ key })
    this.rearrange()
  }

  /** Back to the chords and capo the chart gives. */
  resetKey(): void {
    this.setKey(writtenChoice(this.state.song))
  }

  /** Sets or clears (null) a section's pattern override. */
  setOverride(section: number, id: PatternId | null): void {
    const key = sectionKey(this.state.song, section)
    const overrides = { ...this.state.overrides }
    if (id) overrides[key] = id
    else delete overrides[key]
    this.set({ overrides })
    if (this.data) this.data.overrides[this.state.songId] = overrides
    void this.repo.saveOverrides(this.state.songId, overrides)
    this.rearrange()
  }

  /** Saves a custom pattern and uses it for a section. Returns an error message, or null. */
  saveCustomPattern(rawName: string, rawSteps: string, section: number): string | null {
    const steps = normalizeSteps(rawSteps)
    if (!steps || !isValidSteps(steps)) return "Use D, U, dots, 1 to 6 and B, with at least one strum or pick."
    const list = [...this.state.customPatterns]
    let name = rawName.trim().replace(/\s+/g, " ")
    if (!name) name = "Custom " + (list.length + 1)
    if (/^[A-E]$/i.test(name)) return "A to E are the built-in patterns. Pick another name."
    const i = list.findIndex((p) => p.name.toLowerCase() === name.toLowerCase())
    if (i >= 0) name = list[i].name
    if (i >= 0) list[i] = { name, steps }
    else list.push({ name, steps })
    this.setCustomPatterns(list)
    this.setOverride(section, "c:" + name)
    this.notify(`Saved "${name}" and using it for this section`)
    return null
  }

  deleteCustomPattern(name: string): void {
    this.setCustomPatterns(this.state.customPatterns.filter((p) => p.name !== name))
    const overrides = Object.fromEntries(Object.entries(this.state.overrides).filter(([, v]) => v !== "c:" + name))
    this.set({ overrides })
    void this.repo.saveOverrides(this.state.songId, overrides)
    this.rearrange()
  }

  // ---- sound and practice settings ----

  setMix(patch: Partial<Mix>): void {
    const mix = { ...this.state.settings.mix, ...patch }
    this.updateSettings({ mix })
    this.engine?.setMix(mix)
  }

  // ---- practice modes ----

  /** Learn a section and Build speed loop the current section. Play the song plays through. */
  setMode(mode: PracticeMode): void {
    const settings = this.state.settings
    const start = { ...settings.start }
    // Build speed starts from the speed you're at now.
    if (mode === "speed" && settings.mode !== "speed") start[this.state.songId] = this.transport.getView().tempo
    this.updateSettings({ mode, start })
    this.applyMode()
  }

  /** The L key and the song map: loop a section, or go back to playing the whole song. */
  toggleLoop(): void {
    this.setMode(this.state.settings.mode === "song" ? "learn" : "song")
  }

  /** Loops a section from its first bar. Clicking the looped section again plays the song through. */
  loopSection(section: number): void {
    const t = this.transport
    if (this.state.settings.mode !== "song" && t.getView().loop?.section === section) {
      this.setMode("song")
      return
    }
    if (this.state.settings.mode === "song") this.updateSettings({ mode: "learn" })
    t.setTrainer(this.state.settings.mode === "speed")
    t.loopSection(section)
  }

  /** Where Build speed starts. Also sets the speed there, ready to play. */
  setTrainerStart(bpm: number): void {
    const start = clampTempo(bpm)
    this.updateSettings({ start: { ...this.state.settings.start, [this.state.songId]: start } })
    this.transport.setTempo(start)
  }

  private applyMode(): void {
    const t = this.transport
    const mode = this.state.settings.mode
    const looping = t.getView().loop !== null
    t.setTrainer(mode === "speed")
    if (mode === "song" ? looping : !looping) t.toggleLoop()
  }

  setTrainerStep(n: number): void {
    this.transport.setTrainerStep(n)
    this.updateSettings({ trainerStep: this.transport.getView().trainer.step })
  }

  setTarget(bpm: number): void {
    const target = clampTempo(bpm)
    this.transport.setTarget(target)
    this.updateSettings({ target: { ...this.state.settings.target, [this.state.songId]: target } })
  }

  // ---- internals ----

  private install(song: Song, opts: { stop: boolean; keepPosition: boolean }): void {
    const arrangement = this.arrangementFor(song)
    this.set({ song, arrangement })
    this.transport.setArrangement(arrangement, opts)
  }

  private rearrange(): void {
    const arrangement = this.arrangementFor(this.state.song)
    this.set({ arrangement })
    this.transport.setArrangement(arrangement, { stop: false, keepPosition: true })
  }

  private arrangementFor(song: Song): Arrangement {
    const s = this.state
    return arrange(song, {
      level: s.settings.level,
      simplify: s.settings.simplify,
      overrides: s.overrides,
      customPatterns: s.customPatterns,
      key: s.settings.key[s.songId],
    })
  }

  private setCustomPatterns(list: CustomPattern[]): void {
    this.set({ customPatterns: list })
    if (this.data) this.data.customPatterns = list
    void this.repo.saveCustomPatterns(list)
  }

  private updateEntry(id: string, chart: string): void {
    this.set({
      songs: this.state.songs.map((s) => (s.id === id ? { ...s, chart, ...namesOf(chart, this.state.customPatterns) } : s)),
    })
  }

  private persistChart(id: string, text: string): void {
    if (this.data) this.data.charts[id] = text
    this.repo.saveChart(id, text).catch(() =>
      this.notify("This browser blocked saving the chart. It will reset when you close the page.", { duration: 5000 })
    )
  }

  private persistUserSongIds(): void {
    const ids = this.state.songs.filter((s) => !s.builtin).map((s) => s.id)
    if (this.data) this.data.userSongIds = ids
    void this.repo.saveUserSongIds(ids)
  }

  private saveTempo(tempo: number): void {
    this.updateSettings({ tempo: { ...this.state.settings.tempo, [this.state.songId]: tempo } })
  }

  private updateSettings(patch: Partial<Settings>): void {
    this.set({ settings: { ...this.state.settings, ...patch } })
    this.saveSettingsSoon()
  }

  private saveSettingsSoon(): void {
    clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => {
      if (this.data) this.data.settings = this.state.settings
      void this.repo.saveSettings(this.state.settings)
    }, 200)
  }

  private set(patch: Partial<AppState>): void {
    this.state = { ...this.state, ...patch }
    for (const l of this.listeners) l()
  }
}

function safeLocalStorage(): Storage | undefined {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}
