import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { hasLyrics, lineChords, lyricAt, shownWord, sungLines, type SungLine } from "@/core/timeline/lyrics"
import { Card } from "@/ui/components/card"
import { useAppState, useTransport } from "@/ui/hooks/use-app"
import { ChordName } from "@/ui/play/ChordName"

/** The song has lyrics and the player has them on. Doesn't follow the playhead. */
export function useShowLyrics(): boolean {
  const { song, settings } = useAppState()
  return settings.lyrics && hasLyrics(song)
}

/**
 * The song's sung lines and where the playhead is in them. Null when the song has no
 * lyrics or the player turned them off.
 */
export function useLyrics() {
  const { song, arrangement: arr } = useAppState()
  const view = useTransport()
  const show = useShowLyrics()
  const lines = useMemo(() => sungLines(song), [song])
  if (!show) return null
  const slot = view.state === "playing" ? view.slot : -1
  const at = lyricAt(lines, arr.slotsPerBar, view.bar, slot)
  return { lines, at, words: song.bars[view.bar]?.lyrics ?? [] }
}

/** A sung line as text, with syllables joined into their words. */
const lineText = (line: SungLine): string =>
  line
    .map((w) => {
      const { text, joins } = shownWord(w.text)
      return joins ? text : text + " "
    })
    .join("")
    .trim()

/** A sung line with its chord changes above the words, and the word being sung lit. */
function Line({ line, current }: { line: SungLine; current: number }) {
  const { arrangement: arr } = useAppState()
  const chords = lineChords(arr, line)
  return (
    <>
      {/* Screen readers get the line as text. The words and chords are laid out for the eye. */}
      <p className="sr-only">{lineText(line)}</p>
      <p aria-hidden="true" className="flex flex-wrap items-end text-stage-lyric font-medium short:text-stage-lyric-sm">
        {line.map((w, i) => {
          const { text, joins } = shownWord(w.text)
          return (
            <span key={i} className={cn("inline-flex flex-col", !joins && "mr-[0.3em]")}>
              {/* Short windows leave the chords to the chord cards. */}
              <span className="h-4 text-sm/4 font-semibold text-muted-foreground short:hidden">{chords[i] && <ChordName name={chords[i]} />}</span>
              <span
                data-current={i === current || undefined}
                className={cn("rounded-sm", i === current && "bg-emphasis text-emphasis-foreground shadow-[0_0_0_0.15em_var(--emphasis)]")}
              >
                {text}
              </span>
            </span>
          )
        })}
      </p>
    </>
  )
}

/** The line being sung, large, and the next one below it (decision 0021). */
export function LyricCard() {
  const lyrics = useLyrics()
  if (!lyrics?.at) return null
  const { lines, at } = lyrics
  const next = lines[at.line + 1]
  return (
    <Card aria-label="Lyrics" role="region" className="gap-0.5 px-5 py-2">
      <Line line={lines[at.line]} current={at.word} />
      {next && (
        <p className="truncate text-muted-foreground short:hidden">
          <span className="sr-only">Next line: </span>
          {lineText(next)}
        </p>
      )}
    </Card>
  )
}
