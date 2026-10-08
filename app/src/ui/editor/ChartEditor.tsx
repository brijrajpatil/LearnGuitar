import { useEffect, useMemo, useRef, useState } from "react"
import { XIcon } from "lucide-react"
import { TextArea } from "react-aria-components"
import { cn } from "@/lib/utils"
import { songSeconds } from "@/core/song/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/ui/components/alert-dialog"
import { Button } from "@/ui/components/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/components/collapsible"
import { Kbd } from "@/ui/components/kbd"
import { useAppState, useController } from "@/ui/hooks/use-app"
import { formatTime, plural } from "@/ui/play/display"

// Matches the text-sm/6 line height of the gutter and the text area.
const LINE_PX = 24

const FORMAT_HELP = `title: Amazing Grace     settings: title, artist, key, capo,
tempo: 80                  time (2/4 to 7/4), tempo, note
note: shown in the (i) popover
key: G                   the key of the chords as written, before
                           any capo. Leave it out and the app works
                           it out from the chords
# a line starting with # is a comment

[Verse 1] pattern=C      section header. pattern = A to E, a saved
                           custom pattern name, or a figure string
[Verse 1] pattern=C record=B323B323
                         record = the part as played on the record,
                           used at the Record level
figure characters        D/U strum, . miss, 1-6 pick a string
                           (1 = high E), B pick the bass note
A | A | E | E            bars separated by |
D Dsus2                  2 chords split the bar: 2 beats each
D . . A                  "." holds the chord one more beat
A*4                      that bar 4 times
A "watch the change"     cue text, shown with the bar

chord Bm = x24432 x13421 add a chord: frets low E to high E,
                           optional fingers (T = thumb)
simplify Bm = Em         chord used when Simplify chords is on`

