# 0017. Draft chords with the player's own AI key

Status: Accepted
Date: 2026-10-08

## Context

Adding a song means writing its chart. The built-in library holds studies and public domain songs ([0015](0015-built-in-library-contents.md)), so the songs most players want need their own chart. The owner wants a player to type a song's name and start playing, from the live site. The owner pays nothing for AI, and the feature shows how the owner builds AI into a product.

[0003](0003-lyrics-and-tabs-are-user-entered.md) says the app has no feature that fetches or generates lyrics, tabs, record figures or cue text.

What the Gemini API offered on 2026-10-08:
- It accepts calls from a page on the app's address (CORS), so the browser can call it with no server of ours.
- A free key allows about 20 requests a day on Gemini 3.8 Flash and about 500 on Gemini 3.5 Flash-Lite. Google may use free-tier requests to improve its products.
- Searching the web (Google Search grounding) isn't in the free tier for Gemini 3 models. Gemini 2.5's free searches are limited to projects that used 2.5 before.
- A free key can read a page given by its address (the URL context tool).

## Options

- A server holding the owner's key. Players need no key. But every visitor shares one free quota, the server needs bot protection, and the owner runs a service that fetches chords for copyrighted songs.
- Chrome's built-in model. No key and no cost, and it works offline. But it runs only in desktop Chrome on capable machines, can't read the web, and is too small to know many songs.
- The player's own Gemini key, called from the browser, plus a converter for pasted chord sheets that needs no key.

## Decision

The player's own key, called from the browser, plus the paste converter.

- The AI drafts chords only: sections, chords, key, capo, tempo and a strum preset. Its answer has a fixed format with no field that can hold words, and the app writes the chart from it. Lyrics can't reach a chart, and record figures and cue text stay the player's.
- The AI first drafts from what the model knows. The chart's note says it's an AI draft to check against the record. A link opens a web search for chord pages. Given a page's address, the AI reads that page, and the chart names it as the source.
- A pasted sheet is read on the device. Its lyric lines are dropped before anything is stored or sent to the AI.
- The app checks every draft with its own chart parser and sends the problems back to the model, at most twice. Chords the app has no shape for get one, or become a plainer chord, and the app says so.
- Drafts are saved like any song the player writes: in their browser, never in the repo or on the site.
- The key is stored in the browser's IndexedDB on its own, outside the settings, and is sent only to Google.

This partly supersedes 0003. The app may now draft chords when the player asks. It still never fetches or generates lyrics, tabs, record figures or cue text.

## Consequences

- The owner pays nothing. A player's free quota covers a few songs a day.
- A player needs a Google account and a minute to make a key, or pastes chords instead.
- A draft from the model's memory can be wrong, more often for less-known songs. It says so, and reading a chord page makes it better.
- The key sits in the browser's storage for the app's address. All of the owner's GitHub Pages sites share the `brijrajpatil.github.io` address, so any of them could read it. Only the owner publishes there.
- Model names and free limits change. The models are one list in the code, and the app falls back from 3.8 Flash to 3.5 Flash-Lite when the free quota runs out.
- The repo still holds no fetched content. The tests use made-up words and public domain chords.
