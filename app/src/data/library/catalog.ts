// The built-in library, in the order the library page lists it. Each entry's chart is
// in <collection>/<id>.txt. Ids are permanent: saved edits, tempos and pattern choices
// are stored under them.

/** Progression studies, and folk and traditional songs in the public domain (decision 0015). */
export type Collection = "study" | "traditional"

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
}

export const COLLECTIONS: readonly Collection[] = ["study", "traditional"]
export const DIFFICULTIES: readonly Difficulty[] = ["first", "easy", "moderate", "harder"]

const trad = (id: string, difficulty: Difficulty): CatalogEntry => ({ id, collection: "traditional", difficulty })

export const CATALOG: readonly CatalogEntry[] = [
  trad("amazing-grace", "easy"),
]
