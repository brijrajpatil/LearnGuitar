import { describe, expect, it } from "vitest"
import { answer, failure, fakeGemini } from "@/ai/fake-gemini"
import { AiError, generate, GEMINI_MODELS, parseJsonReply, readResponse } from "@/ai/gemini"

const request = { system: "Be brief.", turns: [{ role: "user" as const, text: "Hello" }], schema: { type: "object" } }
const key = "test-key-not-real"

const kindOf = async (p: Promise<unknown>) => {
  try {
    await p
    return "no error"
  } catch (e) {
    return e instanceof AiError ? e.kind : String(e)
  }
}

describe("Gemini client", () => {
  it("sends the key in a header, the schema in the config, and the turns in order", async () => {
    const api = fakeGemini(answer({ ok: true }))
    const result = await generate(request, { key, fetch: api.fetch })
    const [sent] = api.sent
    expect(sent.url).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS[0]}:generateContent`)
    expect(sent.headers["x-goog-api-key"]).toBe(key)
    expect(sent.url).not.toContain(key)
    expect(sent.body.systemInstruction.parts[0].text).toBe("Be brief.")
    expect(sent.body.contents).toEqual([{ role: "user", parts: [{ text: "Hello" }] }])
    expect(sent.body.generationConfig).toMatchObject({ responseMimeType: "application/json", responseJsonSchema: { type: "object" } })
    expect(sent.body.tools).toBeUndefined()
    expect(result).toEqual({ text: '{"ok":true}', model: GEMINI_MODELS[0], pages: [] })
  })

  it("lets the model read pages only when asked, and reports which it opened", async () => {
    const api = fakeGemini(
      answer(
        { ok: true },
        {
          urlContextMetadata: {
            urlMetadata: [
              { retrievedUrl: "https://example.com/a", urlRetrievalStatus: "URL_RETRIEVAL_STATUS_SUCCESS" },
              { retrievedUrl: "https://example.com/b", urlRetrievalStatus: "URL_RETRIEVAL_STATUS_ERROR" },
            ],
          },
        }
      )
    )
    const result = await generate({ ...request, readUrls: true }, { key, fetch: api.fetch })
    expect(api.sent[0].body.tools).toEqual([{ url_context: {} }])
    expect(result.pages).toEqual([
      { url: "https://example.com/a", ok: true },
      { url: "https://example.com/b", ok: false },
    ])
  })

  it("moves to the next model when the quota runs out, and says so when both have", async () => {
    const api = fakeGemini(failure(429, "Quota exceeded"), answer({ ok: true }))
    expect((await generate(request, { key, fetch: api.fetch })).model).toBe(GEMINI_MODELS[1])
    expect(api.sent[1].url).toContain(GEMINI_MODELS[1])
    expect(await kindOf(generate(request, { key, fetch: fakeGemini(failure(429, "q"), failure(429, "q")).fetch }))).toBe("quota")
    expect(await kindOf(generate(request, { key, fetch: fakeGemini(failure(404, "no model"), failure(503, "busy")).fetch }))).toBe(
      "server"
    )
  })

  it("names each kind of failure", async () => {
    const once = (r: Response | Error) => kindOf(generate(request, { key, fetch: fakeGemini(r, r).fetch }))
    expect(await once(failure(400, "API key not valid. Please pass a valid API key."))).toBe("bad-key")
    expect(await once(failure(403, "Permission denied"))).toBe("bad-key")
    expect(await once(failure(400, "Invalid argument"))).toBe("request")
    expect(await once(new TypeError("Failed to fetch"))).toBe("network")
    expect(await once(Object.assign(new Error("aborted"), { name: "AbortError" }))).toBe("cancelled")
    expect(await once(answer({}, { finishReason: "RECITATION" }))).toBe("blocked")
  })

  it("reads replies that were blocked, empty or wrapped", () => {
    expect(() => readResponse({ promptFeedback: { blockReason: "SAFETY" } }, "m")).toThrow(/blocked/)
    expect(() => readResponse({ candidates: [{ content: { parts: [] } }] }, "m")).toThrow(/bad-output/)
    const thought = { candidates: [{ content: { parts: [{ text: "thinking", thought: true }, { text: "{}" }] } }] }
    expect(readResponse(thought, "m").text).toBe("{}")
    expect(parseJsonReply('```json\n{"a": 1}\n```')).toEqual({ a: 1 })
    expect(() => parseJsonReply("no json here")).toThrow(/bad-output/)
  })

  it("asks again without the strict schema when a model can't combine it with reading pages", async () => {
    const api = fakeGemini(failure(400, "Tool use with a response mime type is unsupported"), answer({ ok: true }))
    await generate({ ...request, readUrls: true }, { key, fetch: api.fetch })
    expect(api.sent).toHaveLength(2)
    expect(api.sent[1].url).toContain(GEMINI_MODELS[0])
    expect(api.sent[1].body.generationConfig.responseJsonSchema).toBeUndefined()
    expect(api.sent[1].body.systemInstruction.parts[0].text).toContain("Reply with JSON only")
  })
})
