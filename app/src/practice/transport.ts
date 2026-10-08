// Play, pause, count-in, loops and the speed trainer. The transport walks the bars in
// play order, schedules each step's audio ahead of time, and queues the same step for
// the screen. Each animation frame shows the latest step that has reached the speakers.

import type { SoundOutput } from "@/audio/engine"
import { createWorkerTimer, LookaheadScheduler, type Timer } from "@/audio/scheduler"
import { TICKS_PER_BEAT, ticksPerBar } from "@/core/song/types"
import {
  barSteps,
  chordsUsed,
  countInSteps,
  sectionOf,
  type Arrangement,
  type Loop,
  type TimelineStep,
} from "@/core/timeline/arrangement"
import { clampTempo, clampTrainerStep, nextPassTempo } from "@/practice/trainer"

export type TransportState = "stopped" | "count-in" | "playing"

export interface TransportView {
  state: TransportState
  /** The bar on screen: where playback starts when stopped, the playhead while playing. */
  bar: number
  /** The lit slot of the strum strip, or -1. */
  slot: number
  /** The slot of the count-in bar, or -1 when not counting in. */
  countIn: number
  loop: Loop
  /** Loop pass, counting from 1. */
  pass: number
  tempo: number
  target: number
  trainer: { on: boolean; step: number }
}

export type TransportEvent =
  | { type: "pass"; pass: number; tempo: number; bumped: boolean; atTarget: boolean }
  | { type: "end" }
  /** The tempo changed, by the player or the speed trainer. Saved per song. */
  | { type: "tempo"; tempo: number }

/** How many heard slots to keep for tap snapping: a bar of 7/4 and then some. */
const HEARD_KEPT = 32

type Queued =
  | { t: number; kind: "count"; ci: number; bar: number }
  | { t: number; kind: "slot"; bar: number; slot: number }
  | { t: number; kind: "pass"; pass: number; tempo: number; bumped: boolean }
  | { t: number; kind: "end" }

/** Timing of the screen against the audio, for checking a build. */
interface DisplayStats {
  shown: number
  skipped: number
  lagSum: number
  lagMax: number
  lags: number[]
  frameGapMax: number
  frameGapSum: number
  frames: number
  hiddenFrames: number
  lastFrame: number
}

const emptyDisplayStats = (): DisplayStats => ({
  shown: 0,
  skipped: 0,
  lagSum: 0,
  lagMax: 0,
  lags: [],
  frameGapMax: 0,
  frameGapSum: 0,
  frames: 0,
  hiddenFrames: 0,
  lastFrame: 0,
})

export interface TransportOptions {
  /** Creates the audio output on first play, inside the user's click or key press. */
  createOutput: () => SoundOutput | null
  timer?: Timer
  isHidden?: () => boolean
  requestFrame?: (cb: (ts: number) => void) => number
  cancelFrame?: (id: number) => void
}

export class Transport {
  private arr: Arrangement | null = null
  private out: SoundOutput | null = null
  private readonly scheduler: LookaheadScheduler
  private readonly opts: Required<TransportOptions>
  private view: TransportView = {
    state: "stopped",
    bar: 0,
    slot: -1,
    countIn: -1,
    loop: null,
    pass: 1,
    tempo: 70,
    target: 100,
    trainer: { on: false, step: 3 },
  }
  private listeners = new Set<() => void>()
  private eventListeners = new Set<(e: TransportEvent) => void>()
  private frameId: number | null = null

  // Scheduling position, ahead of what's on screen.
  private schedBar = 0
  private schedSlot = 0
  private countLeft = 0
  private pass = 1
  private tempo = 70
  private queue: Queued[] = []
  /** The last few slots heard, with their audio times, for snapping a tap to the nearest. */
  private heard: { t: number; bar: number; slot: number }[] = []
  private stepsCache = new Map<number, TimelineStep[]>()
  private display = emptyDisplayStats()

  constructor(opts: TransportOptions) {
    this.opts = {
      timer: opts.timer ?? createWorkerTimer(),
      isHidden: opts.isHidden ?? (() => typeof document !== "undefined" && document.hidden),
      requestFrame: opts.requestFrame ?? ((cb) => requestAnimationFrame(cb)),
      cancelFrame: opts.cancelFrame ?? ((id) => cancelAnimationFrame(id)),
      createOutput: opts.createOutput,
    }
    this.scheduler = new LookaheadScheduler({
      now: () => this.out?.now() ?? 0,
      timer: this.opts.timer,
      isHidden: this.opts.isHidden,
    })
  }