/** The text editor for the current song's chart, with errors marked by line. */
export function ChartEditor() {
  const app = useController()
  const { songId, songs, draft, editorFocus } = useAppState()
  const entry = songs.find((s) => s.id === songId)
  const saved = entry?.chart ?? ""
  const [text, setText] = useState(() => (draft?.id === songId ? draft.text : saved))
  const [checked, setChecked] = useState(text)
  const [line, setLine] = useState(1)
  const area = useRef<HTMLTextAreaElement>(null)
  const gutter = useRef<HTMLDivElement>(null)

  // A different song, or the saved chart changed (applied or reset): start from it.
  const source = `${songId}\n${saved}`
  const [loaded, setLoaded] = useState(source)
  if (loaded !== source) {
    const next = draft?.id === songId ? draft.text : saved
    setLoaded(source)
    setText(next)
    setChecked(next)
  }

  // Check the chart a moment after typing stops.
  useEffect(() => {
    const id = setTimeout(() => setChecked(text), 220)
    return () => clearTimeout(id)
  }, [text])

  const result = useMemo(() => app.validate(checked), [app, checked])
  const errorLines = useMemo(() => new Set(result.errors.map((e) => e.line)), [result])
  const lineCount = text.split("\n").length
  const dirty = text !== saved

  const gotoLine = (n: number) => {
    const ta = area.current
    if (!ta) return
    const lines = ta.value.split("\n")
    n = Math.max(1, Math.min(lines.length, n))
    let off = 0
    for (let i = 0; i < n - 1; i++) off += lines[i].length + 1
    ta.focus({ preventScroll: true })
    ta.setSelectionRange(off, off)
    ta.scrollTop = Math.max(0, (n - 5) * LINE_PX)
    setLine(n)
  }

  // The app asks for a bar's line when the editor opens or a bar is clicked in the song map.
  useEffect(() => {
    gotoLine(editorFocus.line)
  }, [editorFocus.seq]) // eslint-disable-line react-hooks/exhaustive-deps

  const apply = () => {
    const errors = app.applyChart(text)
    setChecked(text)
    if (errors.length) gotoLine(errors[0].line)
  }

  const close = () => {
    app.setDraft(text)
    app.setEditorOpen(false)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        apply()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const caretLine = () => {
    const ta = area.current
    if (ta) setLine(ta.value.slice(0, ta.selectionStart).split("\n").length)
  }

  return (
    <aside
      aria-label="Chart editor"
      className="flex h-dvh w-editor shrink-0 flex-col gap-2.5 border-l border-border bg-card px-4 py-3.5"
      onKeyDown={(e) => {
        if (e.key === "Escape") close()
      }}
    >
      <div className="flex items-center gap-2.5">
        <h2 className="text-lg font-bold">Chart editor</h2>
        <span className="flex-1" />
        <Button variant="ghost" size="icon-sm" aria-label="Close the editor" onPress={close}>
          <XIcon />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        The cursor starts at the line for the current bar. Click a bar in the song map to move there.
      </p>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
        <div
          ref={gutter}
          aria-hidden="true"
          className="w-12 shrink-0 overflow-hidden bg-editor-gutter py-2.5 pr-2 text-right font-mono text-sm/6 text-muted-foreground select-none"
        >
          {Array.from({ length: lineCount + 3 }, (_, i) => (
            <div
              key={i}
              className={cn(errorLines.has(i + 1) && "bg-error-line text-foreground", i + 1 === line && "text-primary")}
            >
              {i < lineCount ? i + 1 : " "}
            </div>
          ))}
        </div>
        <TextArea
          ref={area}
          aria-label="Chart text"
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          wrap="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onScroll={(e) => {
            if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop
          }}
          onClick={caretLine}
          onKeyUp={caretLine}
          className="min-w-0 flex-1 resize-none overflow-auto bg-transparent px-3 py-2.5 font-mono text-sm/6 whitespace-pre text-foreground outline-none [tab-size:2]"
        />
      </div>

      <div
        role="status"
        className={cn(
          "max-h-32 overflow-auto rounded-xl bg-secondary px-2.5 py-2 text-sm/relaxed",
          result.errors.length ? "bg-destructive/10 text-foreground" : "text-primary"
        )}
      >
        {result.errors.length ? (
          <>
            {result.errors.slice(0, 6).map((e, i) => (
              <p key={i}>
                <Button size="xs" variant="destructive" className="mr-1.5" onPress={() => gotoLine(e.line)}>
                  Line {e.line}
                </Button>
                {e.message}
              </p>
            ))}
            {result.errors.length > 6 && <p>{result.errors.length - 6} more problems below.</p>}
          </>
        ) : (
          <p>
            Chart OK: {plural(result.song.sections.length, "section")}, {plural(result.song.bars.length, "bar")}
            {result.song.tempo ? `, ${formatTime(songSeconds(result.song, result.song.tempo))} at ${result.song.tempo} BPM` : ""}
            {dirty ? ". Press Apply to use it." : ". No unapplied changes."}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onPress={apply} isDisabled={result.errors.length > 0 && checked === text}>
          Apply <Kbd>⌘ Enter</Kbd>
        </Button>
        <span className="flex-1" />
        {entry?.builtin ? (
          <AlertDialogTrigger>
            <Button variant="outline">Reset to original</Button>
            <AlertDialog>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset this chart?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your edits to {entry.label} are replaced by the chart that came with the app. Tempos and pattern choices stay.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep my edits</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onPress={() => app.resetChart()}>
                  Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialog>
          </AlertDialogTrigger>
        ) : (
          <AlertDialogTrigger>
            <Button variant="destructive">Delete song</Button>
            <AlertDialog>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this song?</AlertDialogTitle>
                <AlertDialogDescription>{entry?.label} and its pattern choices are removed from this device.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep it</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onPress={() => app.deleteSong()}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialog>
          </AlertDialogTrigger>
        )}
      </div>

      <Collapsible className="text-sm text-muted-foreground">
        <CollapsibleTrigger className="cursor-pointer font-bold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/30">
          Chart format
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="mt-2 overflow-auto rounded-lg bg-secondary p-2.5 font-mono text-xs/relaxed whitespace-pre-wrap text-foreground select-text">
            {FORMAT_HELP}
          </pre>
        </CollapsibleContent>
      </Collapsible>
    </aside>
  )
}
