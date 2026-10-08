import { describe, expect, it } from "vitest"
import { AppController } from "@/app/controller"
import { answer, fakeGemini } from "@/ai/fake-gemini"
import { MemoryStore } from "@/data/kv"

async function app() {
  const c = new AppController({ notify: () => {}, store: new MemoryStore() })
  await c.init()
  return c
}

describe("practice modes", () => {
  it("starts new players in Play the song, with nothing looping", async () => {
    const c = await app()
    expect(c.getState().settings.mode).toBe("song")
    expect(c.transport.getView()).toMatchObject({ loop: null, trainer: { on: false } })
  })

  it("Learn a section loops the current section, and the loop follows the arrow keys", async () => {
    const c = await app()
    c.setMode("learn")
    expect(c.transport.getView().loop).toEqual({ section: 0 })
    c.transport.nextSection()
    expect(c.transport.getView().loop).toEqual({ section: 1 })
    expect(c.transport.getView().trainer.on).toBe(false)
  })

  it("Build speed loops, turns the trainer on and starts from the current speed", async () => {
    const c = await app()
    c.transport.setTempo(66)
    c.setMode("speed")
    expect(c.transport.getView()).toMatchObject({ loop: { section: 0 }, trainer: { on: true } })
    expect(c.getState().settings.start["amazing-grace"]).toBe(66)
    c.setTrainerStart(60)
    expect(c.transport.getView().tempo).toBe(60)
    expect(c.getState().settings.start["amazing-grace"]).toBe(60)
  })

  it("Play the song stops looping and the trainer", async () => {
    const c = await app()
    c.setMode("speed")
    c.setMode("song")
    expect(c.transport.getView()).toMatchObject({ loop: null, trainer: { on: false } })
  })

  it("clicking a section in the map loops it, and clicking it again plays the song", async () => {
    const c = await app()
    c.loopSection(2)
    expect(c.getState().settings.mode).toBe("learn")
    expect(c.transport.getView()).toMatchObject({ loop: { section: 2 }, bar: 18 })
    c.loopSection(2)
    expect(c.getState().settings.mode).toBe("song")
    expect(c.transport.getView().loop).toBeNull()
  })

  it("L switches between Learn a section and Play the song", async () => {
    const c = await app()
    c.toggleLoop()
    expect(c.getState().settings.mode).toBe("learn")
    c.toggleLoop()
    expect(c.getState().settings.mode).toBe("song")
  })

  it("keeps the mode's loop when the song changes", async () => {
    const c = await app()
    c.newSong()
    c.setMode("learn")
    c.selectSong("amazing-grace")
    expect(c.transport.getView().loop).toEqual({ section: 0 })
  })
})

describe("key and capo", () => {
  it("plays the song in the chosen key, per song, and clears the choice back at the chart's key", async () => {
    const c = await app()
    c.setKey({ shapes: 9, capo: 3 })
    expect(c.getState().arrangement).toMatchObject({ shapes: 9, capo: 3 })
    expect(c.getState().arrangement.barChords[0][0].chord).toBe("E")
    expect(c.getState().settings.key).toEqual({ "amazing-grace": { shapes: 9, capo: 3 } })
    c.newSong()
    expect(c.getState().arrangement).toMatchObject({ shapes: 0, capo: 0 })
    c.selectSong("amazing-grace")
    expect(c.getState().arrangement).toMatchObject({ shapes: 9, capo: 3 })
    c.resetKey()
    expect(c.getState().arrangement).toMatchObject({ shapes: 0, capo: 0 })
    expect(c.getState().settings.key).toEqual({})
  })
})

describe("adding songs", () => {
  const chart = "title: Drunken Sailor\nartist: Traditional\ntime: 4/4\nnote: AI draft from Gemini's memory.\n\n[Verse] pattern=C\nDm | C | Dm | C Dm\n"

  it("adds a song from a chart, opens it, marks an AI draft, and keeps it after a reload", async () => {
    const store = new MemoryStore()
    const c = new AppController({ notify: () => {}, store })
    await c.init()
    const id = c.addSong(chart, { openEditor: false })
    const entry = c.getState().songs.find((s) => s.id === id)
    expect(entry).toMatchObject({ title: "Drunken Sailor", collection: "yours", aiDraft: true, builtin: false })
    expect(c.getState()).toMatchObject({ songId: id, editorOpen: false })
    // Removing the note marks the song as checked.
    c.applyChart(chart.replace(/note: .*\n/, ""))
    expect(c.getState().songs.find((s) => s.id === id)?.aiDraft).toBe(false)
    await new Promise((r) => setTimeout(r, 0))
    const again = new AppController({ notify: () => {}, store })
    await again.init()
    expect(again.getState().songs.some((s) => s.id === id)).toBe(true)
  })

  it("keeps the Gemini key out of the state, drafts with it, and forgets it", async () => {
    const api = fakeGemini(
      answer({
        found: true,
        title: "Drunken Sailor",
        artist: "Traditional",
        key: "Dm",
        capo: 0,
        beatsPerBar: 4,
        tempo: 100,
        sections: [{ name: "Verse", pattern: "C", bars: ["Dm", "C", "Dm", "C Dm"] }],
        shapes: [],
      })
    )
    const store = new MemoryStore()
    const c = new AppController({ notify: () => {}, store, fetch: api.fetch })
    await c.init()
    expect(c.getState().hasAiKey).toBe(false)
    await c.saveAiKey("test-key-not-real")
    expect(c.getState().hasAiKey).toBe(true)
    expect(JSON.stringify(c.getState())).not.toContain("test-key-not-real")
    const out = await c.draftSong({ song: "Drunken Sailor", from: "memory" })
    expect(api.sent[0].headers["x-goog-api-key"]).toBe("test-key-not-real")
    expect(out.problems).toEqual([])
    const reloaded = new AppController({ notify: () => {}, store })
    await reloaded.init()
    expect(reloaded.getState().hasAiKey).toBe(true)
    await reloaded.forgetAiKey()
    expect(reloaded.getState().hasAiKey).toBe(false)
  })
})
