import { describe, expect, it } from "vitest"
import type { SoundOutput } from "@/audio/engine"
import type { Timer } from "@/audio/scheduler"
import { parseChart } from "@/core/chart/parse"
import { arrange, type Arrangement } from "@/core/timeline/arrangement"
import { Transport, type TransportEvent } from "@/practice/transport"
import { nextPassTempo } from "@/practice/trainer"
import { builtinChart, DEFAULT_SONG_ID } from "@/data/builtin-songs"

/** A fake audio clock and output that records what was scheduled. */
function harness(chart: string, level: "beginner" | "arranged" | "record" = "arranged") {
  let clock = 0
  let onTick: (() => void) | null = null
  const clicks: number[] = []
  const sounds: { t: number; type: string }[] = []
  const out: SoundOutput = {
    now: () => clock,
    heardNow: () => clock - 0.02,
    resume: () => {},
    warm: () => {},
    click: (t) => void clicks.push(t),
    play: (t, s) => void sounds.push({ t, type: s.type }),
    silence: () => {},
    prune: () => {},
  }
  const timer: Timer = { start: (cb) => void (onTick = cb), stop: () => void (onTick = null) }
  const transport = new Transport({
    createOutput: () => out,
    timer,
    isHidden: () => false,
    requestFrame: () => 1,
    cancelFrame: () => {},
  })
  const arr: Arrangement = arrange(parseChart(chart, []).song, {
    level,
    simplify: false,
    overrides: {},
    customPatterns: [],
  })
  transport.setArrangement(arr, { stop: true, keepPosition: false })
  const events: TransportEvent[] = []
  transport.onEvent((e) => events.push(e))
  /** Runs the clock forward, waking the timer every 20 ms and drawing a frame every 16 ms. */
  const run = (seconds: number) => {
    const end = clock + seconds
    let nextFrame = clock
    while (clock < end) {
      clock = +(clock + 0.004).toFixed(6)
      if (Math.round(clock * 1000) % 20 === 0) onTick?.()
      if (clock >= nextFrame) {
        transport.frame(clock * 1000)
        nextFrame += 1 / 60
      }
    }
  }
  return { transport, run, clicks, sounds, events }
}

const LONG = `time: 4/4
[A] pattern=C
G | C | D | G
[B] pattern=B
Em | C | G | D
`

describe("Transport", () => {
  it("counts in one bar with clicks only, then plays", () => {
    const h = harness(LONG)
    h.transport.setTempos(120, 120)
    h.transport.play(0)
    h.run(1.9)
    // At 120 BPM a beat is 0.5 s: four count-in clicks, no guitar yet.
    expect(h.clicks).toHaveLength(4)
    expect(h.sounds).toHaveLength(0)
    expect(h.transport.getView().state).toBe("count-in")
    h.run(0.3)
    expect(h.transport.getView()).toMatchObject({ state: "playing", bar: 0 })
    expect(h.sounds.length).toBeGreaterThan(0)
  })

  it("keeps steps on a steady grid with nothing late over two minutes", () => {
    const h = harness(LONG.replace("G | C | D | G", "G | C | D | G\nG*200"))
    h.transport.setTempos(103, 103)
    h.transport.play(0)
    h.run(120)
    const r = h.transport.syncReport()
    expect(r.runSeconds).toBeGreaterThan(119)
    expect(r.lateAudioEvents).toBe(0)
    expect(r.resyncs).toBe(0)
    expect(r.scheduleDriftMs).toBeLessThan(0.001)
    // Clicks on every beat, 60 / 103 s apart.
    const gaps = h.clicks.slice(1).map((t, i) => t - h.clicks[i])
    for (const g of gaps) expect(g).toBeCloseTo(60 / 103, 9)
  })

  it("plays to the end of the song, then stops and goes back to the start", () => {
    const h = harness(builtinChart(DEFAULT_SONG_ID)!)
    h.transport.setTempos(130, 130)
    h.transport.play(30)
    h.run(12)
    expect(h.events).toContainEqual({ type: "end" })
    expect(h.transport.getView()).toMatchObject({ state: "stopped", bar: 0, slot: -1 })
  })

  it("loops a section and steps the speed trainer up on each pass to its target", () => {
    const h = harness(LONG)
    h.transport.setTempos(100, 106)
    h.transport.setTrainerStep(4)
    h.transport.loopSection(1)
    h.transport.setTrainer(true)
    h.transport.play()
    h.run(2.4 + 3 * 9.6)
    const passes = h.events.filter((e) => e.type === "pass")
    expect(passes.map((p) => p.type === "pass" && p.tempo)).toEqual([104, 106, 106])
    expect(h.transport.getView().loop).toEqual({ section: 1 })
    expect(h.transport.getView().bar).toBeGreaterThanOrEqual(4)
  })

  it("moves between sections and keeps a loop on the section it lands in", () => {
    const h = harness(LONG)
    h.transport.nextSection()
    expect(h.transport.getView().bar).toBe(4)
    h.transport.jumpTo(6)
    h.transport.prevSection()
    expect(h.transport.getView().bar).toBe(4)
    h.transport.prevSection()
    expect(h.transport.getView().bar).toBe(0)
    h.transport.toggleLoop()
    h.transport.jumpTo(5)
    expect(h.transport.getView().loop).toEqual({ section: 1 })
  })

  it("clamps the tempo to the slider's range", () => {
    const h = harness(LONG)
    h.transport.setTempo(300)
    expect(h.transport.getView().tempo).toBe(130)
    h.transport.nudgeTempo(-200)
    expect(h.transport.getView().tempo).toBe(40)
  })
})

describe("nextPassTempo", () => {
  it("adds the step until the target, and does nothing when off", () => {
    expect(nextPassTempo(90, { on: true, step: 3, target: 100 })).toBe(93)
    expect(nextPassTempo(99, { on: true, step: 3, target: 100 })).toBe(100)
    expect(nextPassTempo(100, { on: true, step: 3, target: 100 })).toBe(100)
    expect(nextPassTempo(90, { on: false, step: 3, target: 100 })).toBe(90)
  })
})
