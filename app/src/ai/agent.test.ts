import { describe, expect, it } from "vitest"
import { parseChart } from "@/core/chart/parse"
import { parseVoicing } from "@/core/theory/voicings"
import { draftSong, MAX_REPAIRS, pageAddress, type Step } from "@/ai/agent"
import { answer, failure, fakeGemini } from "@/ai/fake-gemini"
import { AiError } from "@/ai/gemini"
import { NO_SHAPE_TOOLS, type ShapeTools } from "@/ai/to-chart"

const key = "test-key-not-real"
const now = () => new Date(2026, 9, 8)

// Drunken Sailor is a public domain sea shanty.
const sailor = (bars = ["Dm", "C", "Dm", "C Dm"], shapes: { name: string; frets: string }[] = []) => ({
  found: true,
  title: "Drunken Sailor",
  artist: "Traditional",
  key: "Dm",
  capo: 0,
  beatsPerBar: 4,
  tempo: 100,
  sections: [
    { name: "Verse 1", pattern: "C", bars },
    { name: "Chorus", pattern: "B", bars },
  ],
  shapes,
})

const kindOf = async (p: Promise<unknown>) => {
  try {
    await p
    return "no error"
  } catch (e) {
    return e instanceof AiError ? e.kind : String(e)
  }
}

