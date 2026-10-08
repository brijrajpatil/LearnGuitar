import { useEffect, useRef } from "react"
import { PlayIcon, SquareIcon, Undo2Icon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { sectionOf } from "@/core/timeline/arrangement"
import { Alert, AlertDescription, AlertTitle } from "@/ui/components/alert"
import { Button } from "@/ui/components/button"
import { Kbd } from "@/ui/components/kbd"
import { Textarea } from "@/ui/components/textarea"
import { useAppState, useController, useTransport } from "@/ui/hooks/use-app"

/**
 * Tap to sync (decision 0021): paste the words, play the song and press Space as each word
 * starts. Each tap lands on the nearest eighth note, and Save writes the words into the
 * chart under the strum beats. It opens where the chart editor opens.
 */
export function SyncPanel() {
  const app = useController()
  const { sync, song, songId, draft, arrangement } = useAppState()
  const view = useTransport()
  const nextWord = useRef<HTMLButtonElement>(null)
  const recording = !!sync?.recording && view.state !== "stopped"

  // Keep the next word in view as the taps move through a long song.
  useEffect(() => {
    nextWord.current?.scrollIntoView({ block: "nearest" })
  }, [sync?.next])

  if (!sync) return null
  const placed = sync.taps.filter(Boolean).length
  const done = sync.words.length > 0 && sync.next >= sync.words.length
  const section = song.sections[sectionOf(arrangement, view.bar)]?.name ?? ""
  const unapplied = draft?.id === songId

  return (
    <aside
      aria-label="Sync lyrics"
      className="flex h-dvh w-editor shrink-0 flex-col gap-3 border-l border-border bg-card px-4 py-3.5"
      onKeyDown={(e) => {
        if (e.key === "Escape" && !sync.recording) app.setSyncOpen(false)
      }}
    >
      <div className="flex items-center gap-2.5">
        <h2 className="text-lg font-bold">Sync lyrics</h2>
        <span className="flex-1" />
        <Button variant="ghost" size="icon-sm" aria-label="Close sync lyrics" onPress={() => app.setSyncOpen(false)}>
          <XIcon />
        </Button>
      </div>

      {unapplied ? (
        <Alert>
          <AlertTitle>Your chart has edits you haven't applied</AlertTitle>
          <AlertDescription>
            <p>Apply or undo them in the chart editor first, so the lyrics go into the right chart.</p>
            <Button variant="outline" size="sm" className="mt-2" onPress={() => app.setEditorOpen(true)}>
              Open the chart editor
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">1. Paste or type the words</span>
            <span className="text-sm text-muted-foreground">
              Each line is one sung line. Split a word with hyphens to tap each syllable, like La-li-lo.
            </span>
            <Textarea
              aria-label="Lyrics to sync"
              value={sync.text}
              readOnly={sync.recording}
              onChange={(e) => app.setSyncText(e.target.value)}
              placeholder="Paste the words here"
              className="max-h-40 min-h-24 overflow-auto"
            />
          </label>

          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <span className="text-sm font-medium">2. Tap each word as it starts</span>
            <p className="text-sm text-muted-foreground">
              Pick where to start in the song map or with ← →. Press Start, sing along, and press <Kbd>Space</Kbd> as each word
              starts. <Kbd>Backspace</Kbd> takes a tap back. A slower speed makes it easier.
            </p>
            {sync.words.length > 0 && (
              <ol
                aria-label="Words to tap"
                className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto rounded-xl bg-secondary p-2.5"
              >
                {lines(sync.words).map((line, l) => (
                  <li key={l} className="flex flex-wrap gap-x-1 gap-y-0.5">
                    {line.map(({ word, i }) => {
                      const next = i === sync.next
                      const tap = sync.taps[i]
                      return (
                        <button
                          key={i}
                          ref={next ? nextWord : undefined}
                          type="button"
                          tabIndex={-1}
                          aria-current={next || undefined}
                          title={tap ? `Bar ${tap.bar + 1}, eighth note ${tap.slot + 1}` : "Start from this word"}
                          disabled={sync.recording}
                          onClick={() => app.setSyncNext(i)}
                          className={cn(
                            "rounded-sm px-1 hover:bg-muted",
                            tap ? "text-foreground" : "text-muted-foreground",
                            next && "bg-emphasis text-emphasis-foreground hover:bg-emphasis"
                          )}
                        >
                          {word.text}
                        </button>
                      )
                    })}
                  </li>
                ))}
              </ol>
            )}
            <p role="status" className="text-sm text-muted-foreground">
              {sync.words.length === 0
                ? "The words show here once you paste them."
                : done
                  ? `All ${sync.words.length} words placed.`
                  : `${placed} of ${sync.words.length} words placed. ${recording ? "Tap" : "Starts from"}: ${sync.words[sync.next].text}`}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {recording ? (
                <>
                  <Button variant="play" size="xl" onPress={() => app.tapSync()}>
                    Tap
                  </Button>
                  <Button variant="outline" onPress={() => app.stopSync()}>
                    <SquareIcon data-icon="inline-start" />
                    Stop
                  </Button>
                </>
              ) : (
                <Button variant="outline" onPress={() => app.startSync()} isDisabled={!sync.words.length || done}>
                  <PlayIcon data-icon="inline-start" />
                  Start{section ? ` from ${section}` : ""}
                </Button>
              )}
              <Button variant="ghost" onPress={() => app.undoSyncTap()} isDisabled={!sync.taps[sync.next - 1]}>
                <Undo2Icon data-icon="inline-start" />
                Undo tap
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-border pt-3">
            <Button onPress={() => app.saveSync()} isDisabled={placed === 0}>
              Save lyrics
            </Button>
            <p className="text-sm text-muted-foreground">Saving writes them into the chart, from the first tapped bar to the last.</p>
          </div>
        </>
      )}
    </aside>
  )
}

/** The words grouped into their sung lines, with each word's index. */
function lines(words: readonly { text: string; lineStart: boolean }[]) {
  const out: { word: { text: string }; i: number }[][] = []
  words.forEach((word, i) => {
    if (word.lineStart || !out.length) out.push([])
    out[out.length - 1].push({ word, i })
  })
  return out
}
