# 0015. The built-in library: progression studies and public domain songs

Status: Accepted
Date: 2026-10-08

## Context

Until now the app shipped one song, Amazing Grace ([0006](0006-public-domain-demo-song.md)). A new player had to write a chart before the app could teach them anything, and the owner wants the app to come with a library to learn from.

Every built-in song is published twice: in the public repo ([0004](0004-public-repo-and-future-users.md)) and on the live site ([0013](0013-github-pages-hosting.md)).

## Options

- Progression studies: short exercises built on the chord changes most songs use, written for the app. They raise no rights question.
- Folk and traditional songs in the public domain. Players know many of them, and they raise no rights question when the rule below holds.
- Popular songs, with charts written from memory and marked as unchecked until compared with the record. These are the songs most players want. But the repo and the site would publish charts of commercial songs, which 0006 decided against, and a chart written from memory can be wrong.

## Decision

The library ships progression studies and public domain folk and traditional songs. Popular songs were considered and dropped for rights reasons, so 0006 still holds: the repo and the site have no charts of commercial songs.

- A song is in the public domain when it's traditional with no known writer, or it was published before 1931 and every writer died before 1956. The first date covers the United States, and the second covers countries where copyright lasts for the writer's life plus 70 years.
- The artist field names the writers, or says "Traditional". A note says where the song comes from.
- Charts hold chords, sections, tempo and strum or pick patterns, with no lyrics. Cues name parts of the song, never lines of the words.
- The chords are a common folk harmony written for the app, never copied from a published arrangement. Songs whose familiar chords come from a commercial recording are left out, even when the song itself is traditional.
- Songs from minstrel shows are left out.
- Studies have no artist. Their notes say what each one teaches.
- Each song has a difficulty. First chords means three chords at most and no barre chords. Easy means no barre chords. The library test checks both.

## Consequences

- A first-time player has about 50 songs and studies to play without writing a chart.
- Players who want popular songs still write their own charts, which stay in their browser. A later feature can help them do that.
- A folk harmony can differ from the version a player knows. The chords are the same kind found in songbooks, so the difference is small.
- Song ids are permanent, like every other song id, so the library can grow but its songs can't be renamed.
