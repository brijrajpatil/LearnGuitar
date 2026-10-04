import { LEVELS, type Level } from "@/core/timeline/arrangement"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/select"
import { useAppState, useController } from "@/ui/hooks/use-app"

export const LEVEL_INFO: Record<Level, { name: string; about: string }> = {
  beginner: { name: "Beginner", about: "One downstroke on every beat, so you can focus on the chord changes." },
  arranged: { name: "Arranged", about: "The strum pattern the chart gives each section." },
  record: { name: "Record", about: "The part as played on the record, where the chart has it." },
}

/** The song's level, from easy to the recorded version, with what each one means. */
export function LevelSelect() {
  const app = useController()
  const { settings } = useAppState()
  return (
    <Select
      aria-label="Level"
      selectedKey={settings.level}
      onSelectionChange={(key) => {
        if (key) app.setLevel(key as Level)
      }}
    >
      <SelectTrigger size="sm" className="w-auto">
        <span className="text-muted-foreground">Level</span>
        <SelectValue>{({ selectedText }) => selectedText}</SelectValue>
      </SelectTrigger>
      <SelectContent className="w-80" placement="bottom end">
        <SelectGroup>
          {LEVELS.map((level) => (
            <SelectItem key={level} id={level} textValue={LEVEL_INFO[level].name}>
              <span className="flex flex-col gap-0.5 whitespace-normal">
                <span>{LEVEL_INFO[level].name}</span>
                <span className="text-xs font-normal text-muted-foreground">{LEVEL_INFO[level].about}</span>
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