describe("drafting a song", () => {
  it("drafts from memory, checks the chart and reports each step", async () => {
    const api = fakeGemini(answer(sailor()))
    const seen: Step[][] = []
    const out = await draftSong(
      { song: "Drunken Sailor", from: "memory" },
      { key, fetch: api.fetch, shapes: NO_SHAPE_TOOLS, now, onSteps: (s) => seen.push(s) }
    )
    expect(out.problems).toEqual([])
    expect(out.tries).toBe(1)
    expect(out.title).toBe("Drunken Sailor")
    expect(out.source).toEqual({ kind: "memory", model: "gemini-3.8-flash" })
    expect(parseChart(out.chart, []).errors).toEqual([])
    expect(out.steps).toEqual([
      { label: "Drafting with Gemini", state: "done" },
      { label: "Checking the chart", state: "done" },
    ])
    expect(seen[0]).toEqual([{ label: "Drafting with Gemini", state: "running" }])
    expect(api.sent[0].body.contents[0].parts[0].text).toContain("Song: Drunken Sailor")
  })

  it("sends problems back to the model and uses its fix", async () => {
    const tools: ShapeTools = { shapeFor: () => null, playsChord: (name) => name === "C#7" }
    const api = fakeGemini(answer(sailor(["Dm", "C#7"])), answer(sailor(["Dm", "C#7"], [{ name: "C#7", frets: "x43404" }])))
    const out = await draftSong({ song: "Drunken Sailor", from: "memory" }, { key, fetch: api.fetch, shapes: tools, now })
    expect(out.problems).toEqual([])
    expect(out.tries).toBe(2)
    expect(out.chart).toContain("chord C#7 = x43404")
    expect(out.steps.map((s) => s.label)).toEqual([
      "Drafting with Gemini",
      "Checking the chart",
      "Fixing 1 problem (try 1 of 2)",
      "Checking the chart",
    ])
    const turns = api.sent[1].body.contents
    expect(turns.map((t) => t.role)).toEqual(["user", "model", "user"])
    expect(turns[2].parts[0].text).toContain("The app has no shape for C#7")
    expect(parseVoicing("x43404")).not.toBeNull()
  })

  it("gives up after two fixes and returns the chart with its problems", async () => {
    const bad = () => answer(sailor(["Dm", "C#7"]))
    const api = fakeGemini(bad(), bad(), bad())
    const out = await draftSong({ song: "Drunken Sailor", from: "memory" }, { key, fetch: api.fetch, shapes: NO_SHAPE_TOOLS, now })
    expect(api.sent).toHaveLength(MAX_REPAIRS + 1)
    expect(out.tries).toBe(3)
    expect(out.problems).toEqual(["The app has no shape for C#7. Add it to shapes, with six frets."])
  })

  it("says when the model doesn't know the song, and marks the step failed", async () => {
    const seen: Step[][] = []
    const api = fakeGemini(answer({ ...sailor(), found: false, sections: [] }))
    const kind = await kindOf(
      draftSong({ song: "Nobody knows this", from: "memory" }, { key, fetch: api.fetch, shapes: NO_SHAPE_TOOLS, onSteps: (s) => seen.push(s) })
    )
    expect(kind).toBe("unknown-song")
    expect(seen.at(-1)).toEqual([{ label: "Drafting with Gemini", state: "failed" }])
  })

  it("reads a chord page and names it as the source", async () => {
    const page = "https://example.com/chords/drunken-sailor"
    const meta = { urlContextMetadata: { urlMetadata: [{ retrievedUrl: page, urlRetrievalStatus: "URL_RETRIEVAL_STATUS_SUCCESS" }] } }
    const api = fakeGemini(answer(sailor(), meta))
    const out = await draftSong({ song: "Drunken Sailor", from: "page", url: page }, { key, fetch: api.fetch, shapes: NO_SHAPE_TOOLS, now })
    expect(api.sent[0].body.tools).toEqual([{ url_context: {} }])
    expect(api.sent[0].body.contents[0].parts[0].text).toContain(page)
    expect(out.steps[0].label).toBe("Reading example.com")
    expect(out.chart).toContain(`note: AI draft from ${page}, converted by Gemini, 8 Oct 2026.`)

    const closed = { urlContextMetadata: { urlMetadata: [{ retrievedUrl: page, urlRetrievalStatus: "URL_RETRIEVAL_STATUS_ERROR" }] } }
    expect(
      await kindOf(draftSong({ song: "x", from: "page", url: page }, { key, fetch: fakeGemini(answer(sailor(), closed)).fetch, shapes: NO_SHAPE_TOOLS }))
    ).toBe("page-unreadable")
  })

  it("converts a pasted sheet on the device without a key, and sends only chord lines with one", async () => {
    const sheet = "[Verse]\nDm\nfiller words here\nC\nmore filler\n[Chorus]\nDm C Dm C"
    const api = fakeGemini()
    const out = await draftSong({ song: "Drunken Sailor", from: "sheet", text: sheet }, { key: null, fetch: api.fetch, shapes: NO_SHAPE_TOOLS, now })
    expect(api.sent).toHaveLength(0)
    expect(out.tries).toBe(0)
    expect(out.source).toEqual({ kind: "paste" })
    expect(out.problems).toEqual([])
    const lower = await draftSong({ song: "drunken sailor", from: "sheet", text: sheet }, { key: null, shapes: NO_SHAPE_TOOLS })
    expect(lower.chart).toMatch(/^title: Drunken Sailor$/m)

    const withKey = fakeGemini(answer(sailor()))
    await draftSong({ song: "Drunken Sailor", from: "sheet", text: sheet }, { key, fetch: withKey.fetch, shapes: NO_SHAPE_TOOLS })
    const sent = withKey.sent[0].body.contents[0].parts[0].text
    expect(sent).toContain("[Chorus]")
    expect(sent).not.toMatch(/filler/)
  })

  it("needs a key for drafting and reading pages, and a real address", async () => {
    const opts = { key: null, shapes: NO_SHAPE_TOOLS }
    expect(await kindOf(draftSong({ song: "x", from: "memory" }, opts))).toBe("no-key")
    expect(await kindOf(draftSong({ song: "x", from: "page", url: "https://example.com" }, opts))).toBe("needs-key")
    expect(await kindOf(draftSong({ song: "x", from: "page", url: "not a page" }, { ...opts, key }))).toBe("request")
    expect(await kindOf(draftSong({ song: "x", from: "sheet", text: "only words" }, opts))).toBe("no-chords")
    expect(pageAddress("javascript:alert(1)")).toBeNull()
    expect(pageAddress(" https://example.com/x ")).toBe("https://example.com/x")
  })

  it("passes API failures through", async () => {
    const api = fakeGemini(failure(400, "API key not valid."))
    expect(await kindOf(draftSong({ song: "x", from: "memory" }, { key, fetch: api.fetch, shapes: NO_SHAPE_TOOLS }))).toBe("bad-key")
  })
})
