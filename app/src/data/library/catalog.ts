// The built-in library, in the order the library page lists it. Each entry's chart is
// in <collection>/<id>.txt. Ids are permanent: saved edits, tempos and pattern choices
// are stored under them.

/** Progression studies, folk and traditional songs, and popular songs. */
export type Collection = "study" | "traditional" | "popular"

/**
 * How hard a song is to play, from the chords and changes it needs. The library test
 * checks the first two: "first" has no barre chords and three chords at most, "easy"
 * has no barre chords.
 */
export type Difficulty = "first" | "easy" | "moderate" | "harder"

export interface CatalogEntry {
  id: string
  collection: Collection
  difficulty: Difficulty
  /**
   * Popular songs only: true once the chart, record figures and tempo were checked
   * against the record. Until then the song says it hasn't been checked.
   */
  checked?: boolean
}

export const COLLECTIONS: readonly Collection[] = ["study", "traditional", "popular"]
export const DIFFICULTIES: readonly Difficulty[] = ["first", "easy", "moderate", "harder"]

const trad = (id: string, difficulty: Difficulty): CatalogEntry => ({ id, collection: "traditional", difficulty })

export const CATALOG: readonly CatalogEntry[] = [
  trad("amazing-grace", "easy"),
]
