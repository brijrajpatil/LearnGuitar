// A small Gemini API client for the browser. The player's own key goes straight to
// Google, and nothing passes through a server of ours (decision 0017). fetch is passed
// in, so tests run without a network.

/** Tried in order. The second has a larger free quota, for when the first runs out. */
export const GEMINI_MODELS: readonly string[] = ["gemini-3.8-flash", "gemini-3.5-flash-lite"]

const endpoint = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`

export type AiErrorKind =
  | "no-key"
  | "needs-key"
  | "bad-key"
  | "quota"
  | "server"
  | "network"
  | "cancelled"
  | "blocked"
  | "bad-output"
  | "unknown-song"
  | "no-chords"
  | "page-unreadable"
  | "request"
  | "not-found"

export class AiError extends Error {
  readonly kind: AiErrorKind
  /** What the API said, for the player who wants the details. */
  readonly detail: string

  constructor(kind: AiErrorKind, detail = "") {
    super(`${kind}${detail ? `: ${detail}` : ""}`)
    this.name = "AiError"
    this.kind = kind
    this.detail = detail
  }
}

export interface Turn {
  role: "user" | "model"
  text: string
}

export interface GenerateRequest {
  system: string
  turns: Turn[]
  /** The JSON schema the answer must match. */
  schema: object
  /** Lets the model open web addresses given in the turns (the URL context tool). */
  readUrls?: boolean
  temperature?: number
}

export interface GenerateResult {
  text: string
  model: string
  /** Pages the model tried to open, and whether it could. */
  pages: { url: string; ok: boolean }[]
}

export interface GeminiOptions {
  key: string
  fetch?: typeof fetch
  signal?: AbortSignal
  models?: readonly string[]
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v)
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

const isAbort = (e: unknown) => e instanceof Error && e.name === "AbortError"

function httpError(status: number, message: string): AiError {
  if (status === 400 && /api[ _-]?key|API_KEY/i.test(message)) return new AiError("bad-key", message)
  if (status === 401 || status === 403) return new AiError("bad-key", message)
  if (status === 404) return new AiError("not-found", message)
  if (status === 429) return new AiError("quota", message)
  if (status >= 500) return new AiError("server", message)
  return new AiError("request", message)
}

/** Reads a generateContent response: the answer's text and the pages it opened. */
export function readResponse(json: unknown, model: string): GenerateResult {
  if (!isRecord(json)) throw new AiError("bad-output", "The reply wasn't JSON.")
  const candidate = list(json.candidates)[0]
  if (!isRecord(candidate)) {
    const feedback = isRecord(json.promptFeedback) ? json.promptFeedback : {}
    if (feedback.blockReason) throw new AiError("blocked", String(feedback.blockReason))
    throw new AiError("bad-output", "The reply had no answer.")
  }
  const reason = String(candidate.finishReason ?? "")
  if (/^(SAFETY|RECITATION|BLOCKLIST|PROHIBITED_CONTENT|SPII)$/.test(reason)) throw new AiError("blocked", reason)
  const content = isRecord(candidate.content) ? candidate.content : {}
  const text = list(content.parts)
    .filter((p): p is Record<string, unknown> => isRecord(p) && typeof p.text === "string" && p.thought !== true)
    .map((p) => p.text as string)
    .join("")
  if (!text.trim()) throw new AiError("bad-output", reason ? `Stopped: ${reason}` : "The answer was empty.")
  const meta = candidate.urlContextMetadata ?? candidate.url_context_metadata
  const pages = list(isRecord(meta) ? (meta.urlMetadata ?? meta.url_metadata) : []).flatMap((m) =>
    isRecord(m)
      ? [
          {
            url: String(m.retrievedUrl ?? m.retrieved_url ?? ""),
            ok: String(m.urlRetrievalStatus ?? m.url_retrieval_status ?? "") === "URL_RETRIEVAL_STATUS_SUCCESS",
          },
        ]
      : []
  )
  return { text, model, pages }
}

/** The JSON in a reply, even when the model wrapped it in a code fence or a sentence. */
export function parseJsonReply(text: string): unknown {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start < 0 || end < start) throw new AiError("bad-output", "The answer had no JSON in it.")
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    throw new AiError("bad-output", "The answer's JSON didn't parse.")
  }
}

async function callModel(model: string, req: GenerateRequest, opts: GeminiOptions, strict: boolean): Promise<GenerateResult> {
  // Strict asks the API to hold the answer to the schema. Without it, the schema goes
  // in the instructions, for a model that can't combine a schema with reading pages.
  const system = strict ? req.system : `${req.system}\n\nReply with JSON only, matching this schema:\n${JSON.stringify(req.schema)}`
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: req.turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    ...(req.readUrls ? { tools: [{ url_context: {} }] } : {}),
    generationConfig: {
      temperature: req.temperature ?? 0.2,
      ...(strict ? { responseMimeType: "application/json", responseJsonSchema: req.schema } : {}),
    },
  }
  let res: Response
  try {
    res = await (opts.fetch ?? fetch)(endpoint(model), {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": opts.key },
      body: JSON.stringify(body),
      signal: opts.signal,
    })
  } catch (e) {
    throw new AiError(isAbort(e) || opts.signal?.aborted ? "cancelled" : "network", e instanceof Error ? e.message : "")
  }
  const json: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const error = isRecord(json) && isRecord(json.error) ? json.error : {}
    const message = String(error.message ?? res.statusText ?? "")
    if (res.status === 400 && strict && req.readUrls && /support/i.test(message)) return callModel(model, req, opts, false)
    throw httpError(res.status, message)
  }
  return readResponse(json, model)
}

/**
 * Sends a request to the first model that answers. A used-up quota, a server error or
 * a missing model moves on to the next model. Anything else fails at once.
 */
export async function generate(req: GenerateRequest, opts: GeminiOptions): Promise<GenerateResult> {
  let last: AiError | null = null
  for (const model of opts.models ?? GEMINI_MODELS) {
    try {
      return await callModel(model, req, opts, true)
    } catch (e) {
      const err = e instanceof AiError ? e : new AiError("bad-output", String(e))
      if (err.kind !== "quota" && err.kind !== "server" && err.kind !== "not-found") throw err
      last = err
    }
  }
  throw last ?? new AiError("request", "No model to ask.")
}
