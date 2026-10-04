// The Web Audio graph: a click bus and a guitar bus with a little body EQ and room
// reverb, into a gentle compressor.

import type { StepSound } from "@/core/timeline/arrangement"
import type { Voicing } from "@/core/song/types"
import { AcousticGuitar } from "@/audio/acoustic"
import { VoiceList } from "@/audio/voices"

/** Volumes are 0 to 100, as the sliders show them. */
export interface Mix {
  clickVolume: number
  clickMuted: boolean
  guitarVolume: number
  guitarMuted: boolean
}

/** What the transport needs from the audio side. Tests replace it with a fake. */
export interface SoundOutput {
  /** The AudioContext clock, in seconds. */
  now(): number
  /** The time on that clock of the sound reaching the speakers now. */
  heardNow(): number
  resume(): void
  warm(voicings: Voicing[]): void
  click(t: number, accent: boolean): void
  play(t: number, sound: StepSound): void
  silence(): void
  prune(now: number): void
}

export class AudioEngine implements SoundOutput {
  readonly ctx: AudioContext
  private readonly clickBus: GainNode
  private readonly guitarBus: GainNode
  private readonly voices = new VoiceList()
  private readonly guitar: AcousticGuitar

  /** Creates the engine, or returns null when the browser has no Web Audio. Call from a user gesture. */
  static create(mix: Mix): AudioEngine | null {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    let ctx: AudioContext
    try {
      ctx = new AC({ latencyHint: "interactive" })
    } catch {
      ctx = new AC()
    }
    return new AudioEngine(ctx, mix)
  }

  private constructor(ctx: AudioContext, mix: Mix) {
    this.ctx = ctx
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -8
    comp.knee.value = 6
    comp.ratio.value = 4
    comp.attack.value = 0.003
    comp.release.value = 0.15
    comp.connect(ctx.destination)
    const master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(comp)
    this.clickBus = ctx.createGain()
    this.clickBus.connect(master)
    this.guitarBus = ctx.createGain()
    this.guitarBus.connect(master)

    const guitarIn = ctx.createGain()
    guitarIn.gain.value = 0.55
    const hp = ctx.createBiquadFilter()
    hp.type = "highpass"
    hp.frequency.value = 70
    const body = ctx.createBiquadFilter()
    body.type = "peaking"
    body.frequency.value = 190
    body.Q.value = 1.1
    body.gain.value = 3
    const top = ctx.createBiquadFilter()
    top.type = "lowpass"
    top.frequency.value = 6500
    top.Q.value = 0.6
    guitarIn.connect(hp)
    hp.connect(body)
    body.connect(top)
    top.connect(this.guitarBus)
    const verb = ctx.createConvolver()
    verb.buffer = roomImpulse(ctx, 1.3)
    const wet = ctx.createGain()
    wet.gain.value = 0.16
    top.connect(verb)
    verb.connect(wet)
    wet.connect(this.guitarBus)

    this.guitar = new AcousticGuitar(ctx, guitarIn, this.voices)
    this.setMix(mix)
  }

  now(): number {
    return this.ctx.currentTime
  }

  heardNow(): number {
    const ctx = this.ctx
    if (ctx.state === "running" && ctx.getOutputTimestamp) {
      const ts = ctx.getOutputTimestamp()
      if (ts.performanceTime && ts.performanceTime > 0 && ts.contextTime && ts.contextTime > 0) {
        return ts.contextTime + (performance.now() - ts.performanceTime) / 1000
      }
    }
    return ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0)
  }

  resume(): void {
    if (this.ctx.state !== "running") void this.ctx.resume()
  }

  setMix(mix: Mix): void {
    const now = this.ctx.currentTime
    const click = mix.clickMuted ? 0 : Math.pow(mix.clickVolume / 100, 2) * 0.8
    const guitar = mix.guitarMuted ? 0 : Math.pow(mix.guitarVolume / 100, 2) * 1.1
    this.clickBus.gain.setTargetAtTime(click, now, 0.02)
    this.guitarBus.gain.setTargetAtTime(guitar, now, 0.02)
  }

  warm(voicings: Voicing[]): void {
    this.guitar.warm(voicings)
  }

  click(t: number, accent: boolean): void {
    const ctx = this.ctx
    const o = ctx.createOscillator()
    const gain = ctx.createGain()
    o.type = "triangle"
    o.frequency.setValueAtTime(accent ? 1900 : 1250, t)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(accent ? 1 : 0.45, t + 0.0015)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + (accent ? 0.07 : 0.05))
    o.connect(gain)
    gain.connect(this.clickBus)
    o.start(t)
    o.stop(t + 0.09)
    this.voices.add({ src: o, gain, end: t + 0.09 })
  }

  play(t: number, sound: StepSound): void {
    if (sound.type === "strum") {
      this.guitar.strum(t, sound.chord, sound.voicing, sound.direction, sound.accent)
    } else {
      this.guitar.pick(t, sound.chord, sound.voicing, sound.string, sound.accent)
    }
  }

  silence(): void {
    this.voices.silence(this.ctx.currentTime)
    this.guitar.reset()
  }

  prune(now: number): void {
    this.voices.prune(now)
  }
}

/** Decaying filtered noise, for a small room. */
function roomImpulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const sr = ctx.sampleRate
  const len = Math.floor(sr * seconds)
  const b = ctx.createBuffer(2, len, sr)
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c)
    let lp = 0
    for (let i = 0; i < len; i++) {
      lp += 0.35 * (Math.random() * 2 - 1 - lp)
      d[i] = lp * Math.pow(1 - i / len, 3.2)
    }
  }
  return b
}
