import { IDBFactory } from "fake-indexeddb"
import { describe, expect, it } from "vitest"
import { IndexedDbStore, MemoryStore } from "@/data/kv"
import {
  entriesFromBackupFile,
  importPrototype,
  isEmptyImport,
  readPrototype,
} from "@/data/prototype-import"
import { validPersonalSongs } from "@/data/personal-songs"
import { DEFAULT_SETTINGS, Repository } from "@/data/repository"

// What the prototype leaves in localStorage: every value is a JSON string.
const PROTOTYPE = {
  "strumpractice.v1.state": JSON.stringify({
    songId: "let-down",
    mode: "record",
    simplify: true,
    tempo: { "let-down": 88, "amazing-grace": 72 },
    target: { "let-down": 103 },
    clickVol: 40,
    clickMute: false,
    gtrVol: 90,
    gtrMute: true,
    trainer: true,
    step: 2,
  }),
  "strumpractice.v1.songs": JSON.stringify(["song-abc"]),
  "strumpractice.v1.chart.song-abc": JSON.stringify("title: Mine\n[V] pattern=A\nG"),
  "strumpractice.v1.chart.let-down": JSON.stringify("title: Let Down edited\n[V] pattern=A\nA"),
  "strumpractice.v1.patterns": JSON.stringify([{ name: "Let Down", seq: "D.DUD.DU.U" }, { name: "bad", seq: "XYZ" }]),
  "strumpractice.v1.overrides.let-down": JSON.stringify({ "1:Verse 1": "c:Let Down" }),
  "unrelated.key": "ignored",
}

describe("Repository", () => {
  for (const [name, make] of [
    ["memory", () => new MemoryStore()],
    ["IndexedDB", () => new IndexedDbStore(new IDBFactory())],
  ] as const) {
    it(`saves and loads everything (${name})`, async () => {
      const repo = new Repository(make())
      expect((await repo.load()).settings).toEqual(DEFAULT_SETTINGS)
      await repo.saveSettings({ ...DEFAULT_SETTINGS, level: "record", mode: "speed", tempo: { a: 90 }, start: { a: 60 } })
      await repo.saveChart("a", "title: A")
      await repo.saveUserSongIds(["a"])
      await repo.saveOverrides("a", { "0:Verse": "B" })
      await repo.saveCustomPatterns([{ name: "Five", steps: "D.DUD" }])
      const data = await repo.load()
      expect(data.settings).toMatchObject({ level: "record", mode: "speed", tempo: { a: 90 }, start: { a: 60 } })
      expect(data.charts).toEqual({ a: "title: A" })
      expect(data.userSongIds).toEqual(["a"])
      expect(data.overrides).toEqual({ a: { "0:Verse": "B" } })
      expect(data.customPatterns).toEqual([{ name: "Five", steps: "D.DUD" }])
      await repo.saveOverrides("a", {})
      await repo.deleteChart("a")
      const after = await repo.load()
      expect(after.overrides).toEqual({})
      expect(after.charts).toEqual({})
    })
  }

  it("repairs malformed settings instead of failing", async () => {
    const kv = new MemoryStore()
    await kv.set("settings", { level: "expert", mode: "jam", tempo: { a: "fast", b: 80 }, mix: null })
    const { settings } = await new Repository(kv).load()
    expect(settings.level).toBe("arranged")
    expect(settings.mode).toBe("song")
    expect(settings.tempo).toEqual({ b: 80 })
    expect(settings.mix).toEqual(DEFAULT_SETTINGS.mix)
  })
})

describe("prototype import", () => {
  it("reads the prototype's settings, songs, charts, patterns and overrides", () => {
    const d = readPrototype(PROTOTYPE)
    expect(d.settings).toMatchObject({
      songId: "let-down",
      level: "record",
      simplify: true,
      tempo: { "let-down": 88, "amazing-grace": 72 },
      mix: { clickVolume: 40, clickMuted: false, guitarVolume: 90, guitarMuted: true },
      mode: "song",
      trainerStep: 2,
    })
    expect(d.userSongIds).toEqual(["song-abc"])
    expect(Object.keys(d.charts).sort()).toEqual(["let-down", "song-abc"])
    expect(d.customPatterns).toEqual([{ name: "Let Down", steps: "D.DUD.DU.U" }])
    expect(d.overrides).toEqual({ "let-down": { "1:Verse 1": "c:Let Down" } })
    expect(isEmptyImport(readPrototype({}))).toBe(true)
  })

  it("merges into saved data and marks the import done", async () => {
    const repo = new Repository(new MemoryStore())
    await repo.saveSettings({ ...DEFAULT_SETTINGS, tempo: { other: 60 } })
    await repo.saveCustomPatterns([{ name: "let down", steps: "DU" }, { name: "Keep", steps: "D." }])
    const merged = await importPrototype(repo, await repo.load(), readPrototype(PROTOTYPE))
    const reloaded = await repo.load()
    expect(reloaded).toEqual(merged)
    expect(reloaded.meta.prototypeImported).toBe(true)
    expect(reloaded.settings.tempo).toEqual({ other: 60, "let-down": 88, "amazing-grace": 72 })
    expect(reloaded.customPatterns).toEqual([
      { name: "Let Down", steps: "D.DUD.DU.U" },
      { name: "Keep", steps: "D." },
    ])
    expect(reloaded.charts["let-down"]).toContain("Let Down edited")
  })

  it("reads a backup file and rejects anything else", () => {
    const file = JSON.stringify({ format: "song-practice-prototype-backup", version: 1, localStorage: PROTOTYPE })
    expect(Object.keys(entriesFromBackupFile(file))).not.toContain("unrelated.key")
    expect(() => entriesFromBackupFile("not json")).toThrow(/isn't a backup/)
    expect(() => entriesFromBackupFile('{"format":"other"}')).toThrow(/Download backup/)
  })
})

describe("personal songs", () => {
  it("keeps valid songs and skips ones that clash with a built-in id", () => {
    expect(
      validPersonalSongs(
        [{ id: "let-down", chart: "x" }, { id: "amazing-grace", chart: "y" }, { id: 3 }, null],
        ["amazing-grace"]
      )
    ).toEqual([{ id: "let-down", chart: "x" }])
    expect(validPersonalSongs(undefined, [])).toEqual([])
  })
})
