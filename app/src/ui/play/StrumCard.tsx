import { useState } from "react"
import { cn } from "@/lib/utils"
import { isPick, PRESET_IDS, PRESETS, slotLabels, stepWord } from "@/core/pattern/patterns"
import { pickString } from "@/core/theory/chords"
import { chordAt, hasOverride, sectionOf, stepAt, voicingOf } from "@/core/timeline/arrangement"
import { upcoming } from "@/core/timeline/upcoming"
import { Card } from "@/ui/components/card"
import { Toggle } from "@/ui/components/toggle"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger } from "@/ui/components/select"
import { useAppState, useController, useTransport } from "@/ui/hooks/use-app"
import { PatternDialog } from "@/ui/patterns/PatternDialog"
import { LevelSelect } from "@/ui/play/LevelSelect"
import { useLyrics } from "@/ui/play/LyricCard"
import { hasLyrics } from "@/core/timeline/lyrics"
import { patternTitle, plural } from "@/ui/play/display"
import { StepSymbol, stepColor } from "@/ui/play/StepSymbol"

const AUTO = "__auto"
const NEW_PATTERN = "__new"

/** What's coming, in one line: a pattern change, the loop, the next section or the end. */
function UpNext() {
  const { arrangement: arr } = useAppState()
  const view = useTransport()
  const u = upcoming(arr, view.bar, {
    loop: view.loop,
    pass: view.state === "stopped" ? null : view.pass,
    trainer: { ...view.trainer, target: view.target },
    tempo: view.tempo,
  })
  if (u.kind === "pattern-change") {
    return (
      <p
        key={view.bar}
        className="animate-soon rounded-full bg-tint px-3 py-1 font-semibold text-foreground ring-2 ring-primary"
        aria-live="polite"
      >
        New pattern next bar: {patternTitle(u.pattern)}
      </p>
    )
  }
  let text: string
  if (u.kind === "loop") text = `Looping ${u.section}${u.pass !== null ? `, time ${u.pass} through` : ""}`
  else if (u.kind === "up-next") {
    text = `Next: ${u.section} ${u.barsLeft === 1 ? "next bar" : `in ${plural(u.barsLeft, "bar")}`}`
    if (!u.samePattern) text += `, new pattern ${patternTitle(u.pattern)}`
  } else text = u.barsLeft === 1 ? "Song ends after this bar" : `Song ends in ${plural(u.barsLeft, "bar")}`
  return <p className="text-muted-foreground">{text}</p>
}

