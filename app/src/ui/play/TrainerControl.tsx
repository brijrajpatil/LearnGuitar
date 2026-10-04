import { TEMPO_MAX, TEMPO_MIN, TRAINER_STEP_MAX, TRAINER_STEP_MIN } from "@/practice/trainer"
import { Button } from "@/ui/components/button"
import { Field, FieldGroup, FieldLabel } from "@/ui/components/field"
import { Popover, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/ui/components/popover"
import { Progress } from "@/ui/components/progress"
import { useAppState, useController, useTransport } from "@/ui/hooks/use-app"
import { NumberInput } from "@/ui/play/NumberInput"

/** Build speed: where it started, where it's going, and how far it has got. */
export function TrainerControl() {
  const app = useController()
  const { settings, songId } = useAppState()
  const view = useTransport()
  const start = settings.start[songId] ?? view.tempo
  const goal = view.target
  const span = goal - start
  const done = span <= 0 ? 100 : Math.round(Math.min(1, Math.max(0, (view.tempo - start) / span)) * 100)

  return (
    <div role="group" aria-label="Build speed" className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="text-muted-foreground">Speed</span>
      <span className="text-lg font-semibold tabular-nums">{view.tempo} BPM</span>
      <div className="flex w-60 flex-col gap-1">
        <Progress value={done} aria-label={`Build speed from ${start} to ${goal} BPM`} className="gap-0" />
        <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
          From {start} to {goal} BPM, +{view.trainer.step} each time through
        </span>
      </div>
      <PopoverTrigger>
        <Button variant="outline" size="sm">
          Change
        </Button>
        <Popover placement="top" className="w-80">
          <PopoverHeader>
            <PopoverTitle>Build speed</PopoverTitle>
            <PopoverDescription>
              The section loops. Each time it comes round, the speed goes up, until it reaches your goal.
            </PopoverDescription>
          </PopoverHeader>
          <FieldGroup className="gap-3">
            <Field orientation="horizontal">
              <FieldLabel htmlFor="trainer-start">Start at (BPM)</FieldLabel>
              <NumberInput id="trainer-start" value={start} min={TEMPO_MIN} max={TEMPO_MAX} onCommit={(n) => app.setTrainerStart(n)} />
            </Field>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="trainer-goal">Goal (BPM)</FieldLabel>
              <NumberInput id="trainer-goal" value={goal} min={TEMPO_MIN} max={TEMPO_MAX} onCommit={(n) => app.setTarget(n)} />
            </Field>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="trainer-step">Add each time through (BPM)</FieldLabel>
              <NumberInput
                id="trainer-step"
                value={view.trainer.step}
                min={TRAINER_STEP_MIN}
                max={TRAINER_STEP_MAX}
                onCommit={(n) => app.setTrainerStep(n)}
              />
            </Field>
          </FieldGroup>
          {goal <= start && <p className="text-sm text-muted-foreground">Set a goal faster than the start to build speed.</p>}
        </Popover>
      </PopoverTrigger>
    </div>
  )
}
