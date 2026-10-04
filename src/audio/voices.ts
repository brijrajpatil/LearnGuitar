/** A sound that's been scheduled and may still be ringing. */
export interface Voice {
  src: AudioScheduledSourceNode
  gain: GainNode
  /** When it stops sounding, on the AudioContext clock. */
  end: number
  /** Set once the voice has been told to stop early. */
  dampAt?: number
}

/** Keeps track of scheduled voices so they can all be stopped at once. */
export class VoiceList {
  private voices: Voice[] = []

  add(v: Voice): void {
    this.voices.push(v)
  }

  /** Forgets voices that finished a while ago. Cheap to call often. */
  prune(now: number): void {
    if (this.voices.length < 64) return
    this.voices = this.voices.filter((v) => v.end > now - 0.2)
  }

  /** Fades out everything, including voices scheduled in the future. */
  silence(now: number): void {
    for (const v of this.voices) {
      try {
        v.gain.gain.cancelScheduledValues(now)
        v.gain.gain.setTargetAtTime(0, now, 0.015)
        v.src.stop(now + 0.1)
      } catch {
        // Already stopped.
      }
    }
    this.voices = []
  }
}

/** Stops a voice early with a short fade, as a hand resting on a string would. */
export function damp(v: Voice, t: number): void {
  if (v.dampAt !== undefined && v.dampAt <= t) return
  v.dampAt = t
  try {
    v.gain.gain.setTargetAtTime(0, t, 0.014)
    v.src.stop(t + 0.15)
  } catch {
    // Already stopped.
  }
  v.end = Math.min(v.end, t + 0.15)
}
