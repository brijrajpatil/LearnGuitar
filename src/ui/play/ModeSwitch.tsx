import { CircleHelpIcon } from "lucide-react"
import { PRACTICE_MODES, type PracticeMode } from "@/data/repository"
import { Button } from "@/ui/components/button"
import { Popover, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/ui/components/popover"
import { ToggleGroup, ToggleGroupItem } from "@/ui/components/toggle-group"
import { Tooltip, TooltipTrigger } from "@/ui/components/tooltip"
import { useAppState, useController } from "@/ui/hooks/use-app"

export const MODE_INFO: Record<PracticeMode, { name: string; short: string; about: string }> = {
  learn: { name: "Learn a section", short: "Learn", about: "Loop one section slowly until every change is clean." },
  speed: { name: "Build speed", short: "Build speed", about: "Loop the section and speed up a little each time through." },
  song: { name: "Play the song", short: "Play song", about: "Play from start to end, as you would with the record." },
}

/** What you're practising. Each mode shows only the controls it needs. */
export function ModeSwitch() {
  const app = useController()
  const { settings } = useAppState()
  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      <ToggleGroup
        aria-label="What are you practising?"
        variant="segment"
        size="sm"
        spacing={1}
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[settings.mode]}
        onSelectionChange={(keys) => {
          const [mode] = [...keys] as PracticeMode[]
          if (mode) app.setMode(mode)
        }}
      >
        {PRACTICE_MODES.map((mode) => (
          <TooltipTrigger key={mode} delay={500}>
            <ToggleGroupItem id={mode}>
              {/* Phones and high zoom get the short name, so the three still fit in one row. */}
              <span className="sm:hidden">{MODE_INFO[mode].short}</span>
              <span className="max-sm:hidden">{MODE_INFO[mode].name}</span>
            </ToggleGroupItem>
            <Tooltip>{MODE_INFO[mode].about}</Tooltip>
          </TooltipTrigger>
        ))}
      </ToggleGroup>
      <PopoverTrigger>
        <Button variant="ghost" size="icon-sm" aria-label="How to practise">
          <CircleHelpIcon />
        </Button>
        <Popover placement="bottom" className="w-96">
          <PopoverHeader>
            <PopoverTitle>How to practise a song</PopoverTitle>
          </PopoverHeader>
          <ol className="flex list-decimal flex-col gap-2 pl-5 leading-relaxed">
            <li>
              <b className="font-semibold">Learn a section.</b> Pick a section in the song map. Slow the speed down until you can
              play every chord change on time.
            </li>
            <li>
              <b className="font-semibold">Build speed.</b> The section loops, and the speed goes up a few BPM each time through,
              up to your goal.
            </li>
            <li>
              <b className="font-semibold">Play the song.</b> Play it from start to end at the speed you've reached. When that
              feels easy, try the next level.
            </li>
          </ol>
        </Popover>
      </PopoverTrigger>
    </div>
  )
}