/** The strum strip: one slot per eighth note, lit as it plays, and the section's pattern. */
export function StrumCard() {
  const app = useController()
  const { arrangement: arr, settings, customPatterns } = useAppState()
  const view = useTransport()
  const lyrics = useLyrics()
  const [dialogOpen, setDialogOpen] = useState(false)
  if (!arr.song.bars[view.bar]) return <div />
  const sung = new Map(lyrics?.words.map((w) => [w.slot, w.text]))
  const si = sectionOf(arr, view.bar)
  const sec = arr.song.sections[si]
  const pattern = arr.patterns[si]
  const overridden = hasOverride(arr, si)
  const counting = view.state === "count-in"
  const labels = slotLabels(arr.song.beatsPerBar)

  const notes: string[] = []
  if (overridden) notes.push("your choice")
  else if (settings.level === "record" && !sec.record) notes.push("no record figure here, so the arranged pattern plays")
  if (pattern.runsOn && pattern.steps.length % arr.slotsPerBar !== 0) notes.push("runs on across bars")

  return (
    <Card aria-label="Strum" role="region" className="gap-3 px-5 py-4 short:gap-2 short:py-3">
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
        <p className="min-w-0 truncate">
          <span className="text-muted-foreground">Strum </span>
          <span className="font-semibold">{patternTitle(pattern)}</span>
          {notes.length > 0 && <span className="text-muted-foreground"> ({notes.join(", ")})</span>}
        </p>
        <div className="flex-1" />
        <UpNext />
        {hasLyrics(arr.song) && (
          <Toggle variant="outline" size="sm" isSelected={settings.lyrics} onChange={(on) => app.setLyricsShown(on)}>
            Lyrics
          </Toggle>
        )}
        <LevelSelect />
        <Select
          aria-label={`Strum pattern for ${sec.name}`}
          selectedKey={overridden ? pattern.id : AUTO}
          onSelectionChange={(key) => {
            if (key === NEW_PATTERN) setDialogOpen(true)
            else if (key === AUTO) app.setOverride(si, null)
            else if (key !== null) app.setOverride(si, String(key))
          }}
        >
          <SelectTrigger size="sm" className="w-auto">
            Change pattern
          </SelectTrigger>
          <SelectContent className="min-w-80" placement="bottom end">
            <SelectGroup>
              <SelectItem id={AUTO} textValue="The level's pattern">
                The level's pattern: {patternTitle(arr.autoPatterns[si])}
              </SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Presets</SelectLabel>
              {PRESET_IDS.map((id) => (
                <SelectItem key={id} id={id} textValue={PRESETS[id].name}>
                  {PRESETS[id].name}
                  <code className="ml-auto pl-3 font-mono text-muted-foreground">{PRESETS[id].steps}</code>
                </SelectItem>
              ))}
            </SelectGroup>
            {customPatterns.length > 0 && (
              <>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Yours</SelectLabel>
                  {customPatterns.map((p) => (
                    <SelectItem key={p.name} id={"c:" + p.name} textValue={p.name}>
                      {p.name}
                      <code className="ml-auto pl-3 font-mono text-muted-foreground">{p.steps}</code>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </>
            )}
            <SelectSeparator />
            <SelectGroup>
              <SelectItem id={NEW_PATTERN}>Write a new pattern…</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <ol aria-label="This bar's strums" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${arr.slotsPerBar}, minmax(0, 1fr))` }}>
        {labels.map((label, k) => {
          const step = stepAt(arr, view.bar, k)
          const voicing = isPick(step) ? voicingOf(arr, chordAt(arr, view.bar, k)) : null
          const silent = !!voicing && pickString(voicing, step) < 0
          const lit = view.slot === k && view.state !== "stopped"
          const onBeat = k % 2 === 0
          return (
            <li
              key={k}
              aria-current={lit || undefined}
              className={cn(
                "flex flex-col items-center justify-between rounded-slot bg-slot pt-1.5 roomy:h-slot-lg",
                // With lyrics, the slots take their compact size below roomy windows, to make room for the words.
                lyrics ? "h-slot-sm pb-2" : "h-slot pb-2.5 short:h-slot-sm short:pb-2",
                lit && "bg-emphasis"
              )}
            >
              <span className="sr-only">
                {label}: {stepWord(step)}
                {silent ? ", that string isn't in this chord" : ""}
                {sung.has(k) ? `, sing "${sung.get(k)}"` : ""}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "text-stage-slot",
                  onBeat ? "font-semibold text-foreground" : "text-muted-foreground",
                  lit && "text-emphasis-foreground"
                )}
              >
                {label}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "flex min-h-0 flex-1 items-center justify-center",
                  lit ? "text-emphasis-foreground" : counting ? "text-dim" : stepColor(step, silent)
                )}
              >
                <StepSymbol
                  step={step}
                  silent={silent}
                  className={cn(lyrics ? "h-strum-symbol-sm" : "h-strum-symbol short:h-strum-symbol-sm", "roomy:h-strum-symbol-lg")}
                />
              </span>
            </li>
          )
        })}
      </ol>
      {lyrics && (
        // The word sung on each eighth note, under its slot. Screen readers hear it with the slot.
        <div aria-hidden="true" className="-mt-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${arr.slotsPerBar}, minmax(0, 1fr))` }}>
          {labels.map((_, k) => (
            <span
              key={k}
              className={cn(
                "truncate text-center text-stage-word",
                view.slot === k && view.state === "playing" ? "font-semibold" : "font-medium"
              )}
            >
              {sung.get(k) ?? " "}
            </span>
          ))}
        </div>
      )}
      {dialogOpen && <PatternDialog isOpen onOpenChange={setDialogOpen} section={si} />}
    </Card>
  )
}
