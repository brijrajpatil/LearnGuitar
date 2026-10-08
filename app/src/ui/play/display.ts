// What play mode shows for the transport's current position, worked out from the
// arrangement. Kept apart from the components so the rules sit in one place.

import type { Pattern } from "@/core/pattern/patterns"
import { nextChange, type Arrangement, type NextChange } from "@/core/timeline/arrangement"
import type { KeyOption } from "@/core/timeline/key-options"
import type { TransportView } from "@/practice/transport"

/** A pattern's name as the player sees it. */
export const patternTitle = (p: Pattern): string => (p.kind === "inline" ? "The chart's pattern" : p.name)

export const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`

/** The capo a key needs, as the key picker and the library show it: "Capo 2", "No capo fits". */
export function capoText(o: Pick<KeyOption, "shapes" | "capo">): string {
  if (o.shapes === 0) return o.capo ? `Capo ${o.capo}, as written` : "As written"
  if (o.capo === null) return "No capo fits"
  return o.capo ? `Capo ${o.capo}` : "No capo"
}

export const formatTime = (seconds: number): string => {
  const s = Math.round(seconds)
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0")
}

export interface NextDisplay {
  change: NextChange
  /** "in 2 beats", "in 3 bars", or empty when nothing changes. */
  countdown: string
  /** The change is on the next beat while playing. */
  soon: boolean
}

/**
 * The next chord change from where the transport is. During the count-in, the
 * countdown includes the rest of the count-in bar.
 */
export function nextDisplay(arr: Arrangement, view: TransportView): NextDisplay {
  const counting = view.state === "count-in" && view.countIn >= 0
  const live = view.state !== "stopped"
  const slot = view.state === "playing" ? Math.max(0, view.slot) : 0
  const extra = counting ? arr.slotsPerBar - view.countIn : 0
  const change = nextChange(arr, view.bar, slot, view.loop)
  if (change.kind === "chord") {
    const slots = change.slots + extra
    const beats = Math.ceil(slots / 2)
    const countdown =
      beats > arr.song.beatsPerBar * 2
        ? `in ${Math.ceil(slots / arr.slotsPerBar)} bars`
        : `in ${plural(beats, "beat")}`
    return { change, countdown, soon: live && beats === 1 }
  }
  return { change, countdown: "", soon: false }
}

/** The slot whose chord is shown as Now. */
export const nowSlot = (view: TransportView): number =>
  view.state === "playing" ? Math.max(0, view.slot) : 0
