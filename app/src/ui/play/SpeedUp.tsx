import { TEMPO_MAX, TEMPO_MIN, TRAINER_STEP_MAX, TRAINER_STEP_MIN } from "@/practice/trainer"
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/ui/components/field"
import { Progress } from "@/ui/components/progress"
import { Switch } from "@/ui/components/switch"
import { useAppState, useController, useTransport } from "@/ui/hooks/use-app"
import { NumberInput } from "@/ui/play/NumberInput"

/** Where speeding up started and where it's going, for this song. */
function useSpeedUp() {
  const { settings, songId } = useAppState()
  const view = useTransport()
  const start = settings.start[songId] ?? view.tempo
  const goal = view.target
  const span = goal - start
  const done = span <= 0 ? 100 : Math.round(Math.min(1, Math.max(0, (view.tempo - start) / span)) * 100)
  return { on: settings.speedUp, looping: view.loop !== null, start, goal, step: view.trainer.step, done }
}

/** The speed-up switch and its numbers, in the Speed popover (decision 0020). */
export function SpeedUpSettings() {
  const app = useController()
  const s = useSpeedUp()
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel>Speed up each time through the loop</FieldLabel>
        </FieldContent>
        <Switch isSelected={s.on} onChange={(on) => app.setSpeedUp(on)} aria-label="Speed up each time through the loop" />
      </Field>
      {s.on && (
        <>
          <FieldGroup className="gap-3">
            <Field orientation="horizontal">
              <FieldLabel htmlFor="trainer-start">Start at (BPM)</FieldLabel>
              <NumberInput id="trainer-start" value={s.start} min={TEMPO_MIN} max={TEMPO_MAX} onCommit={(n) => app.setTrainerStart(n)} />
            </Field>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="trainer-goal">Goal (BPM)</FieldLabel>
              <NumberInput id="trainer-goal" value={s.goal} min={TEMPO_MIN} max={TEMPO_MAX} onCommit={(n) => app.setTarget(n)} />
            </Field>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="trainer-step">Add each time through (BPM)</FieldLabel>
              <NumberInput
                id="trainer-step"
                value={s.step}
                min={TRAINER_STEP_MIN}
                max={TRAINER_STEP_MAX}
                onCommit={(n) => app.setTrainerStep(n)}
              />
            </Field>
          </FieldGroup>
          {s.goal <= s.start && <p className="text-sm text-muted-foreground">Set a goal faster than the start to speed up.</p>}
          {!s.looping && (
            <p className="text-sm text-muted-foreground">It works while a section loops. Loop one with Loop section or the song map.</p>
          )}
        </>
      )}
    </div>
  )
}

/** How far speeding up has got, beside the speed while a section loops. */
export function SpeedUpProgress() {
  const s = useSpeedUp()
  if (!s.on || !s.looping) return null
  return (
    <div className="flex w-60 flex-col gap-1">
      <Progress value={s.done} aria-label={`Speeding up from ${s.start} to ${s.goal} BPM`} className="gap-0" />
      <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
        From {s.start} to {s.goal} BPM, +{s.step} each time through
      </span>
    </div>
  )
}
