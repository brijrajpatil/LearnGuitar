// Songs that ship with the app: the library in src/data/library. They hold chords only,
// with no lyrics or tabs (see docs/decisions/0006).

import { LIBRARY, type LibrarySong } from "@/data/library"

export interface SongSource {
  /** Stable id. Saved edits, tempos and pattern choices are stored under it. */
  id: string
  chart: string
}

export const BUILTIN_SONGS: readonly LibrarySong[] = LIBRARY

export const DEFAULT_SONG_ID = "amazing-grace"

/** A built-in song's chart by id, for tests and defaults. */
export const builtinChart = (id: string): string | undefined => BUILTIN_SONGS.find((s) => s.id === id)?.chart

export const NEW_SONG_TEMPLATE = `title: New song
artist:
key: G
time: 4/4
tempo: 90
note:

[Verse 1] pattern=A
G | G | C | C | Em | Em | D | D
[Chorus] pattern=B
C | G | D | Em*2
`
