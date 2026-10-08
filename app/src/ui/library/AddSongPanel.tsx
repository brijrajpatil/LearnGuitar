import { useEffect, useRef, useState, type ReactNode } from "react"
import { CheckIcon, ExternalLinkIcon, InfoIcon, XIcon } from "lucide-react"
import { pageAddress, type DraftOutcome, type DraftRequest, type Step } from "@/ai/agent"
import { AiError } from "@/ai/gemini"
import type { Song } from "@/core/song/types"
import { cn } from "cn"
import { Alert, AlertDescription, AlertTitle } from "@/ui/components/alert"
import { Badge } from "@/ui/components/badge"
import { Button, LinkButton } from "@/ui/components/button"
import { Field, FieldDescription, FieldLabel, FieldSeparator } from "@/ui/components/field"
import { Input } from "@/ui/components/input"
import { Textarea } from "@/ui/components/textarea"
import { useAppState, useController } from "@/ui/hooks/use-app"
import { ChordList } from "@/ui/play/ChordName"

const KEY_PAGE = "https://aistudio.google.com/apikey"

type Phase =
  | { kind: "start" }
  | { kind: "key"; then: DraftRequest }
  | { kind: "working"; steps: Step[] }
  | { kind: "preview"; outcome: DraftOutcome; song: Song }
  | { kind: "error"; error: unknown; request: DraftRequest; steps: Step[] }

