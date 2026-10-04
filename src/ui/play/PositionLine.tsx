import { cn } from "@/lib/utils"
import { useAppState, useTransport } from "@/ui/hooks/use-app"

/** Where you are: the section, the bar within it, and the count-in or the bar's cue. */
export function PositionLine() {
  const { song } = useAppState()
  const view = useTransport()
  const bar = song.bars[view.bar]
  if (!bar) return <div className="min-h-10" />
  const sec = song.sections[bar.section]
  const length = sec.end - sec.start
  const inSection = view.bar - sec.start + 1
  const counting = view.state === "count-in" && view.countIn >= 0
  const beat = Math.floor(view.countIn / 2)

  return (
    <section aria-label="Position" className="flex min-h-10 flex-wrap items-center gap-x-4 gap-y-2">
      <h2 className="text-stage-section font-semibold">{sec.name}</h2>
      <p className="text-muted-foreground tabular-nums">
        Bar {inSection} of {length}
      </p>
      <div
        role="progressbar"
        aria-label={`Bar ${inSection} of ${length} in ${sec.name}`}
        aria-valuemin={1}
        aria-valuemax={length}
        aria-valuenow={inSection}
        className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-border"
      >
        <div className="h-full rounded-full bg-emphasis" style={{ width: `${(inSection / length) * 100}%` }} />
      </div>
      <div className="flex min-h-9 items-center gap-2" aria-live="polite">
        {counting ? (
          <>
            <span className="text-muted-foreground">Count-in</span>
            {Array.from({ length: song.beatsPerBar }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "grid size-9 place-items-center rounded-full bg-secondary font-semibold text-muted-foreground tabular-nums",
                  i === beat && "bg-emphasis text-emphasis-foreground"
                )}
              >
                {i + 1}
              </span>
            ))}
          </>
        ) : (
          bar.cue && <p className="max-w-[40ch] truncate text-foreground italic">“{bar.cue}”</p>
        )}
      </div>
    </section>
  )
}
