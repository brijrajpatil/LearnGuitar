// The steps that turn "a song's name" into a chart the app can play: ask Gemini, write
// the chart, check it with the app's own parser, and send any problems back, at most
// twice. A pasted sheet without a key is converted on the device instead.

import { parseChart } from "@/core/chart/parse"
import { AiError, generate, parseJsonReply, type Turn } from "@/ai/gemini"
import { chordLinesOnly, readChordSheet } from "@/ai/paste"
import { draftPrompt, pagePrompt, repairPrompt, sheetPrompt, SYSTEM_PROMPT } from "@/ai/prompts"
import { readDraft, SONG_DRAFT_SCHEMA, type SongDraft } from "@/ai/schema"
import { draftToChart, oneLine, type ChartDraft, type DraftSource, type ShapeTools } from "@/ai/to-chart"

/** How many times a chart with problems goes back to the model. */
export const MAX_REPAIRS = 2

export type DraftRequest = { song: string } & (
  | { from: "memory" }
  | { from: "page"; url: string }
  | { from: "sheet"; text: string }
)

export interface Step {
  label: string
  state: "running" | "done" | "failed"
}

export interface AgentOptions {
  /** The player's Gemini key, or null when they haven't added one. */
  key: string | null
  shapes: ShapeTools
  fetch?: typeof fetch
  signal?: AbortSignal
  models?: readonly string[]
  now?: () => Date
  /** Called with every change to the list of steps, for the panel to show. */
  onSteps?: (steps: Step[]) => void
}

export interface DraftOutcome {
  chart: string
  title: string
  source: DraftSource
  warnings: string[]
  /** Problems left after the last try. Empty when the chart is ready to play. */
  problems: string[]
  /** How many times Gemini was asked. 0 for a sheet converted on the device. */
  tries: number
  steps: Step[]
}

/** A web address the model can open, or null. */
export function pageAddress(text: string): string | null {
  try {
    const url = new URL(text.trim())
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null
  } catch {
    return null
  }
}

/** What the parser and the converter found wrong, in words the model can act on. */
function problemsWith(out: ChartDraft): string[] {
  const { song, errors } = parseChart(out.chart, [])
  const problems = out.unknown.map((name) => `The app has no shape for ${name}. Add it to shapes, with six frets.`)
  for (const e of errors) if (!e.message.startsWith("Unknown chord")) problems.push(`Line ${e.line}: ${e.message}`)
  if (!song.bars.length) problems.push("The chart has no bars.")
  return problems
}

export async function draftSong(req: DraftRequest, opts: AgentOptions): Promise<DraftOutcome> {
  const steps: Step[] = []
  const emit = () => opts.onSteps?.(steps.map((s) => ({ ...s })))
  const step = (label: string) => {
    for (const s of steps) if (s.state === "running") s.state = "done"
    steps.push({ label, state: "running" })
    emit()
  }
  const date = (opts.now ?? (() => new Date()))()
  const song = oneLine(req.song, 120)
  const finish = (out: ChartDraft, source: DraftSource, draft: SongDraft, tries: number, problems: string[]) => {
    for (const s of steps) if (s.state === "running") s.state = "done"
    emit()
    return {
      chart: out.chart,
      title: oneLine(draft.title, 80) || song,
      source,
      warnings: out.warnings,
      problems,
      tries,
      steps: steps.map((s) => ({ ...s })),
    }
  }

  try {
    if (req.from === "sheet" && !opts.key) {
      step("Reading the chords")
      const { draft } = readChordSheet(req.text, { title: song })
      if (!draft.found) throw new AiError("no-chords")
      const source: DraftSource = { kind: "paste" }
      const out = draftToChart(draft, { source, date, shapes: opts.shapes, title: song })
      step("Checking the chart")
      return finish(out, source, draft, 0, problemsWith(out))
    }
    if (!opts.key) throw new AiError(req.from === "page" ? "needs-key" : "no-key")
    if (!song && req.from !== "sheet") throw new AiError("request", "Type the song's name first.")

    let first: string
    let label: string
    const url = req.from === "page" ? pageAddress(req.url) : null
    if (req.from === "page") {
      if (!url) throw new AiError("request", "That isn't a web address.")
      first = pagePrompt(song, url)
      label = `Reading ${new URL(url).hostname.replace(/^www\./, "")}`
    } else if (req.from === "sheet") {
      const lines = chordLinesOnly(req.text)
      if (!lines.trim()) throw new AiError("no-chords")
      first = sheetPrompt(song || "unknown", lines)
      label = "Tidying the chords with Gemini"
    } else {
      first = draftPrompt(song)
      label = "Drafting with Gemini"
    }

    const turns: Turn[] = [{ role: "user", text: first }]
    step(label)
    for (let tries = 1; ; tries++) {
      const reply = await generate(
        { system: SYSTEM_PROMPT, turns, schema: SONG_DRAFT_SCHEMA, readUrls: req.from === "page" },
        { key: opts.key, fetch: opts.fetch, signal: opts.signal, models: opts.models }
      )
      if (url && reply.pages.length && !reply.pages.some((p) => p.ok)) throw new AiError("page-unreadable")
      const draft = readDraft(parseJsonReply(reply.text))
      if (!draft) throw new AiError("bad-output", "The answer wasn't a chart.")
      if (!draft.found || !draft.sections.length) throw new AiError(url ? "no-chords" : "unknown-song")
      const source: DraftSource = url
        ? { kind: "page", url, model: reply.model }
        : req.from === "sheet"
          ? { kind: "paste-ai", model: reply.model }
          : { kind: "memory", model: reply.model }
      step("Checking the chart")
      const out = draftToChart(draft, { source, date, shapes: opts.shapes, title: song })
      const problems = problemsWith(out)
      if (!problems.length || tries > MAX_REPAIRS) return finish(out, source, draft, tries, problems)
      step(`Fixing ${problems.length === 1 ? "1 problem" : `${problems.length} problems`} (try ${tries} of ${MAX_REPAIRS})`)
      turns.push({ role: "model", text: reply.text }, { role: "user", text: repairPrompt(problems) })
    }
  } catch (e) {
    for (const s of steps) if (s.state === "running") s.state = "failed"
    emit()
    throw e
  }
}
