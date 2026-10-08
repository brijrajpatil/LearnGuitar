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

const study = (id: string, difficulty: Difficulty): CatalogEntry => ({ id, collection: "study", difficulty })
const trad = (id: string, difficulty: Difficulty): CatalogEntry => ({ id, collection: "traditional", difficulty })

export const CATALOG: readonly CatalogEntry[] = [
  // Studies, in the order a beginner would take them.
  study("em-g", "first"),
  study("a-d", "first"),
  study("g-c-d", "first"),
  study("d-g-a", "first"),
  study("three-four-g", "first"),
  study("g-d-em-c", "easy"),
  study("c-am-fmaj7-g", "easy"),
  study("am-g-fmaj7-e", "easy"),
  study("capo-two", "easy"),
  study("walking-bass", "easy"),
  study("blues-in-a", "easy"),
  study("blues-in-e", "easy"),
  study("am-f-c-g", "moderate"),
  study("d-bm-g-a", "moderate"),
  study("canon", "moderate"),
  study("power-chords", "moderate"),
  study("barre-chords", "harder"),

  // Folk and traditional songs in the public domain.
  trad("twinkle-twinkle", "first"),
  trad("mary-had-a-little-lamb", "first"),
  trad("london-bridge", "first"),
  trad("hush-little-baby", "first"),
  trad("skip-to-my-lou", "first"),
  trad("this-old-man", "first"),
  trad("old-macdonald", "first"),
  trad("yankee-doodle", "first"),
  trad("clementine", "first"),
  trad("down-in-the-valley", "first"),
  trad("drunken-sailor", "first"),
  trad("whole-world", "first"),
  trad("swing-low", "first"),
  trad("michael-row", "first"),
  trad("down-by-the-riverside", "first"),
  trad("joshua", "first"),
  trad("wade-in-the-water", "first"),
  trad("old-joe-clark", "first"),
  trad("shady-grove", "first"),
  trad("silent-night", "first"),
  trad("amazing-grace", "easy"),
  trad("happy-birthday", "easy"),
  trad("when-the-saints", "easy"),
  trad("coming-round-the-mountain", "easy"),
  trad("jingle-bells", "easy"),
  trad("auld-lang-syne", "easy"),
  trad("my-bonnie", "easy"),
  trad("home-on-the-range", "easy"),
  trad("molly-malone", "easy"),
  trad("whiskey-in-the-jar", "easy"),
  trad("scarborough-fair", "easy"),
  trad("loch-lomond", "easy"),
  trad("greensleeves", "moderate"),
  trad("wellerman", "moderate"),
]
