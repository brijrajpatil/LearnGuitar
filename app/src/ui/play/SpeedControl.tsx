import { MinusIcon, PlusIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { clampTempo, TEMPO_MAX, TEMPO_MIN } from "@/practice/trainer"
import { Button } from "@/ui/components/button"
import { Popover, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/ui/components/popover"
import { Slider } from "@/ui/components/slider"
import { useAppState, useController, useTransport } from "@/ui/hooks/use-app"

const QUICK_PICKS = [60, 75, 90, 100]

/** The playing speed, compared with the record's, with an explanation of how to use it. */
export function SpeedControl() {
  const t = useController().transport
  const { song } = useAppState()
  const { tempo } = useTransport()
  const record = song.tempo
  const percent = record ? Math.round((tempo / record) * 100) : null
  const mark = record ? Math.min(1, Math.max(0, (record - TEMPO_MIN) / (TEMPO_MAX - TEMPO_MIN))) : null

  return (
    <div role="group" aria-label="Speed" className="flex items-center gap-2">
      <span className="text-muted-foreground max-sm:sr-only">Speed</span>
      <Button variant="outline" size="icon-sm" aria-label="Slower" onPress={() => t.nudgeTempo(-1)}>
        <MinusIcon />
      </Button>
      <PopoverTrigger>
        <Button
          variant="ghost"
          aria-label={`${tempo} BPM${percent !== null ? `, ${percent}% of the record` : ""}. Change speed`}
          className="h-auto flex-col items-start gap-0 rounded-2xl px-3 py-1"
        >
          <span className="text-lg font-semibold tabular-nums">{tempo} BPM</span>
          {percent !== null && <span className="text-xs text-muted-foreground tabular-nums">{percent}% of the record</span>}
        </Button>
        <Popover placement="top" className="w-88">
          <PopoverHeader>
            <PopoverTitle>Speed</PopoverTitle>
            <PopoverDescription>
              Speed is how many beats play each minute (BPM).
              {record ? ` The record plays this song at ${record} BPM.` : " This chart doesn't give the record's speed."}
            </PopoverDescription>
          </PopoverHeader>
          <p className="text-muted-foreground">
            Slow down until you can play every chord change on time. Then speed up a few BPM at a time, or let Build speed do it
            for you.
          </p>
          <div className="relative pt-2">
            <Slider aria-label="Speed in BPM" minValue={TEMPO_MIN} maxValue={TEMPO_MAX} value={tempo} onChange={(v) => t.setTempo(v as number)} />
            {mark !== null && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-0 h-2.5 w-0.5 -translate-x-1/2 rounded-full bg-foreground"
                style={{ left: `${mark * 100}%` }}
              />
            )}
          </div>
          {record ? (
            <div className="grid grid-cols-4 gap-2">
              {QUICK_PICKS.map((p) => {
                const bpm = clampTempo((record * p) / 100)
                const on = bpm === tempo
                return (
                  <Button
                    key={p}
                    variant="outline"
                    size="sm"
                    aria-pressed={on}
                    onPress={() => t.setTempo(bpm)}
                    className={cn("h-auto flex-col gap-0 py-1.5", on && "border-primary bg-tint")}
                  >
                    <span className="font-semibold">{p === 100 ? "Record" : `${p}%`}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{bpm} BPM</span>
                  </Button>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Add a line like tempo: 90 to the chart to compare with the record.</p>
          )}
        </Popover>
      </PopoverTrigger>
      <Button variant="outline" size="icon-sm" aria-label="Faster" onPress={() => t.nudgeTempo(1)}>
        <PlusIcon />
      </Button>
    </div>
  )
}
