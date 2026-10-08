import { useState } from "react"
import { MinusIcon, PlusIcon } from "lucide-react"
import { CHART_TEMPO_MAX, CHART_TEMPO_MIN } from "@/core/chart/parse"
import { cn } from "@/lib/utils"
import type { SpeedUnit } from "@/data/repository"
import { clampTempo, TEMPO_MAX, TEMPO_MIN } from "@/practice/trainer"
import { Button } from "@/ui/components/button"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/ui/components/field"
import { Popover, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/ui/components/popover"
import { Slider } from "@/ui/components/slider"
import { ToggleGroup, ToggleGroupItem } from "@/ui/components/toggle-group"
import { useAppState, useController, useTransport } from "@/ui/hooks/use-app"
import { NumberInput } from "@/ui/play/NumberInput"
import { SpeedUpSettings } from "@/ui/play/SpeedUp"

const QUICK_PICKS = [60, 75, 90, 100]

/** Type the speed in BPM or as a share of the record's (decision 0020). */
function TypedSpeed({ record }: { record: number | null }) {
  const app = useController()
  const { settings } = useAppState()
  const { tempo } = useTransport()
  const [outside, setOutside] = useState(false)
  const unit: SpeedUnit = record ? settings.speedUnit : "bpm"
  const percent = record ? Math.round((tempo / record) * 100) : null
  const set = (bpm: number) => {
    setOutside(bpm < TEMPO_MIN || bpm > TEMPO_MAX)
    app.transport.setTempo(clampTempo(bpm))
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {unit === "percent" && record ? (
          <NumberInput
            label="Speed in % of the record"
            value={percent}
            min={Math.ceil((TEMPO_MIN / record) * 100)}
            max={Math.floor((TEMPO_MAX / record) * 100)}
            onCommit={(n) => set((record * n) / 100)}
          />
        ) : (
          <NumberInput label="Speed in BPM" value={tempo} min={TEMPO_MIN} max={TEMPO_MAX} onCommit={set} />
        )}
        {record ? (
          <ToggleGroup
            aria-label="Speed unit"
            variant="segment"
            size="sm"
            spacing={1}
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={[unit]}
            onSelectionChange={(keys) => {
              const [next] = [...keys] as SpeedUnit[]
              if (next) app.setSpeedUnit(next)
            }}
          >
            <ToggleGroupItem id="bpm">BPM</ToggleGroupItem>
            <ToggleGroupItem id="percent">% of record</ToggleGroupItem>
          </ToggleGroup>
        ) : (
          <span className="text-muted-foreground">BPM</span>
        )}
        {unit === "percent" && <span className="text-muted-foreground tabular-nums">{tempo} BPM</span>}
      </div>
      {outside && (
        <p className="text-sm text-muted-foreground">
          The app plays from {TEMPO_MIN} to {TEMPO_MAX} BPM, so the speed stopped at {tempo}.
        </p>
      )}
    </div>
  )
}

/** The record's speed, from the chart's tempo line. Changing it saves the chart. */
function RecordSpeed({ record }: { record: number | null }) {
  const app = useController()
  return (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor="record-speed">Record's speed (BPM)</FieldLabel>
        {!record && <FieldDescription>Not in the chart yet. Set it to see your speed as a share of the record's.</FieldDescription>}
      </FieldContent>
      <NumberInput
        id="record-speed"
        value={record}
        min={CHART_TEMPO_MIN}
        max={CHART_TEMPO_MAX}
        onCommit={(n) => {
          if (n !== record) app.setRecordTempo(n)
        }}
      />
    </Field>
  )
}

/** The playing speed, compared with the record's, with an explanation of how to use it. */
export function SpeedControl() {
  const app = useController()
  const t = app.transport
  const { song, settings } = useAppState()
  const { tempo } = useTransport()
  const record = song.tempo
  const percent = record ? Math.round((tempo / record) * 100) : null
  const mark = record ? Math.min(1, Math.max(0, (record - TEMPO_MIN) / (TEMPO_MAX - TEMPO_MIN))) : null
  // The unit you type in comes first.
  const byPercent = percent !== null && settings.speedUnit === "percent"

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
          <span className="text-lg font-semibold tabular-nums">{byPercent ? `${percent}%` : `${tempo} BPM`}</span>
          {percent !== null && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {byPercent ? `of the record, ${tempo} BPM` : `${percent}% of the record`}
            </span>
          )}
        </Button>
        <Popover placement="top" className="w-96">
          <PopoverHeader>
            <PopoverTitle>Speed</PopoverTitle>
            <PopoverDescription>Speed is how many beats play each minute (BPM).</PopoverDescription>
          </PopoverHeader>
          <TypedSpeed record={record} />
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
          {record && (
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
          )}
          <p className="text-muted-foreground">
            Slow down until every chord change is on time. Then speed up a few BPM at a time, or let the loop do it for you.
          </p>
          <RecordSpeed record={record} />
          <SpeedUpSettings />
        </Popover>
      </PopoverTrigger>
      <Button variant="outline" size="icon-sm" aria-label="Faster" onPress={() => t.nudgeTempo(1)}>
        <PlusIcon />
      </Button>
    </div>
  )
}
