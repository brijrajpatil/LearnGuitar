import { describe, expect, it } from "vitest"
import { AppController } from "@/app/controller"
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
