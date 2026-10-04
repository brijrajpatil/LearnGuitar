// A synthesized steel-string acoustic guitar: Karplus-Strong plucked strings, strummed
// and picked the way a hand plays them.

import type { Voicing } from "@/core/song/types"
import { stringMidi } from "@/core/theory/chords"
import { damp, VoiceList, type Voice } from "@/audio/voices"

/** 0 and 1 are two takes of a brighter pick for down strums, 2 is softer for up strums. */
type Variant = 0 | 1 | 2

export class AcousticGuitar {
  private cache = new Map<number, AudioBuffer>()
  /** What's ringing on each string, low E first. */
  private strings: (Voice | null)[] = [null, null, null, null, null, null]
  private lastChord: string | null = null
  private readonly ctx: BaseAudioContext
  private readonly out: AudioNode
  private readonly voices: VoiceList

  constructor(ctx: BaseAudioContext, out: AudioNode, voices: VoiceList) {
    this.ctx = ctx
    this.out = out
    this.voices = voices
  }

  /** Renders the notes of these chords ahead of time, so the first strum doesn't stutter. */
  warm(voicings: Voicing[]): void {
    for (const v of voicings) {
      v.frets.forEach((fret, s) => {
        if (fret < 0) return
        const midi = stringMidi(s, fret)
        this.buffer(midi, 0)
        this.buffer(midi, 1)
        if (s >= 2) this.buffer(midi, 2)
      })
    }
  }

  /** D strums low to high over every fretted string. U strums high to low over the top 3 or 4, softer. */
  strum(t: number, chord: string, v: Voicing, direction: "D" | "U", accent: boolean): void {
    const played: number[] = []
    for (let s = 0; s < 6; s++) if (v.frets[s] >= 0) played.push(s)
    if (!played.length) return
    let order: number[]
    let stagger: number
    let base: number
    if (direction === "D") {
      order = played
      stagger = 0.012
      base = accent ? 1 : 0.84
    } else {
      order = played.slice(-Math.max(2, Math.min(4, played.length - 1))).reverse()
      stagger = 0.01
      base = 0.5
    }
    if (this.lastChord !== chord) {
      // The fretting hand moved: strings not struck now stop ringing.
      for (let s = 0; s < 6; s++) {
        const ringing = this.strings[s]
        if (ringing && !order.includes(s)) {
          damp(ringing, t)
          this.strings[s] = null
        }
      }
      this.lastChord = chord
    }
    const variant: Variant = direction === "U" ? 2 : Math.random() < 0.5 ? 0 : 1
    order.forEach((s, i) => {
      const jitter = i ? (Math.random() - 0.5) * 0.003 : 0
      const vel =
        base * (0.93 + Math.random() * 0.1) * (direction === "D" ? 0.9 + 0.1 * (i / order.length) : 1)
      this.note(s, stringMidi(s, v.frets[s]), t + i * stagger + jitter, vel, variant)
    })
  }

  /** One picked string. The chord's other strings keep ringing, as in an arpeggio. */
  pick(t: number, chord: string, v: Voicing, string: number, accent: boolean): void {
    if (this.lastChord !== chord) {
      for (let i = 0; i < 6; i++) {
        const ringing = this.strings[i]
        if (i !== string && ringing) {
          damp(ringing, t)
          this.strings[i] = null
        }
      }
      this.lastChord = chord
    }
    const vel = (accent ? 0.95 : 0.82) * (0.94 + Math.random() * 0.1)
    this.note(string, stringMidi(string, v.frets[string]), t, vel, Math.random() < 0.5 ? 0 : 1)
  }

  /** Forgets what's ringing, after the voices were silenced. */
  reset(): void {
    this.strings = [null, null, null, null, null, null]
    this.lastChord = null
  }

  private note(s: number, midi: number, t: number, vel: number, variant: Variant): void {
    const buf = this.buffer(midi, variant)
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(vel, t)
    src.connect(gain)
    gain.connect(this.out)
    src.start(t)
    const voice: Voice = { src, gain, end: t + buf.duration }
    const prev = this.strings[s]
    if (prev) damp(prev, t)
    this.strings[s] = voice
    this.voices.add(voice)
  }

  /** A Karplus-Strong plucked string, rendered once per note and variant, then cached. */
  private buffer(midi: number, variant: Variant): AudioBuffer {
    const key = midi * 4 + variant
    const cached = this.cache.get(key)
    if (cached) return cached
    const sr = this.ctx.sampleRate
    const soft = variant === 2
    const f = 440 * Math.pow(2, (midi - 69) / 12)
    const n = Math.floor(sr * (soft ? 3 : 4.2))
    const buf = this.ctx.createBuffer(1, n, sr)
    const out = buf.getChannelData(0)
    const P = sr / f // loop length in samples
    const L = Math.max(2, Math.floor(P - 0.7))
    const d = P - 0.5 - L // fractional part, handled by an allpass
    const C = (1 - d) / (1 + d)
    const t60 = Math.max(1.5, 2.6 + (2.6 * (64 - midi)) / 24)
    const rho = Math.pow(0.001, 1 / (f * t60))
    const line = new Float32Array(L)
    const bright = soft ? 0.22 : variant ? 0.5 : 0.58
    let lp = 0
    for (let i = 0; i < L; i++) {
      lp += bright * (Math.random() * 2 - 1 - lp)
      line[i] = lp
    }
    const pd = Math.max(1, Math.round(L * (soft ? 0.22 : 0.13))) // pick position comb
    const ex = line.slice()
    let mean = 0
    for (let i = 0; i < L; i++) {
      line[i] = ex[i] - (i >= pd ? ex[i - pd] : 0) * 0.9
      mean += line[i]
    }
    mean /= L
    for (let i = 0; i < L; i++) line[i] -= mean
    let idx = 0
    let prev = 0
    let apIn = 0
    let apOut = 0
    for (let i = 0; i < n; i++) {
      const y = line[idx]
      out[i] = y
      const avg = 0.5 * (y + prev)
      prev = y
      const ap = C * avg + apIn - C * apOut
      apIn = avg
      apOut = ap
      line[idx] = rho * ap
      if (++idx >= L) idx = 0
    }
    const m = Math.min(n, Math.floor(sr * 0.06))
    let rms = 0
    for (let i = 0; i < m; i++) rms += out[i] * out[i]
    rms = Math.sqrt(rms / m) || 1
    const g = 0.2 / rms
    const fadeIn = Math.floor(sr * 0.0015)
    const fadeOut = Math.floor(sr * 0.3)
    for (let i = 0; i < n; i++) {
      let e = g
      if (i < fadeIn) e *= i / fadeIn
      if (i > n - fadeOut) e *= (n - i) / fadeOut
      out[i] *= e
    }
    this.cache.set(key, buf)
    return buf
  }
}
