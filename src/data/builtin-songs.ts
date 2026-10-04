// Songs that ship with the app. They hold chords only, with no lyrics or tabs, so they
// can be published (see docs/decisions/0006).

export interface SongSource {
  /** Stable id. Saved edits, tempos and pattern choices are stored under it. */
  id: string
  chart: string
}

export const DEMO_SONGS: readonly SongSource[] = [
  {
    id: "amazing-grace",
    chart: `title: Amazing Grace
artist: Traditional
key: G
time: 3/4
tempo: 80
note: A traditional hymn in the public domain, with words by John Newton (1779). The chords are a common folk arrangement. A traditional song has no single record, so the Record level plays a fingerpicked version.

# Beginner: one downstroke per beat.
# Arranged: the chord's bass note on beat 1, then down-up strums.
# Record: fingerpicked, the bass note then strings 3 2 1 2 3.

[Intro] pattern=B.DUDU record=B32123
G | G
[Verse 1] pattern=B.DUDU record=B32123
G | G7 | C | G | G | G | D | D
G | G7 | C | G | Em | D | G | G
[Verse 2] pattern=B.DUDU record=B32123
G | G7 | C | G | G | G | D | D
G | G7 | C | G | Em | D | G | G
[Outro] pattern=E
G
`,
  },
]

export const DEFAULT_SONG_ID = "amazing-grace"

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
