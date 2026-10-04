// What the banner above the strum strip tells you about the bars ahead.

import type { Pattern } from "@/core/pattern/patterns"
import { nextBar, sectionOf, type Arrangement, type Loop } from "@/core/timeline/arrangement"

export interface TrainerStatus {
  on: boolean
  step: number
  target: number
}

export type Upcoming =
  /** The pattern changes at the next bar. This is the one case that needs your attention. */
  | { kind: "pattern-change"; section: string; pattern: Pattern }
  | { kind: "loop"; section: string; pass: number | null; trainer: (TrainerStatus & { atTarget: boolean }) | null }
  | { kind: "up-next"; section: string; barsLeft: number; samePattern: boolean; pattern: Pattern }
  | { kind: "last-section"; barsLeft: number }

export function upcoming(
  arr: Arrangement,
  bar: number,
  opts: { loop: Loop; pass: number | null; trainer: TrainerStatus; tempo: number }
): Upcoming {
  const si = sectionOf(arr, bar)
  const sec = arr.song.sections[si]
  const nb = nextBar(arr, bar, opts.loop)
  if (nb >= 0) {
    const nsi = sectionOf(arr, nb)
    if (arr.patterns[si].id !== arr.patterns[nsi].id) {
      return { kind: "pattern-change", section: arr.song.sections[nsi].name, pattern: arr.patterns[nsi] }
    }
  }
  if (opts.loop && opts.loop.section === si) {
    return {
      kind: "loop",
      section: sec.name,
      pass: opts.pass,
      trainer: opts.trainer.on ? { ...opts.trainer, atTarget: opts.tempo >= opts.trainer.target } : null,
    }
  }
  const barsLeft = sec.end - bar
  if (si + 1 < arr.song.sections.length) {
    return {
      kind: "up-next",
      section: arr.song.sections[si + 1].name,
      barsLeft,
      samePattern: arr.patterns[si + 1].id === arr.patterns[si].id,
      pattern: arr.patterns[si + 1],
    }
  }
  return { kind: "last-section", barsLeft }
}
