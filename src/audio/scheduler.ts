// Audio is scheduled a little ahead on the AudioContext clock, so timing never depends
// on when JavaScript happens to run. A timer wakes the scheduler every 20 ms. With the
// tab hidden, browsers slow timers down, so the scheduler looks further ahead.

export interface Timer {
  start(onTick: () => void): void
  stop(): void
}

/** Schedules steps in order. */
export interface StepSource {
  /**
   * Schedules the step that starts at time `t`. Returns the seconds until the next step,
   * or null when this was the last one.
   */
  schedule(t: number): number | null
}

export interface SchedulerOptions {
  /** The AudioContext clock, in seconds. */
  now: () => number
  timer: Timer
  isHidden: () => boolean
}

export interface SchedulerStats {
  steps: number
  /** Steps scheduled after their time had already passed. Should stay 0. */
  late: number
  /** Times the scheduler fell so far behind that it restarted from now. */
  resyncs: number
  /** Largest gap between where a step was scheduled and where a steady grid puts it, in seconds. */
  drift: number
  firstAt: number | null
  lastAt: number
}

const LOOKAHEAD = 0.15
const LOOKAHEAD_HIDDEN = 1.5
const RESYNC_AFTER = 0.03
// A safety limit per wake-up, in case a source returns zero-length steps.
const MAX_STEPS_PER_TICK = 256

export const emptyStats = (): SchedulerStats => ({
  steps: 0,
  late: 0,
  resyncs: 0,
  drift: 0,
  firstAt: null,
  lastAt: 0,
})

export class LookaheadScheduler {
  stats = emptyStats()
  private source: StepSource | null = null
  private nextAt = 0
  // A steady grid to measure drift against: reset whenever the step length changes.
  private gridStart = 0
  private gridStep = 0
  private gridCount = 0
  private readonly opts: SchedulerOptions

  constructor(opts: SchedulerOptions) {
    this.opts = opts
  }

  get running(): boolean {
    return this.source !== null
  }

  start(source: StepSource, firstAt: number): void {
    this.source = source
    this.nextAt = firstAt
    this.gridStep = 0
    this.opts.timer.start(() => this.tick())
    this.tick()
  }

  stop(): void {
    this.source = null
    this.opts.timer.stop()
  }

  resetStats(): void {
    this.stats = emptyStats()
  }

  /** Schedules every step that starts within the lookahead window. Safe to call any time. */
  tick(): void {
    if (!this.source) return
    const now = this.opts.now()
    const ahead = this.opts.isHidden() ? LOOKAHEAD_HIDDEN : LOOKAHEAD
    if (this.nextAt < now - RESYNC_AFTER) {
      this.nextAt = now + RESYNC_AFTER
      this.stats.resyncs++
      this.gridStep = 0
    }
    let guard = 0
    while (this.source && this.nextAt < now + ahead && guard++ < MAX_STEPS_PER_TICK) {
      this.scheduleOne(now)
    }
  }

  private scheduleOne(now: number): void {
    const t = this.nextAt
    const s = this.stats
    if (t < now) s.late++
    s.steps++
    if (s.firstAt === null) s.firstAt = t
    s.lastAt = t
    const length = this.source!.schedule(t)
    if (length === null) {
      this.stop()
      return
    }
    if (length !== this.gridStep) {
      this.gridStep = length
      this.gridStart = t
      this.gridCount = 0
    } else {
      this.gridCount++
      s.drift = Math.max(s.drift, Math.abs(t - (this.gridStart + this.gridCount * length)))
    }
    this.nextAt = t + length
  }
}

/**
 * A 20 ms timer in a worker, which browsers throttle less than one on the page.
 * Falls back to setInterval where workers aren't available.
 */
export function createWorkerTimer(intervalMs = 20): Timer {
  let worker: Worker | null = null
  let interval: ReturnType<typeof setInterval> | null = null
  let onTick: () => void = () => {}
  const fallback = () => {
    if (!interval) interval = setInterval(() => onTick(), intervalMs)
  }
  return {
    start(cb) {
      onTick = cb
      if (!worker && !interval) {
        try {
          const src = `var i=null;onmessage=function(e){clearInterval(i);i=null;if(e.data==="go")i=setInterval(function(){postMessage(0)},${intervalMs})}`
          worker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })))
          worker.onmessage = () => onTick()
          worker.onerror = () => {
            worker = null
            fallback()
          }
        } catch {
          worker = null
        }
      }
      if (worker) worker.postMessage("go")
      else fallback()
    },
    stop() {
      if (worker) worker.postMessage("stop")
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    },
  }
}
