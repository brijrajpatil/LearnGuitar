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
  aiDraft: false,
  ...p,
})

const songs = [
  song({ id: "greensleeves", title: "Greensleeves", artist: "Traditional", chords: ["Am", "C", "G", "Em", "F", "E"], difficulty: "moderate" }),
  song({ id: "mountain", title: "She'll Be Coming 'Round the Mountain", artist: "Traditional", chords: ["G", "D7", "C"] }),
  song({ id: "g-d", title: "G and D", chords: ["G", "D"], collection: "study", difficulty: "first" }),
  song({ id: "mine", title: "My song", collection: "yours", difficulty: null }),
  song({ id: "sailor", title: "Drunken Sailor", artist: "Traditional", chords: ["Dm", "C"], difficulty: "first" }),
  song({ id: "minor-four", title: "The minor four", chords: ["C", "F", "Fm"], collection: "study", difficulty: "harder" }),
]

const ids = (list: SongEntry[]) => list.map((s) => s.id)
const all = { query: "", collection: "all", difficulty: "any" } as const

describe("library filter", () => {
  it("lists the easiest first, keeps the catalog's order within a difficulty, and puts your songs last", () => {
    expect(ids(filterSongs(songs, all))).toEqual(["g-d", "sailor", "mountain", "greensleeves", "minor-four", "mine"])
  })

  it("filters by collection and by difficulty", () => {
    expect(ids(filterSongs(songs, { ...all, collection: "study" }))).toEqual(["g-d", "minor-four"])
    expect(ids(filterSongs(songs, { ...all, collection: "yours" }))).toEqual(["mine"])
    expect(ids(filterSongs(songs, { ...all, difficulty: "first" }))).toEqual(["g-d", "sailor"])
  })

  it("searches titles and artists, ignoring case and apostrophes", () => {
    expect(matchesQuery(songs[1], "mount")).toBe(true)
    expect(matchesQuery(songs[1], "shell round")).toBe(true)
    expect(matchesQuery(songs[1], "TRADITIONAL")).toBe(true)
    expect(matchesQuery(songs[1], "sailor")).toBe(false)
  })

  it("finds songs by a chord name, matched whole", () => {
    expect(ids(filterSongs(songs, { ...all, query: "fm" }))).toEqual(["minor-four"])
    expect(ids(filterSongs(songs, { ...all, query: "Dm" }))).toEqual(["sailor"])
  })
})
