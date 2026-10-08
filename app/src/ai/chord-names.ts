// Chord names as people and models write them, turned into names the app knows.

/**
 * A chord name: a root, then an optional quality, extensions, a bracketed addition and
 * a slash bass. Strict enough that words like "Go", "Be" or "Dad" don't match.
 */
const CHORD_RE =
  /^[A-G][#b]?(?:maj|min|m|M|dim|aug|sus|add|\+|°|ø)?[0-9]{0,2}(?:(?:sus|add|maj|b|#|\+|-)[0-9]{1,2})*(?:\([a-zA-Z0-9#b+]{1,8}\))?(?:\/[A-G][#b]?)?$/

export const isChordName = (token: string): boolean => CHORD_RE.test(tidyAccidentals(token))

const tidyAccidentals = (s: string): string => s.replace(/♯/g, "#").replace(/♭/g, "b")

const ENHARMONIC: Readonly<Record<string, string>> = {
  "A#": "Bb",
  Bb: "A#",
  "C#": "Db",
  Db: "C#",
  "D#": "Eb",
  Eb: "D#",
  "F#": "Gb",
  Gb: "F#",
  "G#": "Ab",
  Ab: "G#",
}

/** Splits "F#m7/C#" into root "F#", suffix "m7" and bass "C#". */
export function splitChord(name: string): { root: string; suffix: string; bass: string } | null {
  const m = tidyAccidentals(name).match(/^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/)
  return m ? { root: m[1], suffix: m[2], bass: m[3] ?? "" } : null
}

/**
 * The same chord in the spelling the app uses: "Amin" is "Am", "CM7" is "Cmaj7",
 * "Asus" is "Asus4", "C(add9)" is "Cadd9".
 */
export function tidyChordName(name: string): string {
  const parts = splitChord(name.trim())
  if (!parts) return name.trim()
  let s = parts.suffix
  s = s.replace(/^\((add[0-9]+)\)$/, "$1")
  if (s === "min") s = "m"
  else if (s === "maj" || s === "M") s = ""
  else if (s === "M7") s = "maj7"
  else if (s === "sus") s = "sus4"
  else if (s.startsWith("min")) s = "m" + s.slice(3)
  return parts.root + s + (parts.bass ? "/" + parts.bass : "")
}

/** The other spelling of the root, like Bb for A#, or null when there isn't one. */
export function respell(name: string): string | null {
  const parts = splitChord(name)
  const root = parts && ENHARMONIC[parts.root]
  if (!parts || !root) return null
  const bass = parts.bass ? "/" + (ENHARMONIC[parts.bass] ?? parts.bass) : ""
  return root + parts.suffix + bass
}

/** The plain major or minor chord under a richer one: "F#m7b5" gives "F#m", "Gsus4/B" gives "G". */
export function plainTriad(name: string): string | null {
  const parts = splitChord(name)
  if (!parts) return null
  const minor = /^m(?!aj)/.test(parts.suffix) || parts.suffix.startsWith("min")
  return parts.root + (minor ? "m" : "")
}
