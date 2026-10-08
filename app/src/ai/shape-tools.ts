// The theory module's chord shapes, in the form the AI converter takes. A shape from
// the model is used only when it plays the notes its name says, with the right bass.

import type { Voicing } from "@/core/song/types"
import { stringMidi } from "@/core/theory/chords"
import { chordTones, generateVoicing } from "@/core/theory/shapes"
import type { ShapeTools } from "@/ai/to-chart"

export function playsChord(name: string, v: Voicing): boolean {
  const chord = chordTones(name)
  const sounded = v.frets.flatMap((f, s) => (f < 0 ? [] : [stringMidi(s, f)]))
  if (!chord || sounded.length < 2) return false
  const heard = new Set(sounded.map((n) => n % 12))
  const allowed = new Set([...chord.tones, chord.bass])
  const needed = chord.tones.filter((t) => !chord.optional.includes(t))
  return (
    [...heard].every((pc) => allowed.has(pc)) &&
    needed.every((pc) => heard.has(pc)) &&
    Math.min(...sounded) % 12 === chord.bass
  )
}

export const THEORY_SHAPES: ShapeTools = { shapeFor: generateVoicing, playsChord }
