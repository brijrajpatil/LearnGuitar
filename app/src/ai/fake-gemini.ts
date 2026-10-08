// A stand-in for the Gemini API in tests: it answers each request with the next reply
// in its list and keeps what was sent.

export interface SentRequest {
  url: string
  headers: Record<string, string>
  body: {
    systemInstruction: { parts: { text: string }[] }
    contents: { role: string; parts: { text: string }[] }[]
    tools?: unknown[]
    generationConfig: Record<string, unknown>
  }
}

/** A successful reply whose answer is this JSON. */
export const answer = (json: unknown, extra: Record<string, unknown> = {}): Response =>
  new Response(
    JSON.stringify({
      candidates: [{ content: { role: "model", parts: [{ text: JSON.stringify(json) }] }, finishReason: "STOP", ...extra }],
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  )

/** An error reply as the API sends it. */
export const failure = (status: number, message: string): Response =>
  new Response(JSON.stringify({ error: { code: status, message } }), { status })

export function fakeGemini(...replies: (Response | Error)[]) {
  const sent: SentRequest[] = []
  const fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    sent.push({
      url: String(url),
      headers: init?.headers as Record<string, string>,
      body: JSON.parse(String(init?.body)),
    })
    const next = replies.shift()
    if (!next) throw new Error("The fake has no more replies.")
    if (next instanceof Error) throw next
    return next
  }) as typeof globalThis.fetch
  return { fetch, sent }
}
