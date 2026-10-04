import { useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { barsUntilRealigned, normalizeSteps, slotLabels } from "@/core/pattern/patterns"
import { Button } from "@/ui/components/button"
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/components/dialog"
import { Field, FieldGroup, FieldLabel } from "@/ui/components/field"
import { Input } from "@/ui/components/input"
import { useAppState, useController } from "@/ui/hooks/use-app"
import { plural } from "@/ui/play/display"
import { StepSymbol, stepColor } from "@/ui/play/StepSymbol"

/**
 * Write a strum or pick pattern, see how it falls across two bars, and save it.
 * Mount it when it opens, so it starts empty each time.
 */
export function PatternDialog({
  isOpen,
  onOpenChange,
  section,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  section: number
}) {
  const app = useController()
  const { song, customPatterns } = useAppState()
  const [name, setName] = useState("")
  const [steps, setSteps] = useState("")

  const save = () => {
    const error = app.saveCustomPattern(name, steps, section)
    if (error) toast.error(error)
    else onOpenChange(false)
  }

  const seq = normalizeSteps(steps)
  const spb = song.beatsPerBar * 2
  const labels = slotLabels(song.beatsPerBar)
  const valid = /^[DU.1-6B]+$/.test(seq)
  const bars = valid && seq ? barsUntilRealigned(seq, spb) : 0
  const beats = seq.length / 2

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      className="sm:max-w-2xl"
    >
      <DialogHeader>
        <DialogTitle>Custom strum pattern</DialogTitle>
        <DialogDescription>
          One character per eighth note: <b>D</b> strum down, <b>U</b> strum up, <b>.</b> miss (the hand moves, no strings),{" "}
          <b>1</b> to <b>6</b> pick one string (1 = high E, 6 = low E), <b>B</b> pick the chord's bass note. Any length. It runs on
          across bar lines instead of restarting each bar, so odd lengths work.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className="flex-row gap-3">
        <Field className="flex-1">
          <FieldLabel htmlFor="cp-name">Name</FieldLabel>
          <Input id="cp-name" maxLength={28} placeholder="Record figure" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field className="flex-[2]">
          <FieldLabel htmlFor="cp-steps">Pattern</FieldLabel>
          <Input
            id="cp-steps"
            className="font-mono tracking-widest"
            placeholder="D.DU.UDU.U or B323B323"
            autoComplete="off"
            autoFocus
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save()
            }}
          />
        </Field>
      </FieldGroup>

      <div className="flex flex-col gap-1.5" aria-live="polite">
        {seq && valid && (
          <div className="flex items-end gap-0.5" aria-hidden="true">
            {Array.from({ length: spb * 2 }, (_, k) => {
              const ch = seq[k % seq.length]
              return (
                <span key={k} className="contents">
                  {k === spb && <span className="mx-1 h-9 w-0.5 bg-border" />}
                  <span
                    className={cn(
                      "flex w-7 flex-col items-center gap-0.5 text-xs font-bold",
                      k % 2 === 0 ? "text-muted-foreground" : "text-dim"
                    )}
                  >
                    {labels[k % spb]}
                    <i
                      className={cn(
                        "grid h-9 w-6.5 place-items-center rounded-md bg-secondary",
                        stepColor(ch),
                        k % seq.length === 0 && "ring-2 ring-primary"
                      )}
                    >
                      <StepSymbol step={ch} className="h-5.5" />
                    </i>
                  </span>
                </span>
              )
            })}
          </div>
        )}
        <p className={cn("text-muted-foreground", seq && !valid && "text-destructive")}>
          {!seq
            ? "Type a pattern to see how it falls across two bars."
            : !valid
              ? "Use only D, U, . (dot), the digits 1 to 6, and B."
              : `${plural(seq.length, "slot")} (${beats} beat${beats === 1 ? "" : "s"}). ` +
                (bars === 1 ? "It lines up with every bar." : `It starts on beat 1 again every ${bars} bars. Outlined steps mark each restart.`)}
        </p>
      </div>

      <DialogFooter className="sm:justify-start">
        <Button onPress={save}>Save and use for this section</Button>
        <Button variant="outline" slot="close">
          Close
        </Button>
      </DialogFooter>

      <div className="flex max-h-40 flex-col gap-1.5 overflow-auto">
        {customPatterns.length === 0 ? (
          <p className="text-muted-foreground">No saved patterns yet.</p>
        ) : (
          customPatterns.map((p) => (
            <div key={p.name} className="flex items-center gap-2.5 rounded-2xl bg-card px-3 py-1.5">
              <b>{p.name}</b>
              <code className="flex-1 truncate font-mono tracking-wider text-muted-foreground">{p.steps}</code>
              <Button
                size="sm"
                variant="outline"
                onPress={() => {
                  app.setOverride(section, "c:" + p.name)
                  onOpenChange(false)
                }}
              >
                Use here
              </Button>
              <Button
                size="sm"
                variant="outline"
                onPress={() => {
                  setName(p.name)
                  setSteps(p.steps)
                }}
              >
                Edit
              </Button>
              <Button size="sm" variant="destructive" onPress={() => app.deleteCustomPattern(p.name)}>
                Delete
              </Button>
            </div>
          ))
        )}
      </div>
    </Dialog>
  )
}
