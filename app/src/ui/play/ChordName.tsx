import { formatChordName } from "@/core/theory/chords"

/**
 * ♯ and ♭ drawn as SVG, because Lexend has no glyphs for them and a fallback font
 * would look out of place. They take the text's color and scale with its size.
 */
function Accidental({ kind }: { kind: "♯" | "♭" }) {
  return (
    <svg
      viewBox="0 0 10 16"
      aria-hidden="true"
      className="mx-[0.02em] inline-block h-[0.62em] w-auto align-[0.42em]"
      fill="currentColor"
    >
      {kind === "♯" ? (
        <path d="M3 0.5h1.3v3.2l1.6-.4V0h1.3v2.9L9 2.5v2l-1.8.4v3.6L9 8.1v2l-1.8.4V14H5.9v-3.2l-1.6.4V15H3v-3.5l-2 .5v-2l2-.5V5.9L1 6.4v-2l2-.5zm1.3 5.1v3.6l1.6-.4V5.2z" />
      ) : (
        <path
          fillRule="evenodd"
          d="M1.5 0h1.4v7.6c1.3-.9 2.6-1.3 3.7-1.1 1.5.3 2.2 1.5 1.9 3-.4 2-2.6 3.8-7 6.5zm1.4 9.4v4.4c2.2-1.6 3.4-2.8 3.6-3.9.2-.9-.1-1.5-.8-1.6-.7-.1-1.7.3-2.8 1.1z"
        />
      )}
    </svg>
  )
}

/** A chord name as a screen reader should say it: "F sharp m", "B flat". */
export const spokenChord = (name: string): string =>
  name
    .replace(/#/g, " sharp ")
    .replace(/([A-G])b/g, "$1 flat ")
    .replace(/ +(?=\/|$)/g, "")
    .replace(/ +/g, " ")

/** Chord names in a row, the first `limit` of them, then "+3" for the rest. */
export function ChordList({ chords, limit }: { chords: string[]; limit: number }) {
  const rest = chords.length - limit
  return (
    <span className="flex min-w-0 flex-wrap gap-x-2">
      {chords.slice(0, limit).map((c) => (
        <ChordName key={c} name={c} />
      ))}
      {rest > 0 && <span className="text-muted-foreground">+{rest}</span>}
    </span>
  )
}

/** A chord name with ♯ and ♭, and its parenthesised suffix shown smaller. */
export function ChordName({ name }: { name: string }) {
  const { base, suffix } = formatChordName(name)
  return (
    <span>
      <span className="sr-only">{spokenChord(name)}</span>
      <span aria-hidden="true">
        {base.split(/([♯♭])/).map((part, i) =>
          part === "♯" || part === "♭" ? <Accidental key={i} kind={part} /> : part
        )}
        {suffix && <small className="ml-[0.08em] text-[0.38em] font-medium tracking-normal text-muted-foreground">{suffix}</small>}
      </span>
    </span>
  )
}
