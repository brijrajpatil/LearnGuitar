// What the library page lists: songs filtered by collection, difficulty, chord family and
// a search, easiest first. Plain functions, so they're tested without React.

import type { SongCollection, SongEntry } from "@/app/controller"
import type { FamilyFit } from "@/core/timeline/family"
import { DIFFICULTIES, type Difficulty } from "@/data/library/catalog"

export type CollectionFilter = "all" | SongCollection
export type DifficultyFilter = "any" | Difficulty

export const COLLECTION_NAMES: Record<SongCollection, string> = {
  study: "Studies",
  traditional: "Folk and traditional",
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
  /** A chord family's home note, or null for any (decision 0018). */
  family: number | null
}

/** Each song moved into the chosen family, by song id. Null for a song with no key. */
export type FamilyFits = ReadonlyMap<string, FamilyFit | null>

/** Lower case, without apostrophes and punctuation, so "shell round" finds "She'll Be Coming 'Round the Mountain". */
const fold = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/[^\p{L}\p{N}#]+/gu, " ")
    .trim()

/**
 * True when every word of the search is in the title or artist, or is one of the
 * song's chords as listed. "Cm" finds songs with a C minor chord, "sail" finds Drunken Sailor.
 */
export function matchesQuery(song: SongEntry, query: string, listed: readonly string[] = song.chords): boolean {
  const words = fold(query).split(" ").filter(Boolean)
  if (!words.length) return true
  const text = fold(`${song.title} ${song.artist}`)
  const chords = new Set(listed.map((c) => c.toLowerCase()))
  return words.every((w) => text.includes(w) || chords.has(w))
}

const rank = (s: SongEntry): number => (s.difficulty ? DIFFICULTIES.indexOf(s.difficulty) : DIFFICULTIES.length)

/**
 * The songs to list, easiest first. Songs of the same difficulty keep the catalog's order.
 * With a family chosen, only the songs that fit it, and a chord search matches the chords
 * as played in the family.
 */
export function filterSongs(songs: readonly SongEntry[], f: LibraryFilter, fits?: FamilyFits): SongEntry[] {
  const fit = (s: SongEntry) => (f.family === null ? null : (fits?.get(s.id) ?? null))
  return songs
    .filter(
      (s) =>
        (f.collection === "all" || s.collection === f.collection) &&
        (f.difficulty === "any" || s.difficulty === f.difficulty) &&
        (f.family === null || fit(s)?.fits === true) &&
        matchesQuery(s, f.query, fit(s)?.chords)
    )
    .map((s, i) => ({ s, i }))
    .sort((a, b) => rank(a.s) - rank(b.s) || a.i - b.i)
    .map(({ s }) => s)
}

/** "Study", the artist, or nothing, for the line under a song's title. */
export const byline = (s: SongEntry): string => (s.collection === "study" ? "Study" : s.artist)
