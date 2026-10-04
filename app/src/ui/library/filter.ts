// What the library page lists: songs filtered by collection, difficulty and a search,
// easiest first. Plain functions, so they're tested without React.

import type { SongCollection, SongEntry } from "@/app/controller"
import { DIFFICULTIES, type Difficulty } from "@/data/library/catalog"

export type CollectionFilter = "all" | SongCollection
export type DifficultyFilter = "any" | Difficulty

export const COLLECTION_NAMES: Record<SongCollection, string> = {
  study: "Studies",
  traditional: "Folk and traditional",
  popular: "Popular",
  yours: "Your songs",
}

export const DIFFICULTY_NAMES: Record<Difficulty, string> = {
  first: "First chords",
  easy: "Easy",
  moderate: "Moderate",
  harder: "Harder",
}

export interface LibraryFilter {
  query: string
  collection: CollectionFilter
  difficulty: DifficultyFilter
}

/** Lower case, without apostrophes and punctuation, so "knockin heavens" finds "Knockin' on Heaven's Door". */
const fold = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/[^\p{L}\p{N}#]+/gu, " ")
    .trim()

/**
 * True when every word of the search is in the title or artist, or is one of the
 * song's chords. "Cm" finds songs with a C minor chord, "heav" finds Heaven's Door.
 */
export function matchesQuery(song: SongEntry, query: string): boolean {
  const words = fold(query).split(" ").filter(Boolean)
  if (!words.length) return true
  const text = fold(`${song.title} ${song.artist}`)
  const chords = new Set(song.chords.map((c) => c.toLowerCase()))
  return words.every((w) => text.includes(w) || chords.has(w))
}

const rank = (s: SongEntry): number => (s.difficulty ? DIFFICULTIES.indexOf(s.difficulty) : DIFFICULTIES.length)

/** The songs to list, easiest first. Songs of the same difficulty keep the catalog's order. */
export function filterSongs(songs: readonly SongEntry[], f: LibraryFilter): SongEntry[] {
  return songs
    .filter(
      (s) =>
        (f.collection === "all" || s.collection === f.collection) &&
        (f.difficulty === "any" || s.difficulty === f.difficulty) &&
        matchesQuery(s, f.query)
    )
    .map((s, i) => ({ s, i }))
    .sort((a, b) => rank(a.s) - rank(b.s) || a.i - b.i)
    .map(({ s }) => s)
}

/** "Study", the artist, or nothing, for the line under a song's title. */
export const byline = (s: SongEntry): string => (s.collection === "study" ? "Study" : s.artist)