  // ---- state for the UI ----

  getView = (): TransportView => this.view

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  onEvent(listener: (e: TransportEvent) => void): () => void {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  get playing(): boolean {
    return this.view.state !== "stopped"
  }

  // ---- song and settings ----

  /**
   * Uses a new arrangement. A new song or chart stops playback. A change of level,
   * simplify or pattern keeps playing, from the next step not yet scheduled.
   */
  setArrangement(arr: Arrangement, opts: { stop: boolean; keepPosition: boolean }): void {
    if (opts.stop && this.playing) this.stop()
    const prevSections = this.arr?.song.sections.length ?? 0
    this.arr = arr
    this.stepsCache.clear()
    const lastBar = Math.max(0, arr.song.bars.length - 1)
    const bar = opts.keepPosition ? Math.min(this.view.bar, lastBar) : 0
    let loop = this.view.loop
    if (!opts.keepPosition || (loop && loop.section >= arr.song.sections.length) || prevSections === 0) {
      loop = null
    }
    if (this.playing && this.out) this.out.warm(chordsUsed(arr))
    this.update({ bar, loop })
  }

  /** The player's tempo for this song, and the trainer's target. */
  setTempos(tempo: number, target: number): void {
    this.tempo = clampTempo(tempo)
    this.update({ tempo: this.tempo, target: clampTempo(target) })
  }

  setTempo(bpm: number): void {
    const tempo = clampTempo(bpm)
    if (tempo === this.tempo) return
    this.tempo = tempo
    this.update({ tempo })
    this.emit({ type: "tempo", tempo })
  }

  nudgeTempo(delta: number): void {
    this.setTempo(this.tempo + delta)
  }

  setTarget(bpm: number): void {
    this.update({ target: clampTempo(bpm) })
  }

  /** The speed trainer only acts while a section loops. */
  setTrainer(on: boolean): void {
    this.update({ trainer: { ...this.view.trainer, on } })
  }

  setTrainerStep(n: number): void {
    this.update({ trainer: { ...this.view.trainer, step: clampTrainerStep(n) } })
  }

  // ---- playback ----

  play(fromBar = this.view.bar): void {
    const arr = this.arr
    if (!arr || !arr.song.bars.length) return
    if (!this.out) this.out = this.opts.createOutput()
    const out = this.out
    if (!out) return
    out.resume()
    out.warm(chordsUsed(arr))
    out.silence()
    this.scheduler.stop()
    this.schedBar = fromBar
    this.schedSlot = 0
    this.countLeft = arr.slotsPerBar
    this.pass = 1
    this.queue = []
    this.heard = []
    this.update({ state: "count-in", bar: fromBar, slot: -1, countIn: -1, pass: 1 })
    this.scheduler.start({ schedule: (t) => this.scheduleStep(t) }, out.now() + 0.1)
    this.startFrames()
  }

  pause(): void {
    if (!this.playing) return
    this.stop()
    this.update({ state: "stopped", slot: -1, countIn: -1 })
  }

  toggle(): void {
    if (this.playing) this.pause()
    else this.play()
  }

  jumpTo(bar: number): void {
    const arr = this.arr
    if (!arr) return
    bar = Math.max(0, Math.min(arr.song.bars.length - 1, bar))
    let { loop, pass } = this.view
    if (loop) {
      const si = sectionOf(arr, bar)
      if (si !== loop.section) {
        loop = { section: si }
        pass = 1
      }
    }
    this.update({ bar, loop, pass })
    if (this.playing) this.play(bar)
  }

  prevSection(): void {
    const arr = this.arr
    if (!arr) return
    const bar = this.view.bar
    const si = sectionOf(arr, bar)
    const s = arr.song.sections[si]
    this.jumpTo(bar > s.start ? s.start : arr.song.sections[Math.max(0, si - 1)].start)
  }

  nextSection(): void {
    const arr = this.arr
    if (!arr) return
    const si = sectionOf(arr, this.view.bar)
    if (si + 1 < arr.song.sections.length) this.jumpTo(arr.song.sections[si + 1].start)
  }

  toggleLoop(): void {
    const arr = this.arr
    if (!arr) return
    if (this.view.loop) this.update({ loop: null })
    else {
      this.pass = 1
      this.update({ loop: { section: sectionOf(arr, this.view.bar) }, pass: 1 })
    }
  }

  /** Loops a section from its first bar, or stops looping it if it's already looped. */
  loopSection(section: number): void {
    const arr = this.arr
    if (!arr) return
    if (this.view.loop?.section === section) {
      this.update({ loop: null })
      return
    }
    this.pass = 1
    this.update({ loop: { section }, pass: 1 })
    this.jumpTo(arr.song.sections[section].start)
  }

  /**
   * The bar and slot nearest to what the player hears right now, for tapping along to sync
   * lyrics. During the count-in, before any slot is near, it's the first slot. Null when
   * stopped.
   */
  slotNearest(): { bar: number; slot: number } | null {
    if (!this.playing || !this.out) return null
    const now = this.out.heardNow()
    let best: { bar: number; slot: number } | null = null
    let gap = Infinity
    const queued = this.queue.flatMap((ev) => (ev.kind === "slot" ? [ev] : []))
    for (const ev of [...this.heard, ...queued]) {
      if (Math.abs(ev.t - now) < gap) {
        gap = Math.abs(ev.t - now)
        best = { bar: ev.bar, slot: ev.slot }
      }
    }
    return best ?? (this.view.state === "count-in" ? { bar: this.view.bar, slot: 0 } : null)
  }

  /** Schedules ahead now, for example when the tab is hidden and timers slow down. */
  tick(): void {
    this.scheduler.tick()
  }

  /** Shows the latest step that has reached the speakers. Runs every animation frame while playing. */
  frame(ts = performance.now()): void {
    const out = this.out
    if (!this.playing || !out) {
      this.display.lastFrame = 0
      return
    }
    const d = this.display
    if (d.lastFrame) {
      const gap = ts - d.lastFrame
      d.frameGapMax = Math.max(d.frameGapMax, gap)
      d.frameGapSum += gap
      d.frames++
    }
    d.lastFrame = ts
    if (this.opts.isHidden()) d.hiddenFrames++
    this.scheduler.tick()
    out.prune(out.now())
    const now = out.heardNow()
    let last: Queued | null = null
    while (this.queue.length && this.queue[0].t <= now) {
      const ev = this.queue.shift()!
      if (ev.kind === "slot" || ev.kind === "count") {
        if (last) d.skipped++
        last = ev
        if (ev.kind === "slot") {
          this.heard.push({ t: ev.t, bar: ev.bar, slot: ev.slot })
          if (this.heard.length > HEARD_KEPT) this.heard.shift()
        }
      } else if (ev.kind === "pass") {
        this.update({ pass: ev.pass, tempo: ev.tempo })
        this.emit({
          type: "pass",
          pass: ev.pass,
          tempo: ev.tempo,
          bumped: ev.bumped,
          atTarget: ev.tempo >= this.view.target,
        })
        if (ev.bumped) this.emit({ type: "tempo", tempo: ev.tempo })
      } else {
        if (last) this.show(last)
        this.stop()
        this.update({ state: "stopped", bar: 0, slot: -1, countIn: -1 })
        this.emit({ type: "end" })
        return
      }
    }
    if (last) {
      const lag = now - last.t
      d.shown++
      d.lagSum += lag
      d.lagMax = Math.max(d.lagMax, lag)
      if (d.lags.length < 20000) d.lags.push(lag)
      this.show(last)
    }
  }

  resetStats(): void {
    this.scheduler.resetStats()
    this.display = emptyDisplayStats()
  }

  /** Timing stats, as `window.__practice.sync()` reports them. */
  syncReport() {
    const s = this.scheduler.stats
    const d = this.display
    const lags = d.lags.slice().sort((a, b) => a - b)
    const pct = (p: number) => (lags.length ? lags[Math.min(lags.length - 1, Math.floor(p * lags.length))] : 0)
    const ms = (sec: number, digits = 2) => +(sec * 1000).toFixed(digits)
    const ctx = (this.out as { ctx?: AudioContext } | null)?.ctx
    return {
      runSeconds: s.firstAt === null ? 0 : +(s.lastAt - s.firstAt).toFixed(2),
      slotsScheduled: s.steps,
      slotsShown: d.shown,
      slotsSkippedByFrames: d.skipped,
      lateAudioEvents: s.late,
      resyncs: s.resyncs,
      scheduleDriftMs: ms(s.drift, 6),
      highlightLagMs: { mean: ms(d.lagSum / Math.max(1, d.shown)), p95: ms(pct(0.95)), max: ms(d.lagMax) },
      frameGapMs: {
        mean: +(d.frameGapSum / Math.max(1, d.frames)).toFixed(1),
        max: +d.frameGapMax.toFixed(1),
        framesWhileHidden: d.hiddenFrames,
        frames: d.frames,
      },
      audio: ctx
        ? {
            state: ctx.state,
            sampleRate: ctx.sampleRate,
            baseLatencyMs: ms(ctx.baseLatency || 0, 1),
            outputLatencyMs: ms(ctx.outputLatency || 0, 1),
          }
        : null,
    }
  }

  // ---- internals ----

  private stepsFor(bar: number): TimelineStep[] {
    let steps = this.stepsCache.get(bar)
    if (!steps) {
      steps = barSteps(this.arr!, bar)
      this.stepsCache.set(bar, steps)
    }
    return steps
  }

  private scheduleStep(t: number): number | null {
    const arr = this.arr!
    const out = this.out!
    const secondsPerTick = 60 / (this.tempo * TICKS_PER_BEAT)
    const barTicks = ticksPerBar(arr.song)
    if (this.countLeft > 0) {
      const steps = countInSteps(arr)
      const ci = arr.slotsPerBar - this.countLeft
      const step = steps[ci]
      if (step.click) out.click(t, step.click === "accent")
      this.queue.push({ t, kind: "count", ci, bar: this.schedBar })
      this.countLeft--
      return ((steps[ci + 1]?.tick ?? barTicks) - step.tick) * secondsPerTick
    }
    const bar = this.schedBar
    const steps = this.stepsFor(bar)
    const step = steps[this.schedSlot]
    if (step.click) out.click(t, step.click === "accent")
    if (step.sound) out.play(t, step.sound)
    this.queue.push({ t, kind: "slot", bar, slot: step.slot })
    const length = ((steps[this.schedSlot + 1]?.tick ?? barTicks) - step.tick) * secondsPerTick
    if (++this.schedSlot >= steps.length) {
      this.schedSlot = 0
      const next = this.advanceBar(bar, t + length)
      if (next < 0) {
        this.queue.push({ t: t + length, kind: "end" })
        return null
      }
      this.schedBar = next
    }
    return length
  }

  /** Moves to the next bar to schedule, counting loop passes and stepping up the trainer. */
  private advanceBar(bar: number, tNext: number): number {
    const arr = this.arr!
    const loop = this.view.loop
    if (loop) {
      const s = arr.song.sections[loop.section]
      if (bar === s.end - 1) {
        this.pass++
        const tempo = nextPassTempo(this.tempo, { ...this.view.trainer, target: this.view.target })
        const bumped = tempo !== this.tempo
        this.tempo = tempo
        this.queue.push({ t: tNext, kind: "pass", pass: this.pass, tempo, bumped })
        return s.start
      }
      if (bar < s.start || bar > s.end - 1) return s.start
      return bar + 1
    }
    return bar + 1 < arr.song.bars.length ? bar + 1 : -1
  }

  private show(ev: Queued): void {
    if (ev.kind === "count") this.update({ state: "count-in", bar: ev.bar, slot: ev.ci, countIn: ev.ci })
    else if (ev.kind === "slot") this.update({ state: "playing", bar: ev.bar, slot: ev.slot, countIn: -1 })
  }

  private stop(): void {
    this.scheduler.stop()
    this.queue = []
    this.heard = []
    this.out?.silence()
    this.stopFrames()
  }

  private startFrames(): void {
    if (this.frameId !== null) return
    const loop = (ts: number) => {
      this.frameId = this.opts.requestFrame(loop)
      this.frame(ts)
    }
    this.frameId = this.opts.requestFrame(loop)
  }

  private stopFrames(): void {
    if (this.frameId !== null) this.opts.cancelFrame(this.frameId)
    this.frameId = null
    this.display.lastFrame = 0
  }

  private update(patch: Partial<TransportView>): void {
    let changed = false
    for (const k of Object.keys(patch) as (keyof TransportView)[]) {
      if (this.view[k] !== patch[k]) {
        changed = true
        break
      }
    }
    if (!changed) return
    this.view = { ...this.view, ...patch }
    for (const l of this.listeners) l()
  }

  private emit(e: TransportEvent): void {
    for (const l of this.eventListeners) l(e)
  }
}
