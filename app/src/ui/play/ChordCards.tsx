import { cn } from "@/lib/utils"
import { chordAt, voicingOf } from "@/core/timeline/arrangement"
import { Card } from "@/ui/components/card"
import { useAppState, useTransport } from "@/ui/hooks/use-app"
import { ChordDiagram } from "@/ui/play/ChordDiagram"
import { ChordName } from "@/ui/play/ChordName"
import { nextDisplay, nowSlot } from "@/ui/play/display"

/**
 * The chord to play now, large, and the next one, quieter. The cards take the height
 * the rest of the screen leaves. Each card is a size container, so the chord name and
 * diagram fit its width and height, between rem limits that follow browser zoom.
 */
export function ChordCards() {
  const { arrangement: arr } = useAppState()
  const view = useTransport()
  if (!arr.song.bars[view.bar]) return <div />
  const now = chordAt(arr, view.bar, nowSlot(view))
  const spans = arr.barChords[view.bar]
  const next = nextDisplay(arr, view)
  const nextChord = next.change.kind === "chord" ? next.change.chord : null

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,2fr)_minmax(0,1fr)] gap-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] sm:grid-rows-1">
      <Card aria-label="Now" role="region" className="@container-size min-h-0 gap-0 px-5 py-4">
        <div className="flex min-h-6 items-baseline gap-3 text-muted-foreground">
          <span>Now</span>
          {spans.length > 1 && <span className="truncate">This bar: {spans.map((s) => s.chord).join(", ")}</span>}
        </div>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[4cqi] @[22rem]:flex-row">
          <div className="text-stage-chord-column font-semibold tracking-tight whitespace-nowrap @[22rem]:text-stage-chord">
            <ChordName name={now} />
          </div>
          <div className="w-diagram-column shrink-0 @[22rem]:w-diagram-now">
            <ChordDiagram voicing={voicingOf(arr, now)} tone="now" />
          </div>
        </div>
      </Card>

      <Card
        aria-label="Next"
        role="region"
        data-soon={next.soon || undefined}
        className={cn(
          "@container-size min-h-0 gap-0 bg-tint px-5 py-4 ring-0 shadow-none",
          "data-soon:animate-soon data-soon:ring-2 data-soon:ring-primary"
        )}
      >
        <div className="flex min-h-6 items-baseline justify-between gap-3">
          <span className="text-muted-foreground">Next</span>
          <span className={cn("text-stage-countdown font-semibold tabular-nums", next.soon && "text-primary")}>
            {next.countdown}
          </span>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center gap-[5cqi]">
          {nextChord ? (
            <>
              <div className="text-stage-next font-medium tracking-tight whitespace-nowrap">
                <ChordName name={nextChord} />
              </div>
              <div className="w-diagram-next shrink-0">
                <ChordDiagram voicing={voicingOf(arr, nextChord)} tone="next" />
              </div>
            </>
          ) : (
            <span className="text-stage-countdown font-medium text-muted-foreground">
              {next.change.kind === "end" ? "End of song" : "Same chord all the way round"}
            </span>
          )}
        </div>
      </Card>
    </div>
  )
}