const searchLink = (song: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(`${song.trim()} chords`.trim())}`

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

/** The steps as they happen: done, in progress (the emphasis fill, which means "now") or failed. */
function StepList({ steps }: { steps: Step[] }) {
  return (
    <ol className="flex flex-col gap-1.5 text-sm" aria-label="Steps">
      {steps.map((s, i) => (
        <li key={i} className="flex items-center gap-2.5">
          <span className="flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
            {s.state === "done" && <CheckIcon className="size-4 text-muted-foreground" />}
            {s.state === "running" && <span className="size-2 rounded-full bg-emphasis motion-safe:animate-pulse" />}
            {s.state === "failed" && <XIcon className="size-4 text-destructive" />}
          </span>
          <span
            className={cn(s.state === "done" && "text-muted-foreground", s.state === "failed" && "text-destructive")}
          >
            {s.label}
            <span className="sr-only">
              {s.state === "running" ? ", in progress" : s.state === "failed" ? ", failed" : ", done"}
            </span>
          </span>
        </li>
      ))}
    </ol>
  )
}

/** What went wrong, and what the player can do about it. */
function errorText(error: unknown, request: DraftRequest): { title: string; body: string } {
  const kind = error instanceof AiError ? error.kind : "server"
  switch (kind) {
    case "bad-key":
      return {
        title: "Google didn't accept this key",
        body: "Check the key in Google AI Studio, then add it again.",
      }
    case "quota":
      return {
        title: "Today's free requests are used up",
        body: "Start from a chord page, or try again tomorrow. A pasted chord sheet works without the AI.",
      }
    case "unknown-song":
      return {
        title: "Gemini doesn't know this song's chords",
        body: "Start from a chord page instead.",
      }
    case "no-chords":
      return request.from === "page"
        ? {
            title: "That page has no chords for this song",
            body: "Try another page, or paste the chords themselves.",
          }
        : {
            title: "No chords found in that text",
            body: "Paste the part of the page with the chords on it.",
          }
    case "page-unreadable":
      return {
        title: "Gemini couldn't open that page",
        body: "Copy the page's text and paste it here instead.",
      }
    case "network":
      return {
        title: "Can't reach Google",
        body: "Check the connection and try again.",
      }
    case "blocked":
      return {
        title: "Gemini stopped before answering",
        body: "Try again, or start from a chord page.",
      }
    case "request":
      return {
        title: "That didn't work",
        body: error instanceof AiError && error.detail ? error.detail : "Try again.",
      }
    default:
      return {
        title: "Gemini's answer didn't work this time",
        body: "Try again in a moment.",
      }
  }
}

function SourceLine({ outcome }: { outcome: DraftOutcome }) {
  const s = outcome.source
  let text: ReactNode
  if (s.kind === "memory") text = "From Gemini's memory. Check it against the record."
  else if (s.kind === "page")
    text = (
      <>
        From{" "}
        <a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
          {host(s.url)}
        </a>
        , read by Gemini. Check it against the record.
      </>
    )
  else if (s.kind === "paste-ai") text = "From your pasted chords, tidied by Gemini."
  else text = "From your pasted chords. Check the bar lengths against the record."
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
      {s.kind !== "paste" && <Badge variant="outline">AI draft</Badge>}
      <span>{text}</span>
    </p>
  )
}

function Preview({ outcome, song }: { outcome: DraftOutcome; song: Song }) {
  const facts = [
    song.key && `Key ${song.key}`,
    song.capo && `Capo ${song.capo}`,
    `${song.beatsPerBar}/4`,
    song.tempo && `${song.tempo} BPM`,
  ].filter(Boolean) as string[]
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-lg font-semibold">{song.title}</p>
        {song.artist && <p className="text-sm text-muted-foreground">{song.artist}</p>}
        <p className="mt-1 flex flex-wrap gap-x-3 text-sm">
          {facts.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </p>
      </div>
      <SourceLine outcome={outcome} />
      <ol className="flex flex-col gap-2" aria-label="Sections">
        {song.sections.map((sec, i) => (
          <li key={i} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-3 text-sm">
            <span className="truncate text-muted-foreground">{sec.name}</span>
            <ChordList
              chords={[...new Set(song.bars.slice(sec.start, sec.end).flatMap((b) => b.chords.map((c) => c.chord)))]}
              limit={8}
            />
          </li>
        ))}
      </ol>
      {outcome.warnings.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
          {outcome.warnings.map((w) => (
            <li key={w} className="flex gap-2">
              <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {w}
            </li>
          ))}
        </ul>
      )}
      {outcome.problems.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>The chart still has problems</AlertTitle>
          <AlertDescription>Edit it first to fix them: {outcome.problems.join(" ")}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

/**
 * Adding a song: the AI drafts it from a name or a chord page with the player's own
 * Gemini key, or the app converts pasted chords (decision 0017). Sits beside the
 * library's list, or in its place on narrow screens.
 */
export function AddSongPanel({ seed, onClose }: { seed: string; onClose: () => void }) {
  const app = useController()
  const { hasAiKey } = useAppState()
  const [song, setSong] = useState(seed)
  const [page, setPage] = useState("")
  const [key, setKey] = useState("")
  const [phase, setPhase] = useState<Phase>({ kind: "start" })
  const abort = useRef<AbortController | null>(null)
  const pageBox = useRef<HTMLTextAreaElement>(null)

  useEffect(() => () => abort.current?.abort(), [])

  const address = pageAddress(page)
  const pageRequest = (): DraftRequest =>
    address ? { song, from: "page", url: address } : { song, from: "sheet", text: page }

  const run = (request: DraftRequest, keyReady = hasAiKey) => {
    if (request.from !== "sheet" && !keyReady) {
      setPhase({ kind: "key", then: request })
      return
    }
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    let steps: Step[] = []
    setPhase({ kind: "working", steps })
    app
      .draftSong(request, {
        signal: ctrl.signal,
        onSteps: (s) => {
          steps = s
          if (!ctrl.signal.aborted) setPhase({ kind: "working", steps: s })
        },
      })
      .then((outcome) => {
        if (ctrl.signal.aborted) return
        setPhase({
          kind: "preview",
          outcome,
          song: app.validate(outcome.chart).song,
        })
      })
      .catch((error: unknown) => {
        if (ctrl.signal.aborted || (error instanceof AiError && error.kind === "cancelled")) return
        if (error instanceof AiError && (error.kind === "no-key" || error.kind === "needs-key")) {
          setPhase({ kind: "key", then: request })
        } else setPhase({ kind: "error", error, request, steps })
      })
  }

  const cancel = () => {
    abort.current?.abort()
    setPhase({ kind: "start" })
  }

  const startOver = (focusPage = false) => {
    setPhase({ kind: "start" })
    if (focusPage) requestAnimationFrame(() => pageBox.current?.focus())
  }

  const saveKey = async (then: DraftRequest) => {
    if (!key.trim()) return
    await app.saveAiKey(key)
    setKey("")
    run(then, true)
  }

  return (
    <section
      aria-labelledby="add-song-title"
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-card lg:w-104 lg:flex-none fit:min-h-48"
    >
      <header className="flex items-center gap-2 border-b border-border py-2 pr-2 pl-4">
        <h2 id="add-song-title" className="font-semibold">
          Add a song
        </h2>
        <Button variant="ghost" size="icon-sm" className="ml-auto" aria-label="Close" onPress={onClose}>
          <XIcon />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        {phase.kind === "start" && (
          <>
            <Field>
              <FieldLabel htmlFor="add-song-name">Song</FieldLabel>
              <Input
                id="add-song-name"
                autoFocus
                autoComplete="off"
                placeholder="Name and artist, like Wonderwall Oasis"
                value={song}
                onChange={(e) => setSong(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && song.trim()) run({ song, from: "memory" })
                }}
              />
            </Field>
            <div className="flex flex-col gap-1.5">
              <Button isDisabled={!song.trim()} onPress={() => run({ song, from: "memory" })}>
                Draft with AI
              </Button>
              <p className="text-sm text-muted-foreground">
                Gemini drafts the chords from what it knows, with your free key. It can get them wrong, so check the
                draft against the record.
              </p>
            </div>

            <FieldSeparator>Or start from a chord page</FieldSeparator>

            <LinkButton variant="outline" href={searchLink(song)} target="_blank" rel="noreferrer">
              Find chord pages
              <ExternalLinkIcon data-icon="inline-end" aria-hidden="true" />
            </LinkButton>
            <Field>
              <FieldLabel htmlFor="add-song-page">Page address or chord text</FieldLabel>
              <Textarea
                id="add-song-page"
                ref={pageBox}
                className="max-h-48 min-h-20 font-mono text-sm"
                placeholder="Paste the page's address, or copy and paste its chords"
                value={page}
                onChange={(e) => setPage(e.target.value)}
              />
              <FieldDescription>
                With an address, Gemini reads the page. Pasted chords are converted on this device, and the lyrics are
                left out.
              </FieldDescription>
            </Field>
            <Button variant="outline" isDisabled={!page.trim()} onPress={() => run(pageRequest())}>
              {address ? "Read this page" : "Convert these chords"}
            </Button>

            <FieldSeparator />
            <Button variant="ghost" size="sm" className="self-start" onPress={() => app.newSong()}>
              Write the chart yourself
            </Button>
          </>
        )}

        {phase.kind === "key" && (
          <>
            <div className="flex flex-col gap-2 text-sm">
              <p className="font-medium">Add your Gemini key</p>
              {phase.then.from === "page" && (
                <p className="text-muted-foreground">
                  Reading a page needs a key. You can also paste the page's text instead.
                </p>
              )}
              <ol className="list-decimal space-y-1 pl-5">
                <li>
                  <a href={KEY_PAGE} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                    Get a free key in Google AI Studio
                  </a>
                  . You need a Google account.
                </li>
                <li>Copy the key and paste it here.</li>
              </ol>
            </div>
            <Field>
              <FieldLabel htmlFor="add-song-key">Gemini API key</FieldLabel>
              <Input
                id="add-song-key"
                type="password"
                autoComplete="off"
                autoFocus
                value={key}
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveKey(phase.then)
                }}
              />
              <FieldDescription>
                The key stays in this browser and goes only to Google. A free key drafts about 20 songs a day. Google
                may use free requests to improve its products.
              </FieldDescription>
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button isDisabled={!key.trim()} onPress={() => void saveKey(phase.then)}>
                Save key and draft
              </Button>
              <Button variant="ghost" onPress={() => startOver()}>
                Back
              </Button>
            </div>
          </>
        )}

        {phase.kind === "working" && (
          <>
            <div aria-live="polite">
              <StepList steps={phase.steps} />
            </div>
            <Button variant="outline" size="sm" className="self-start" onPress={cancel}>
              Cancel
            </Button>
          </>
        )}

        {phase.kind === "preview" && (
          <>
            <StepList steps={phase.outcome.steps} />
            <Preview outcome={phase.outcome} song={phase.song} />
            <div className="flex flex-wrap gap-2">
              <Button
                isDisabled={phase.outcome.problems.length > 0}
                onPress={() => app.addSong(phase.outcome.chart, { openEditor: false })}
              >
                Save and play
              </Button>
              <Button variant="outline" onPress={() => app.addSong(phase.outcome.chart, { openEditor: true })}>
                Edit first
              </Button>
              <Button variant="ghost" onPress={() => startOver(phase.outcome.source.kind === "memory")}>
                {phase.outcome.source.kind === "memory" ? "Use a chord page" : "Start over"}
              </Button>
            </div>
          </>
        )}

        {phase.kind === "error" && (
          <>
            {phase.steps.length > 0 && <StepList steps={phase.steps} />}
            <Alert variant="destructive">
              <AlertTitle>{errorText(phase.error, phase.request).title}</AlertTitle>
              <AlertDescription>{errorText(phase.error, phase.request).body}</AlertDescription>
            </Alert>
            <div className="flex flex-wrap gap-2">
              {phase.error instanceof AiError && phase.error.kind === "bad-key" ? (
                <Button onPress={() => setPhase({ kind: "key", then: phase.request })}>Add the key again</Button>
              ) : (
                <Button onPress={() => run(phase.request)}>Try again</Button>
              )}
              <Button variant="ghost" onPress={() => startOver(true)}>
                Start from a chord page
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
