import { cn } from "@/lib/utils"
import { songSeconds } from "@/core/song/types"
import { useAppState, useController, useTransport } from "@/ui/hooks/use-app"
import { formatTime, patternTitle, plural } from "@/ui/play/display"

/**
 * Every bar of the song in a row, grouped by section. Bars played so far fill in.
 * Click a bar to jump there, or a section name to loop it.
 */
export function SongMap() {
  const app = useController()
  const { arrangement: arr, editorOpen, settings } = useAppState()
  const view = useTransport()
  const { song } = arr
  const elapsed = (view.bar * song.beatsPerBar * 60) / view.tempo

  return (
    <div className="flex items-end gap-4">
      <nav aria-label="Song map" className="flex min-w-0 flex-1 gap-1.5">
        {song.sections.map((sec, si) => {
          const n = sec.end - sec.start
          const looped = view.loop?.section === si
          const action = looped ? "Play the whole song" : "Loop this section"
          return (
            <div key={si} className="flex min-w-12 flex-col gap-1" style={{ flex: `${n} 1 0` }}>
              <button
                type="button"
                title={`${sec.name}: ${plural(n, "bar")}, ${patternTitle(arr.patterns[si]).toLowerCase()}. ${action}.`}
                aria-label={`${sec.name}. ${action}`}
                onClick={() => app.loopSection(si)}
                className={cn(
                  "truncate rounded-sm px-1 text-left text-sm text-muted-foreground outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30",
                  looped && "bg-tint font-medium text-foreground"
                )}
              >
                {sec.name}
              </button>
              <div className={cn("flex h-map gap-px rounded-sm p-px", looped && "ring-2 ring-primary")}>
                {Array.from({ length: n }, (_, i) => {
                  const b = sec.start + i
                  const bar = song.bars[b]
                  const current = b === view.bar
                  return (
                    <button
                      key={b}
                      type="button"
                      aria-label={`Bar ${b + 1}`}
                      // Keyboard players move by section with the arrow keys, so 150 bars don't each take a Tab stop.
                      tabIndex={-1}
                      aria-current={current ? "location" : undefined}
                      title={`Bar ${b + 1}: ${bar.chords.map((c) => c.chord).join(" ")}${bar.cue ? `, "${bar.cue}"` : ""}`}
                      onClick={() => {
                        app.transport.jumpTo(b)
                        if (editorOpen) app.focusEditorOnBar(b)
                      }}
                      className={cn(
                        "min-w-0 flex-1 cursor-pointer rounded-xs bg-border hover:bg-dim",
                        b < view.bar && "bg-dim hover:bg-muted-foreground",
                        current && "bg-emphasis"
                      )}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>
      <p className="shrink-0 text-sm text-muted-foreground tabular-nums">
        {formatTime(elapsed)} of {formatTime(songSeconds(song, view.tempo))}
        <span className="sr-only">{settings.mode === "song" ? ", playing the whole song" : ""}</span>
      </p>
    </div>
  )
}
