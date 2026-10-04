import { cn } from "@/lib/utils"

/**
 * One pattern step as a symbol: an arrow for a strum, a dot for a miss, a numbered
 * ring for a pick. Everything draws in currentColor, so it reads on the lit gradient
 * slot as well as on a plain one. `silent` marks a pick on a string the chord mutes.
 */
export function StepSymbol({ step, silent, className }: { step: string; silent?: boolean; className?: string }) {
  const cls = cn("h-full w-auto", className)
  if (step === "D" || step === "U") {
    return (
      <svg viewBox="0 0 40 64" className={cls} aria-hidden="true">
        <path d={step === "D" ? "M15 3h10v33h11L20 61 4 36h11z" : "M15 61h10V28h11L20 3 4 28h11z"} fill="currentColor" />
      </svg>
    )
  }
  if (step === ".") {
    return (
      <svg viewBox="0 0 40 64" className={cls} aria-hidden="true">
        <circle cx="20" cy="32" r="5" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 40 64" className={cls} aria-hidden="true">
      <circle
        cx="20"
        cy="32"
        r="16"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeDasharray={silent ? "4 4" : undefined}
      />
      <text x="20" y="40" textAnchor="middle" fontSize={step === "B" ? 19 : 22} fontWeight={700} fill="currentColor">
        {step}
      </text>
    </svg>
  )
}

/** The color for a step on a plain slot: misses and silent picks are faint, the rest is ink. */
export function stepColor(step: string, silent = false): string {
  return step === "." || silent ? "text-dim" : "text-foreground"
}
