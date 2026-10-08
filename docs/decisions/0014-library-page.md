# 0014. The library is a page of its own

Status: Accepted. Partly superseded by [0018](0018-library-family-filter.md): the chord family filter is remembered between visits.
Date: 2026-10-04

## Context

The app is getting a built-in library of about 50 songs, in two collections: progression studies, and folk and traditional songs ([0015](0015-built-in-library-contents.md)). Until now, songs were picked from a drop-down menu under the song's title, which listed every song by name.

A drop-down works for a handful of songs. With 50, a player who doesn't know the songs yet needs to see which ones fit their hands: the chords each song uses, and how hard it is. They also need to find a song they do know by name, or by a chord they're practising.

The owner chose between three mockups.

## Options

- A library page. It replaces the play screen until you pick a song, like Spotify's library. There's room for a chords column and a difficulty column, a search field, and filters for collection and difficulty. The play screen is out of view while you browse.
- A side panel over the left of the play screen. The current song stays in view, but the list is narrow, so the chords and the filters get cramped.
- A search dialog that opens from the title or the / key. Fastest for a song you know by name, and weakest for browsing by difficulty.

## Decision

The library is a page of its own (mockup A).

- The song's title in the header opens it, and so does the / key. Back, or Escape with an empty search, returns to the song.
- The top row has the search field and Back. Search matches the title and artist, and whole chord names, so "Cm" finds songs with a C minor chord.
- Below it, a segment control filters by collection (All, Studies, Folk and traditional, Your songs), a select filters by difficulty, and a count says how many songs are listed.
- Each row shows the title with the artist under it, the chords in order of first use (up to six, then "+n"), and the difficulty. The list is sorted easiest first. Within a difficulty, songs keep the catalog's order.
- The current song is marked with a small dot in the emphasis fill, which already means "now" on the play screen.
- The list is a React Aria ListBox: the arrow keys move through it, Enter opens a song, and screen readers announce each row. Down from the search field moves into the list.
- Opening the library stops playback, and the play screen's keys (Space, the arrows, L) don't act while it's open.
- The page fills the window like the play screen ([0011](0011-play-screen-fits-the-window.md)): the header and filters stay put, and only the list scrolls. On phones the chords move under the title and the collection names shorten.
- New song moves to the Your songs filter, and stays in the menu.

## Consequences

- Picking a song takes one more step than the drop-down did for someone who already knows the name: open the library, then pick. The / key and the search field keep that quick.
- The library can grow without the header growing with it.
- Filters reset each time the library opens. If that gets in the way, the last filter can be remembered later.
- Search covers titles, artists and chords. Searching by section or key would need more fields in the song list.
