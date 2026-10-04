import { describe, expect, it } from "vitest"
import type { SongEntry } from "@/app/controller"
import { filterSongs, matchesQuery } from "@/ui/library/filter"

const song = (p: Partial<SongEntry> & Pick<SongEntry, "id">): SongEntry => ({
  builtin: true,
  original: "",
  chart: "",
  title: p.id,
  artist: "",
  label: p.id,
  chords: [],
  collection: "traditional",
  difficulty: "easy",
  checked: true,
  ...p,
})

const songs = [
  song({ id: "creep", title: "Creep", artist: "Radiohead", chords: ["G", "B", "C", "Cm"], collection: "popular", difficulty: "harder" }),
  song({ id: "door", title: "Knockin' on Heaven's Door", artist: "Bob Dylan", chords: ["G", "D", "Am", "C"], collection: "popular" }),
  song({ id: "g-d", title: "G and D", chords: ["G", "D"], collection: "study", difficulty: "first" }),
  song({ id: "mine", title: "My song", collection: "yours", difficulty: null }),
  song({ id: "sailor", title: "Drunken Sailor", artist: "Traditional", chords: ["Dm", "C"], difficulty: "first" }),
]

const ids = (list: SongEntry[]) => list.map((s) => s.id)
const all = { query: "", collection: "all", difficulty: "any" } as const

describe("library filter", () => {
  it("lists the easiest first, keeps the catalog's order within a difficulty, and puts your songs last", () => {
    expect(ids(filterSongs(songs, all))).toEqual(["g-d", "sailor", "door", "creep", "mine"])
  })

  it("filters by collection and by difficulty", () => {
    expect(ids(filterSongs(songs, { ...all, collection: "popular" }))).toEqual(["door", "creep"])
    expect(ids(filterSongs(songs, { ...all, collection: "yours" }))).toEqual(["mine"])
    expect(ids(filterSongs(songs, { ...all, difficulty: "first" }))).toEqual(["g-d", "sailor"])
  })

  it("searches titles and artists, ignoring case and apostrophes", () => {
    expect(matchesQuery(songs[1], "heav")).toBe(true)
    expect(matchesQuery(songs[1], "knockin heavens")).toBe(true)
    expect(matchesQuery(songs[1], "DYLAN")).toBe(true)
    expect(matchesQuery(songs[1], "radiohead")).toBe(false)
  })

  it("finds songs by a chord name, matched whole", () => {
    expect(ids(filterSongs(songs, { ...all, query: "cm" }))).toEqual(["creep"])
    expect(ids(filterSongs(songs, { ...all, query: "Dm" }))).toEqual(["sailor"])
  })
})
