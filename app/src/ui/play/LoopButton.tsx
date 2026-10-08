import { RepeatIcon, XIcon } from "lucide-react"
import { Kbd } from "@/ui/components/kbd"
import { Toggle } from "@/ui/components/toggle"
import { Tooltip, TooltipTrigger } from "@/ui/components/tooltip"
import { useAppState, useController, useTransport } from "@/ui/hooks/use-app"

/**
 * Loops the current section, or plays the whole song again (decision 0020). The song map
 * loops any section too.
 */
export function LoopButton() {
  const app = useController()
  const { song } = useAppState()
  const view = useTransport()
  const looped = view.loop ? song.sections[view.loop.section]?.name : null
  return (
    <TooltipTrigger delay={500}>
      <Toggle
        variant="outline"
        size="lg"
        isSelected={looped !== null}
        onChange={(on) => app.setLoop(on)}
        className="max-w-64 data-selected:border-primary data-selected:bg-tint"
      >
        <RepeatIcon data-icon="inline-start" />
        <span className="truncate">{looped !== null ? `Looping ${looped}` : "Loop section"}</span>
        {looped !== null && <XIcon data-icon="inline-end" />}
      </Toggle>
      <Tooltip>
        {looped !== null ? "Play the whole song" : "Loop this section"} <Kbd>L</Kbd>
      </Tooltip>
    </TooltipTrigger>
  )
}
