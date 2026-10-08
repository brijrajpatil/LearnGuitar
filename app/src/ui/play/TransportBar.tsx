import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon } from "lucide-react"
import { Button } from "@/ui/components/button"
import { Tooltip, TooltipTrigger } from "@/ui/components/tooltip"
import { useController, useTransport } from "@/ui/hooks/use-app"
import { LoopButton } from "@/ui/play/LoopButton"
import { SpeedControl } from "@/ui/play/SpeedControl"
import { SpeedUpProgress } from "@/ui/play/SpeedUp"

/**
 * Play, the loop and the speed. It's the last row of the window, so Play and Speed are
 * always in reach.
 */
export function TransportBar() {
  const app = useController()
  const t = app.transport
  const view = useTransport()
  const playing = view.state !== "stopped"

  return (
    // In windows under 22rem tall (a phone sideways, or 400% zoom), the whole page scrolls
    // and this sits at the end of it instead of covering the screen.
    <section aria-label="Playback" className="shrink-0 border-t border-border bg-card">
      <div className="mx-auto flex max-w-app flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 short:py-2 sm:px-6">
        <div className="flex items-center gap-2">
          <TooltipTrigger>
            <Button variant="outline" size="icon-lg" aria-label="Previous section" onPress={() => t.prevSection()}>
              <SkipBackIcon />
            </Button>
            <Tooltip>Previous section (←)</Tooltip>
          </TooltipTrigger>
          <Button variant="play" size="xl" onPress={() => t.toggle()}>
            {playing ? <PauseIcon data-icon="inline-start" /> : <PlayIcon data-icon="inline-start" />}
            {playing ? "Pause" : "Play"}
          </Button>
          <TooltipTrigger>
            <Button variant="outline" size="icon-lg" aria-label="Next section" onPress={() => t.nextSection()}>
              <SkipForwardIcon />
            </Button>
            <Tooltip>Next section (→)</Tooltip>
          </TooltipTrigger>
        </div>

        <LoopButton />
        <SpeedControl />
        <SpeedUpProgress />
      </div>
    </section>
  )
}
