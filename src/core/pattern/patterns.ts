// Strum and pick patterns. A pattern is a string of steps, one character per eighth note:
//   D  strum down        U  strum up        .  miss (the hand moves, no strings)
//   1-6  pick that string (1 = high E)      B  pick the chord's bass note

/**
 * How a section refers to its pattern. Stored in charts and saved overrides, so the
 * format must stay the same:
 * - "A" to "E": a preset
 * - "c:<name>": a saved custom pattern
 * - "i:<steps>": a figure written in the chart itself
 */
export type PatternId = string

export interface CustomPattern {
  name: string
  steps: string
}

export type PatternKind = "preset" | "custom" | "inline"

export interface Pattern {
  id: PatternId
  kind: PatternKind
  name: string
  steps: string
  /**
   * Presets restart every bar. Custom and chart patterns run on across bar lines
   * from the start of the section, so a 5-beat figure works in 4/4.
   */
  runsOn: boolean
}

export const PRESETS = {
  A: { name: "Beat downs", steps: "D.D.D.D." },
  B: { name: "Eighths", steps: "DUDUDUDU" },
  C: { name: "Old faithful", steps: "D.DU.UDU" },
  D: { name: "Ballad", steps: "D...D.DU" },
  E: { name: "Ring", steps: "D......." },
} as const

export type PresetId = keyof typeof PRESETS
export const PRESET_IDS = Object.keys(PRESETS) as PresetId[]

const isPresetId = (v: string): v is PresetId => v in PRESETS

export function isValidSteps(steps: string): boolean {
  return /^[DU.1-6B]+$/.test(steps) && /[^.]/.test(steps)
}

/** Accepts the loose ways people type figures: lower case, spaces, bar lines, dashes. */
export function normalizeSteps(value: string): string {
  return String(value)
    .toUpperCase()
    .replace(/[\s|]/g, "")
    .replace(/[-_·•]/g, ".")
}

/** Resolves a chart's pattern= or record= value to a PatternId, or null if it isn't one. */
export function resolvePatternRef(
  value: string,
  custom: readonly CustomPattern[]
): PatternId | null {
  if (/^[A-E]$/i.test(value)) return value.toUpperCase()
  const saved = custom.find((p) => p.name.toLowerCase() === value.toLowerCase())
  if (saved) return "c:" + saved.name
  const steps = normalizeSteps(value)
  if (steps.length >= 2 && isValidSteps(steps)) return "i:" + steps
  return null
}

/** The pattern for an id. Unknown ids, such as a deleted custom pattern, fall back to A. */
export function getPattern(
  id: PatternId | null | undefined,
  custom: readonly CustomPattern[]
): Pattern {
  if (id && isPresetId(id)) {
    return { id, kind: "preset", ...PRESETS[id], runsOn: false }
  }
  if (id?.startsWith("c:")) {
    const saved = custom.find((p) => p.name === id.slice(2))
    if (saved) {
      return { id, kind: "custom", name: saved.name, steps: saved.steps, runsOn: true }
    }
  }
  if (id?.startsWith("i:")) {
    return { id, kind: "inline", name: "Chart pattern", steps: id.slice(2), runsOn: true }
  }
  return getPattern("A", custom)
}

export const isPick = (step: string): boolean =>
  step === "B" || (step >= "1" && step <= "6")

export function stepWord(step: string): string {
  if (step === "D") return "down"
  if (step === "U") return "up"
  if (step === ".") return "miss"
  if (step === "B") return "pick the bass note"
  return `pick string ${step}`
}

/** "1 & 2 & 3 &" for a bar of the given number of beats, one label per eighth note. */
export function slotLabels(beats: number): string[] {
  const labels: string[] = []
  for (let i = 1; i <= beats; i++) labels.push(String(i), "&")
  return labels
}

/**
 * The step a pattern plays at an eighth-note slot. `barInSection` counts bars from the
 * section's first bar, which only matters for patterns that run on across bar lines.
 */
export function stepOf(
  p: Pattern,
  barInSection: number,
  slot: number,
  slotsPerBar: number
): string {
  if (!p.runsOn) return p.steps[slot % p.steps.length]
  const phase = barInSection * slotsPerBar + slot
  return p.steps[phase % p.steps.length]
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)

/** How many bars a pattern takes to start on beat 1 again. */
export function barsUntilRealigned(steps: string, slotsPerBar: number): number {
  return steps.length / gcd(steps.length, slotsPerBar)
}
